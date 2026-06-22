"""
LIFEFORGE — Word-Level Neural Language Model (Bengio 2003)
===========================================================
Feedforward NPLM with configurable context window.
Key design:
  W=2 context window → many branching paths → genuine variety at generation
  Early-stop at loss ~1.4 → learned word patterns, not memorized sentences
  Temperature 1.1 → creative but coherent recombinations
"""

import numpy as np, json, re

PAD, START, END, UNK = "<PAD>", "<START>", "<END>", "<UNK>"

def tokenize(text):
    return re.findall(r"[A-Za-z']+|[.,!?;]", text.lower())

def build_vocab_from_sentences(sentences):
    freq = {}
    for s in sentences:
        for t in tokenize(s): freq[t] = freq.get(t,0)+1
    words = sorted(freq.keys())
    specials = [PAD, START, END, UNK]
    all_w = specials + words
    w2i = {w:i for i,w in enumerate(all_w)}
    i2w = {i:w for i,w in enumerate(all_w)}
    return all_w, w2i, i2w

def sentence_to_ids(s, w2i):
    return [w2i.get(t, w2i[UNK]) for t in [START]+tokenize(s)+[END]]

def make_ngram_dataset(sentences, w2i, window=2, step=1):
    """step=1 uses every word position; step=2 skips every other (halves dataset)."""
    pad = w2i[PAD]; Xs,Ys=[],[]
    for s in sentences:
        ids = sentence_to_ids(s, w2i)
        padded = [pad]*window + ids
        for i in range(0, len(ids), step):
            Xs.append(padded[i:i+window]); Ys.append(ids[i])
    return np.array(Xs,dtype=np.int32), np.array(Ys,dtype=np.int32)

class Adam:
    def __init__(self,lr=4e-3):
        self.lr=lr;self.b1=0.9;self.b2=0.999;self.eps=1e-8;self.t=0
        self.m={};self.v={}
    def step(self,pg):
        self.t+=1; bc1=1-self.b1**self.t; bc2=1-self.b2**self.t
        for k,(p,g) in enumerate(pg):
            if k not in self.m: self.m[k]=np.zeros_like(p);self.v[k]=np.zeros_like(p)
            self.m[k]=self.b1*self.m[k]+(1-self.b1)*g
            self.v[k]=self.b2*self.v[k]+(1-self.b2)*g*g
            p -= self.lr*(self.m[k]/bc1)/(np.sqrt(self.v[k]/bc2)+self.eps)

