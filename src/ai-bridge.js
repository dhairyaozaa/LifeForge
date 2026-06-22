/**
 * LIFEFORGE — AI Bridge
 * Spawns Python model/generate.py as a child process.
 * Caches a pool of pre-generated sentences per category for instant in-game use.
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');

const PYTHON = process.platform === 'win32' ? 'python' : 'python3';
const GEN_SCRIPT = path.join(__dirname, '..', 'model', 'generate.py');
const TRAIN_SCRIPT = path.join(__dirname, '..', 'model', 'train.py');
const WEIGHTS = path.join(__dirname, '..', 'model', 'weights.json');
const VOCAB = path.join(__dirname, '..', 'model', 'vocab.json');

// ── Category → event type mappings for game engine ──────────────────────────
const EVENT_CAT_MAP = {
  prison:       'PRISON',
  career_up:    'CAREER_RISE',
  career_down:  'CAREER_FALL',
  career_grind: 'CAREER_GRIND',
  health_up:    'HEALTH_BLOOM',
  health_down:  'HEALTH_DECAY',
  health_decay: 'HEALTH_DECAY',
  health_crisis:'HEALTH_CRISIS',
  love_up:      'LOVE_FOUND',
  love_down:    'LOVE_LOST',
  love_war:     'LOVE_WAR',
  money_up:     'WEALTH_SURGE',
  money_down:   'WEALTH_CRASH',
  money_grind:  'WEALTH_GRIND',
  family_up:    'FAMILY_JOY',
  family_down:  'FAMILY_STORM',
  growth:       'GROWTH',
  setback:      'SETBACK',
  youth:        'YOUTH',
  old_age:      'OLD_AGE',
  wisdom:       'GROWTH',
  regret:       'REGRET',
  friendship:   'FRIENDSHIP',
  adventure:    'ADVENTURE',
  luck:         'LUCK',
  crisis:       'CRISIS',
  good:         'CAREER_RISE',
  bad:          'SETBACK',
  neutral:      'GROWTH',
};

// ── Pre-generated sentence pool ───────────────────────────────────────────
// We generate in batches ahead of time so in-game events are instant.

class SentencePool {
  constructor() {
    this.pool = {};          // category → string[]
    this.corpus = {};        // category → string[] from corpus_sentences.json
    this.minSize = 8;
    this.modelReady = false;
    this._loadCorpus();
  }

  _loadCorpus() {
    const cPath = path.join(__dirname, '..', 'model', 'corpus_sentences.json');
    try {
      const data = require('fs').readFileSync(cPath, 'utf8');
      this.corpus = JSON.parse(data);
    } catch { this.corpus = {}; }
  }

  // Pick a random hand-written corpus sentence for a category
  _corpusSentence(category) {
    // Map game category → corpus key
    const mapped = EVENT_CAT_MAP[category] || category;
    // Build list of keys to try in order
    const tries = [
      mapped,
      mapped.toUpperCase(),
      category.toUpperCase(),
      category,
    ];
    for (const key of tries) {
      if (this.corpus[key] && this.corpus[key].length) {
        const arr = this.corpus[key];
        return arr[Math.floor(Math.random() * arr.length)];
      }
    }
    // Last resort: random from any category
    const keys = Object.keys(this.corpus);
    if (keys.length) {
      const arr = this.corpus[keys[Math.floor(Math.random() * keys.length)]];
      return arr[Math.floor(Math.random() * arr.length)];
    }
    return null;
  }

  isModelTrained() {
    try {
      require('fs').accessSync(WEIGHTS);
      require('fs').accessSync(VOCAB);
      return true;
    } catch { return false; }
  }

  // Synchronously generate N sentences for a category via Python
  _generateSync(category, count = 6) {
    if (!this.modelReady && !this.isModelTrained()) return [];
    try {
      const req = JSON.stringify({ category, count, temperature: 0.88 });
      const result = spawnSync(PYTHON, [GEN_SCRIPT], {
        input: req, encoding: 'utf8', timeout: 15000
      });
      if (result.status !== 0) return [];
      const resp = JSON.parse(result.stdout.trim());
      return resp.ok ? resp.texts : [];
    } catch { return []; }
  }

  // Get one sentence: corpus is primary (always coherent), model supplements
  get(category) {
    const cat = EVENT_CAT_MAP[category] || category;

    // 70% of the time use corpus directly — it's always coherent and varied
    // 30% try model (only if ready and pool is stocked)
    const useModel = this.modelReady &&
                     this.pool[cat] && this.pool[cat].length > 0 &&
                     Math.random() < 0.30;

    if (useModel) {
      const s = this.pool[cat].shift();
      if (s) return s;
    }

    // Refill model pool in background for future use
    if (this.modelReady && (!this.pool[cat] || this.pool[cat].length < 3)) {
      setImmediate(() => {
        const batch = this._generateSync(cat, 6);
        if (batch.length > 0) this.pool[cat] = (this.pool[cat] || []).concat(batch);
      });
    }

    // Primary: reliable hand-written corpus sentence
    return this._corpusSentence(category);
  }

  // Warm up pool for common categories in background
  async warmUp(categories) {
    if (!this.isModelTrained()) return;
    for (const cat of categories) {
      const mapped = EVENT_CAT_MAP[cat] || cat;
      if (!this.pool[mapped] || this.pool[mapped].length < this.minSize) {
        const texts = this._generateSync(mapped, 10);
        if (texts.length > 0) this.pool[mapped] = texts;
      }
    }
    this.modelReady = true;
  }
}

// ── Training progress stream ─────────────────────────────────────────────────

function trainModel(onProgress, onDone) {
  const proc = spawn(PYTHON, [TRAIN_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '';
  let info = {};

  proc.stdout.on('data', chunk => {
    buffer += chunk.toString();
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      try {
        const d = JSON.parse(line);
        if (d.type === 'epoch') {
          onProgress && onProgress(d.pct, `Epoch ${d.epoch}/${d.total} | loss=${d.loss.toFixed(5)} | lr=${d.lr} | ETA ${d.eta}s`);
        } else if (d.type === 'status') {
          onProgress && onProgress(d.pct, d.msg);
        } else if (d.type === 'done') {
          info = d;
        }
      } catch { /* ignore non-JSON */ }
    }
  });

  proc.stderr.on('data', d => { /* suppress stderr noise */ });

  proc.on('close', code => {
    onDone && onDone(code === 0, info);
  });

  return proc;
}

module.exports = { SentencePool, trainModel, EVENT_CAT_MAP };
