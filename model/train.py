"""
LIFEFORGE — Training Script (100 epochs, no early stop)
=========================================================
Emits JSON-line progress so Node.js can parse it.
Run: python3 model/train.py
"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from corpus import CORPUS, ALL_SENTENCES
from lstm_model import LSTMModel, build_vocab_from_sentences, make_ngram_dataset

WEIGHTS = os.path.join(os.path.dirname(__file__), "weights.json")
VOCAB   = os.path.join(os.path.dirname(__file__), "vocab.json")

def emit(t, **kw):
    print(json.dumps({"type": t, **kw}), flush=True)

def main():
    t0 = time.time()

    # ── Corpus ────────────────────────────────────────────────────
    emit("status", pct=2, msg=f"Loading corpus ({len(ALL_SENTENCES):,} sentences, 23 categories)...")
    sentences = ALL_SENTENCES
    emit("status", pct=5,
         msg=f"Corpus: {len(sentences):,} hand-authored sentences | {sum(len(s) for s in sentences):,} characters")

    # ── Vocabulary ────────────────────────────────────────────────
    emit("status", pct=8, msg="Building word vocabulary...")
    all_words, w2i, i2w = build_vocab_from_sentences(sentences)
    V = len(all_words)
    emit("status", pct=11, msg=f"Vocabulary: {V:,} unique tokens")
    with open(VOCAB, "w") as f:
        json.dump({"words": all_words, "w2i": w2i,
                   "i2w": {str(k): v for k, v in i2w.items()}}, f)

    # ── Dataset ────────────────────────────────────────────────────
    emit("status", pct=13, msg="Building bigram context pairs (W=2)...")
    X, Y = make_ngram_dataset(sentences, w2i, window=3, step=2)
    emit("status", pct=17, msg=f"Dataset: {len(X):,} (context → next-word) training pairs")

    # ── Model ──────────────────────────────────────────────────────
    emit("status", pct=19, msg="Initializing Neural Language Model (H=256)...")
    model = LSTMModel(V, hidden_size=256, window=3, emb_dim=48)
    params = V*48 + 2*48*(4*256) + 256 + (4*256*256) + 256 + 256*V + V
    emit("status", pct=21,
         msg=f"Architecture: embed({V}×48) → FC(512,ReLU) → FC(256,ReLU) → softmax({V})",
         params=params, vocab_size=V)

    # ── Training: exactly 100 epochs, cosine LR ────────────────────
    MAX_EPOCHS = 100
    BATCH_SIZE = 512
    LR_INIT    = 5e-3
    LR_FINAL   = 5e-5
    N          = len(X)

    emit("status", pct=22,
         msg=f"Training: {MAX_EPOCHS} epochs | batch={BATCH_SIZE} | LR {LR_INIT}→{LR_FINAL} cosine decay")

    best_loss  = float('inf')
    best_state = None

    for epoch in range(1, MAX_EPOCHS + 1):
        # Cosine annealing: smooth decay from LR_INIT to LR_FINAL
        cos_val = 0.5 * (1 + np.cos(np.pi * (epoch - 1) / (MAX_EPOCHS - 1)))
        lr = LR_FINAL + (LR_INIT - LR_FINAL) * cos_val
        model.opt.lr = lr

        # Shuffle + train
        perm = np.random.permutation(N)
        Xs, Ys = X[perm], Y[perm]
        el = 0.0; nb = 0
        for i in range(0, N - BATCH_SIZE + 1, BATCH_SIZE):
            el += model.train_batch(Xs[i:i+BATCH_SIZE], Ys[i:i+BATCH_SIZE])
            nb += 1
        avg = el / max(nb, 1)

        model.train_losses.append(round(float(avg), 5))
        model.trainingEpochs = epoch

        if avg < best_loss:
            best_loss  = avg
            best_state = model.serialize()

        elapsed = time.time() - t0
        eta     = (elapsed / epoch) * (MAX_EPOCHS - epoch)
        pct     = 22 + int((epoch / MAX_EPOCHS) * 74)

        emit("epoch",
             epoch=epoch, total=MAX_EPOCHS,
             loss=round(float(avg), 5),
             lr=round(float(lr), 6),
             pct=min(96, pct),
             elapsed=round(elapsed, 1),
             eta=round(eta, 1))

    # Restore best checkpoint
    if best_state:
        model.load(best_state)

    # ── Sample outputs ─────────────────────────────────────────────
    emit("status", pct=97, msg="Generating sample outputs (2 variants per category)...")
    seeds = {
        "CAREER_RISE":  "You landed", "CAREER_FALL": "The company announced",
        "HEALTH_DECAY": "A pain you",  "LOVE_FOUND":  "You met",
        "WEALTH_CRASH": "The market",  "GROWTH":      "You made a decision",
        "OLD_AGE":      "You sat with","SETBACK":     "A rejection arrived",
        "FAMILY_JOY":   "Your child",  "CRISIS":      "Everything collapsed",
        "FRIENDSHIP":   "A friend showed", "ADVENTURE": "You arrived",
        "REGRET":       "You understood", "LUCK":       "You were in the right",
    }
    samples = {}
    for cat, seed in seeds.items():
        try:
            np.random.seed(42); s1 = model.generate(seed, w2i, i2w, temperature=1.05)
            np.random.seed(99); s2 = model.generate(seed, w2i, i2w, temperature=1.15)
            samples[cat] = [s1, s2]
        except Exception as e:
            samples[cat] = [f"(error: {e})", ""]

    # ── Save ───────────────────────────────────────────────────────
    emit("status", pct=98, msg="Saving model weights...")
    state = model.serialize()
    state["best_loss"]   = float(best_loss)
    state["corpus_size"] = len(sentences)
    with open(WEIGHTS, "w") as f:
        json.dump(state, f)
    kb = os.path.getsize(WEIGHTS) // 1024

    emit("done", pct=100,
         msg=f"Training complete! Best loss: {best_loss:.5f}",
         best_loss=float(best_loss),
         epochs_trained=MAX_EPOCHS,
         params=params,
         vocab_size=V,
         corpus_size=len(sentences),
         weights_kb=kb,
         elapsed=round(time.time() - t0, 1),
         samples=samples)

if __name__ == "__main__":
    main()