class LSTMModel:
    """Word-level feedforward neural LM. W=2 window, 1187-word vocab."""
    def __init__(self, vocab_size, hidden_size=256, window=3, emb_dim=48):
        self.V=vocab_size; self.H=hidden_size; self.W=window; self.E=emb_dim
        rng=np.random.RandomState(42); s=lambda fi: np.sqrt(2.0/fi)
        inp = window*emb_dim
        self.embed = rng.randn(vocab_size, emb_dim).astype(np.float32)*0.05
        self.W1 = rng.randn(512, inp).astype(np.float32)*s(inp)
        self.b1 = np.zeros(512, dtype=np.float32)
        self.W2 = rng.randn(256, 512).astype(np.float32)*s(512)
        self.b2 = np.zeros(256, dtype=np.float32)
        self.Wy = rng.randn(vocab_size, 256).astype(np.float32)*s(256)
        self.by = np.zeros(vocab_size, dtype=np.float32)
        self.opt=Adam(lr=4e-3); self.train_losses=[]; self.trainingEpochs=0
        self.w2i=None; self.i2w=None

    def _forward(self,X):
        B=len(X)
        e=self.embed[X].reshape(B,-1)
        z1=e@self.W1.T+self.b1; a1=np.maximum(0,z1)
        z2=a1@self.W2.T+self.b2; a2=np.maximum(0,z2)
        logits=a2@self.Wy.T+self.by
        logits-=logits.max(1,keepdims=True)
        ex=np.exp(logits); probs=ex/(ex.sum(1,keepdims=True)+1e-9)
        return probs,(X,e,z1,a1,z2,a2)

    def train_batch(self,X,Y):
        B=len(X)
        probs,(_,e,z1,a1,z2,a2)=self._forward(X)
        loss=-np.log(probs[np.arange(B),Y]+1e-9).mean()
        dp=probs.copy(); dp[np.arange(B),Y]-=1.0; dp/=B
        dWy=dp.T@a2; dby=dp.sum(0)
        da2=dp@self.Wy; dz2=da2*(z2>0)
        dW2=dz2.T@a1; db2=dz2.sum(0)
        da1=dz2@self.W2; dz1=da1*(z1>0)
        dW1=dz1.T@e; db1=dz1.sum(0)
        de=(dz1@self.W1).reshape(B,self.W,self.E)
        gs=[dW1,db1,dW2,db2,dWy,dby]
        n=np.sqrt(sum((g**2).sum() for g in gs))
        if n>5: gs=[g*(5/n) for g in gs]
        dW1,db1,dW2,db2,dWy,dby=gs
        d_emb=np.zeros_like(self.embed); np.add.at(d_emb,X,de)
        self.opt.step([(self.embed,d_emb),(self.W1,dW1),(self.b1,db1),
                       (self.W2,dW2),(self.b2,db2),(self.Wy,dWy),(self.by,dby)])
        return float(loss)

    def generate(self, seed_str, w2i, i2w, max_words=22, temperature=1.1, **_):
        pad=w2i.get(PAD,0); end=w2i.get(END,2)
        tokens=[START]+tokenize(seed_str)
        ids=[w2i.get(t,w2i[UNK]) for t in tokens]
        result=list(tokens[1:])
        for _ in range(max_words):
            ctx=ids[-self.W:] if len(ids)>=self.W else [pad]*(self.W-len(ids))+ids
            probs,_=self._forward(np.array([ctx],dtype=np.int32))
            p=probs[0]**( 1.0/temperature); p[pad]=0; p/=p.sum()
            nid=np.random.choice(self.V,p=p)
            if nid==end: break
            word=i2w.get(nid,UNK)
            if word in (PAD,START,UNK): continue
            ids.append(nid); result.append(word)
        sent=_detokenize(result)
        if not sent.endswith('.'): sent=sent.rstrip('.,!?')+'.'
        return sent[0].upper()+sent[1:]

    def serialize(self):
        return {"V":self.V,"H":self.H,"W":self.W,"E":self.E,
                "embed":self.embed.tolist(),"W1":self.W1.tolist(),"b1":self.b1.tolist(),
                "W2":self.W2.tolist(),"b2":self.b2.tolist(),
                "Wy":self.Wy.tolist(),"by":self.by.tolist(),
                "train_losses":self.train_losses,"trainingEpochs":self.trainingEpochs}

    def load(self,d):
        self.W=d.get("W",2); self.E=d.get("E",48)
        self.embed=np.array(d["embed"],dtype=np.float32)
        self.W1=np.array(d["W1"],dtype=np.float32); self.b1=np.array(d["b1"],dtype=np.float32)
        self.W2=np.array(d["W2"],dtype=np.float32); self.b2=np.array(d["b2"],dtype=np.float32)
        self.Wy=np.array(d["Wy"],dtype=np.float32); self.by=np.array(d["by"],dtype=np.float32)
        self.train_losses=d.get("train_losses",[]); self.trainingEpochs=d.get("trainingEpochs",0)


def _detokenize(tokens):
    out=[]
    for t in tokens:
        if t in('.','!','?',',',';') and out: out[-1]+=t
        else: out.append(t)
    return ' '.join(out)


def build_vocab(text):
    chars=sorted(set(text)); c2i={c:i for i,c in enumerate(chars)}
    return chars,c2i,{i:c for i,c in enumerate(chars)}

def make_sequences(text,c2i,seq_len=20,step=20):
    enc=np.array([c2i.get(c,0) for c in text],dtype=np.int32)
    N=(len(enc)-seq_len-1)//step
    X=np.zeros((N,seq_len),dtype=np.int32); Y=np.zeros((N,seq_len),dtype=np.int32)
    for i in range(N):
        s=i*step; X[i]=enc[s:s+seq_len]; Y[i]=enc[s+1:s+seq_len+1]
    return X,Y

def train(model, X, Y, epochs, lr_schedule, batch_size=256, on_progress=None):
    N=len(X); best_loss=float('inf'); best_state=None; no_imp=0
    def get_lr(ep):
        lr=lr_schedule[0][1]
        for t,l in lr_schedule:
            if ep>=t: lr=l
        return lr
    for epoch in range(1,epochs+1):
        model.opt.lr=get_lr(epoch)
        perm=np.random.permutation(N); Xs,Ys=X[perm],Y[perm]
        el=0.0; nb=0
        for i in range(0,N-batch_size+1,batch_size):
            el+=model.train_batch(Xs[i:i+batch_size],Ys[i:i+batch_size]); nb+=1
        avg=el/max(nb,1)
        model.train_losses.append(round(float(avg),5)); model.trainingEpochs=epoch
        if avg<best_loss-1e-4: best_loss=avg; best_state=model.serialize(); no_imp=0
        else: no_imp+=1
        early=(avg<1.35)
        if on_progress: on_progress(epoch,epochs,avg,model.opt.lr,early_stop=early)
        if early or no_imp>=25: break
    if best_state: model.load(best_state)
    return best_loss
