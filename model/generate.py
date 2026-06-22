"""LIFEFORGE — Generation Server. Reads JSON from stdin, writes JSON to stdout."""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from lstm_model import LSTMModel

WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "weights.json")
VOCAB_PATH   = os.path.join(os.path.dirname(__file__), "vocab.json")

SEEDS = {
    "CAREER_RISE":   ["You landed","The promotion","A headhunter called","Your pitch","The project shipped"],
    "CAREER_FALL":   ["The company announced","A rival took","The startup failed","You were passed over","The contract"],
    "CAREER_GRIND":  ["Another late night","You learned a","The commute","Your job title","You updated your"],
    "HEALTH_BLOOM":  ["The test results","Six months of","You ran further","A new doctor","You quit the"],
    "HEALTH_DECAY":  ["A pain you","The diagnosis arrived","Fatigue settled","Your body","The back injury"],
    "HEALTH_CRISIS": ["You woke up","A panic attack","Surgery was scheduled","The mental health","The overdose"],
    "LOVE_FOUND":    ["You met them","A long friendship","You were not looking","They were","The first date"],
    "LOVE_LOST":     ["The breakup","They left","A marriage that","The divorce","You understood you"],
    "LOVE_WAR":      ["The argument","Trust became","Couples therapy","You said the thing","An old message"],
    "WEALTH_SURGE":  ["An investment you","The inheritance","Your equity","A side project","A bonus"],
    "WEALTH_CRASH":  ["The market correction","A scam that","Medical expenses","A business debt","The tax bill"],
    "WEALTH_GRIND":  ["You tracked every","A raise arrived","The budget was tight","You worked a second","You said no"],
    "FAMILY_JOY":    ["Your child said","A family gathering","You watched your","You became a grandparent","A phone call"],
    "FAMILY_STORM":  ["A family secret","A parent's health","An inheritance split","Holiday dinners","A sibling"],
    "GROWTH":        ["You read a book","A difficult conversation","You made a decision","Forgiveness arrived","Therapy became"],
    "SETBACK":       ["A mistake you made","The plan that had","You fell short","A rejection arrived","Something you had"],
    "YOUTH":         ["You stayed out","A teacher said","Your first paycheck","A heartbreak at","You were accepted"],
    "OLD_AGE":       ["You sat with","Memory began","A grandchild asked","You released an","The body required"],
    "PRISON":        ["The cell was smaller", "You counted the ceiling", "Time in prison", "The prison library", "A cellmate told you"],
    "good":          ["Something remarkable happened","A stroke of luck","The day surprised you","Fortune smiled","You received"],
    "bad":           ["Misfortune arrived","Something went wrong","The day turned difficult","Bad news came","An unfortunate"],
    "neutral":       ["The year passed quietly","Life continued its","Another year went","Things moved along","Time passed"],
}

_model = _w2i = _i2w = None

def load_model():
    global _model, _w2i, _i2w
    if _model: return True
    if not os.path.exists(WEIGHTS_PATH) or not os.path.exists(VOCAB_PATH):
        return False
    try:
        with open(VOCAB_PATH) as f: vd = json.load(f)
        _w2i = vd["w2i"]
        _i2w = {int(k): v for k,v in vd["i2w"].items()}
        with open(WEIGHTS_PATH) as f: wd = json.load(f)
        _model = LSTMModel(wd["V"], hidden_size=wd["H"])
        _model.load(wd)
        return True
    except Exception as e:
        sys.stderr.write(f"Load error: {e}\n"); return False

def handle(req):
    if not load_model():
        return {"ok": False, "error": "Model not trained yet. Run: python3 model/train.py"}
    cat   = req.get("category", "neutral")
    seed  = req.get("seed") or np.random.choice(SEEDS.get(cat, SEEDS["neutral"]))
    temp  = float(req.get("temperature", 1.05))
    count = int(req.get("count", 1))
    texts = []; seen = set(); attempts = 0
    while len(texts) < count and attempts < count*6:
        attempts += 1
        try:
            t = temp + len(texts)*0.05
            s = _model.generate(seed, _w2i, _i2w, max_words=22, temperature=min(1.05,t))
            if s[:25] not in seen and len(s) > 20:
                seen.add(s[:25]); texts.append(s)
                seed = np.random.choice(SEEDS.get(cat, SEEDS["neutral"]))
        except: texts.append("Something unexpected happened today."); break
    return {"ok": True, "texts": texts, "category": cat}

if __name__ == "__main__":
    raw = sys.stdin.read().strip()
    if not raw: print(json.dumps({"ok":False,"error":"No input"})); sys.exit()
    try: req = json.loads(raw)
    except: print(json.dumps({"ok":False,"error":"Bad JSON"})); sys.exit()
    print(json.dumps(handle(req)))
