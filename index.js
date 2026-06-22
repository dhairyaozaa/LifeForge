#!/usr/bin/env node
/**
 * ██╗     ██╗███████╗███████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
 * ██║     ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
 * ██║     ██║█████╗  █████╗  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
 * ██║     ██║██╔══╝  ██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
 * ███████╗██║██║     ███████╗██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
 * ╚══════╝╚═╝╚═╝     ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
 *
 * AI-Powered Life Simulator
 * Model trains ONCE on first run, then reuses saved weights forever.
 * No API. No cloud. Pure Python + NumPy + Node.js.
 */

'use strict';
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const chalk    = require('chalk');

const { UI, C }                    = require('./src/ui');
const { GameEngine }               = require('./src/engine');
const { JOBS, COUNTRIES, CHOICES, rand } = require('./src/events');
const { SentencePool, trainModel } = require('./src/ai-bridge');
const { openCasino }               = require('./src/gambling');

const WEIGHTS_PATH = path.join(__dirname, 'model', 'weights.json');
const VOCAB_PATH   = path.join(__dirname, 'model', 'vocab.json');

const ui   = new UI();
const pool = new SentencePool();

// ── Save / Load ───────────────────────────────────────────────────────────────
const SAVES_DIR = path.join(__dirname, 'saves');
if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR);

const SAVE_FIELDS = [
  'name','gender','country','city','age','alive','deathAge','deathCause',
  'happiness','health','smarts','looks','karma','recklessness',
  'wealth','salary','job','relationship','partnerName','children',
  'parents','education','log','yearLog','hasHouse','hasCar',
  'inPrison','prisonYears','addictions',
];

function listSaves() {
  try {
    return fs.readdirSync(SAVES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(SAVES_DIR, f), 'utf8'));
          return { file: f, name: data.name, age: data.age, job: data.job || 'Unemployed',
                   wealth: data.wealth, savedAt: data.savedAt };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.savedAt||0) - (a.savedAt||0));
  } catch { return []; }
}

function saveGame(c, slot) {
  const data = {};
  SAVE_FIELDS.forEach(k => { data[k] = c[k]; });
  data.savedAt = Date.now();
  const file = path.join(SAVES_DIR, slot + '.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function loadSave(file) {
  const data = JSON.parse(fs.readFileSync(path.join(SAVES_DIR, file), 'utf8'));
  const engine = new GameEngine();
  const c = engine.newGame({ name: data.name, gender: data.gender, country: data.country });
  SAVE_FIELDS.forEach(k => { if (data[k] !== undefined) c[k] = data[k]; });
  return engine;
}

// ── CLI flags ─────────────────────────────────────────────────────────────────
// Usage:
//   npm start            — loads existing weights, trains only if none exist
//   npm start -- --retrain  — forces a fresh training run (deletes old weights)
//   npm start -- --help     — show this info
if (process.argv.includes('--help')) {
  console.log('\nLIFEFORGE — AI-Powered Life Simulator');
  console.log('  npm start            Start game (skip training if model exists)');
  console.log('  npm start -- --retrain  Force retrain the AI model from scratch');
  console.log('  npm start -- --help  Show this help\n');
  process.exit(0);
}
const FORCE_RETRAIN = process.argv.includes('--retrain');
if (FORCE_RETRAIN) {
  const fs2 = require('fs');
  [path.join(__dirname,'model','weights.json'), path.join(__dirname,'model','vocab.json')]
    .forEach(p => { try { fs2.unlinkSync(p); } catch {} });
  console.log('Deleted old weights. Will retrain from scratch.');
}

// ── Model info (populated on load or after training) ─────────────────────────
let modelInfo = { trained: false };

// ── readline helper ───────────────────────────────────────────────────────────
function ask(q) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, a => { rl.close(); res(a.trim()); });
  });
}
async function waitKey(msg = 'Press ENTER to continue...') {
  await ask(`\n  ${C.dim(msg)}`);
}

// ── Detect whether a trained model already exists ─────────────────────────────
function modelExists() {
  try {
    if (!fs.existsSync(WEIGHTS_PATH) || !fs.existsSync(VOCAB_PATH)) return false;
    const stat = fs.statSync(WEIGHTS_PATH);
    // Must be at least 1 MB (a valid trained model is ~20 MB, untrained = 0)
    return stat.size > 1024 * 1024;
  } catch { return false; }
}

// ── Load model info from saved weights (no retraining) ───────────────────────
function loadModelInfo() {
  try {
    const raw   = fs.readFileSync(WEIGHTS_PATH, 'utf8');
    const data  = JSON.parse(raw);
    modelInfo = {
      trained:    true,
      loss:       data.best_loss != null ? data.best_loss.toFixed(5) : '?',
      epochs:     data.trainingEpochs   || 100,
      params:     null,  // not stored in weights file
      vocabSize:  data.V || '?',
      corpusSize: data.corpus_size || 1815,
      samples:    {},    // not re-generated on load
    };
    pool.modelReady = true;
    // Warm up sentence pool in background
    const warmCats = [
      'growth','career_up','career_down','health_up',
      'health_down','love_up','setback','old_age',
      'family_up','youth','wisdom','neutral',
    ];
    setImmediate(() => pool.warmUp(warmCats));
    return true;
  } catch (e) {
    return false;
  }
}

// ── Training (only runs when no weights exist) ────────────────────────────────
async function doTraining() {
  ui.printTrainScreen();

  return new Promise(resolve => {
    trainModel(
      (pct, msg) => ui.trainProgress(pct, msg),
      (ok, info) => {
        console.log('\n');
        if (ok && info.best_loss != null) {
          ui.ok(`Training complete! Loss: ${info.best_loss.toFixed(5)} | Epochs: ${info.epochs_trained} | ${info.weights_kb} KB`);
          ui.ok(`Vocab: ${info.vocab_size || '?'} words | Corpus: ${info.corpus_size || '?'} sentences`);
          modelInfo = {
            trained:    true,
            loss:       info.best_loss.toFixed(5),
            epochs:     info.epochs_trained,
            params:     info.params,
            vocabSize:  info.vocab_size,
            corpusSize: info.corpus_size,
            samples:    info.samples || {},
          };
          pool.modelReady = true;
          const warmCats = [
            'growth','career_up','career_down','health_up',
            'health_down','love_up','setback','old_age',
          ];
          setImmediate(() => pool.warmUp(warmCats));
        } else {
          ui.warn('Training had issues — using fallback sentences in-game.');
          ui.warn('Make sure Python 3 and NumPy are installed.');
          modelInfo = { trained: false };
        }
        resolve();
      }
    );
  });
}

// ── AI event routing ──────────────────────────────────────────────────────────
function pickAICategory(c, predBad, predGood) {
  const stage = c.getLifeStage();
  if (c.inPrison) return 'prison';
  if (c.age < 6)  return null;           // infants: scripted events only
  if (stage === 'child') {
    const r = Math.random();
    return r < 0.4 ? 'youth' : r < 0.7 ? 'family_up' : 'growth';
  }
  if (stage === 'senior') {
    const r = Math.random();
    return r < 0.45 ? 'old_age' : r < 0.70 ? 'wisdom' : r < 0.85 ? 'regret' : 'setback';
  }
  const r = Math.random();
  if (predBad > 0.65) {
    if (c.job && r < 0.35)             return 'career_down';
    if (c.health < 40 && r < 0.50)    return 'health_down';
    if (c.wealth < 0 && r < 0.50)     return 'money_down';
    if (c.relationship && r < 0.40)   return 'love_war';
    return 'setback';
  }
  if (predGood > 0.65) {
    if (c.job && r < 0.30)             return 'career_up';
    if (c.health > 70 && r < 0.40)    return 'health_up';
    if (c.wealth > 50000 && r < 0.30) return 'money_up';
    if (c.relationship === 'married' && r < 0.30) return 'family_up';
    return 'growth';
  }
  const roll = Math.random();
  if (c.age < 20) return roll < 0.55 ? 'youth' : 'growth';
  if (roll < 0.14) return 'career_grind';
  if (roll < 0.26) return 'health_decay';
  if (roll < 0.37) return 'love_up';
  if (roll < 0.47) return 'money_grind';
  if (roll < 0.57) return 'family_up';
  if (roll < 0.67) return 'growth';
  if (roll < 0.76) return 'friendship';
  if (roll < 0.84) return 'adventure';
  if (roll < 0.91) return 'regret';
  return 'setback';
}

// Quality filter — rejects garbled AI sentences
function isCoherent(text) {
  if (!text || text.length < 20) return false;
  const t = text.trim();
  if (!/[.!?]$/.test(t)) return false;
  if (!/^[A-Z]/.test(t)) return false;
  const words = t.toLowerCase().replace(/[^a-z ']/g,' ').split(/\s+/).filter(Boolean);
  if (words.length < 5 || words.length > 38) return false;
  // No two consecutive identical long words (sign of model looping)
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i+1] && words[i].length > 3) return false;
  }
  // Unique word ratio (garbled output repeats heavily)
  if (new Set(words).size / words.length < 0.45) return false;
  // Reject if last word is a bare article or conjunction
  // (keep minimal — English legitimately ends with prepositions, pronouns, etc.)
  const neverEnd = new Set(['the','a','an','and','or','but','that','which','who','its']);
  if (neverEnd.has(words[words.length - 1])) return false;
  return true;
}

const FALLBACK = {
  career_up:    'A break at work arrived when you needed it most.',
  career_down:  'Work hit a rough patch this year.',
  career_grind: 'Another week, another set of meetings that could have been emails.',
  health_up:    'Your health improved noticeably this year.',
  health_down:  'Your body showed signs of wear.',
  health_decay: 'Something minor made itself known in a way you could not ignore.',
  love_up:      'A meaningful connection entered your life.',
  love_down:    'A relationship tested your resilience.',
  love_war:     'Words were said that lingered longer than the argument.',
  money_up:     'Finances took a positive turn this year.',
  money_down:   'Money was tight and the tightness showed.',
  money_grind:  'You tracked every dollar and the tracking was its own exhaustion.',
  family_up:    'Family brought unexpected warmth this year.',
  family_down:  'A family difficulty required more than you had to give.',
  growth:       'A quiet insight shifted something that had been fixed.',
  setback:      'A setback reminded you that nothing is guaranteed.',
  old_age:      'The years settled differently on you now.',
  youth:        'Youth made everything feel enormous and immediate.',
  wisdom:       'Experience arrived as clarity you had not paid for with time.',
  prison:       'The cell walls had become familiar in a way you had not wanted.',
  neutral:      'The year passed with its usual mix of small things.',
};

const CAT_EFFECTS = {
  career_up:    { wealth:  8000, happiness:  12 },
  career_down:  { wealth: -6000, happiness: -12 },
  career_grind: { wealth:  1500, happiness:  -4 },
  health_up:    { health:    8,  happiness:   8 },
  health_down:  { health:   -7,  happiness:  -8 },
  health_decay: { health:   -4 },
  love_up:      { happiness: 14 },
  love_down:    { happiness:-12 },
  love_war:     { happiness: -9, karma: -5 },
  money_up:     { wealth: 12000, happiness:  10 },
  money_down:   { wealth: -7000, happiness: -10 },
  money_grind:  { wealth:  1000 },
  family_up:    { happiness: 12, karma: 8 },
  family_down:  { happiness:-10 },
  growth:       { happiness:  8, smarts: 4, karma: 5 },
  setback:      { happiness: -9 },
  old_age:      { health:   -4, happiness:  4 },
  youth:        { happiness:  8 },
  wisdom:       { smarts:    5, karma: 5, happiness: 5 },
  prison:       { happiness: -8, karma: 3, health: -3 },
  neutral:      {},
};

function getAISentence(cat) {
  const txt = pool.get(cat);
  return txt || FALLBACK[cat] || 'Life continued on its unpredictable course.';
}

// ── Age-up handler ────────────────────────────────────────────────────────────
async function handleAgeUp(engine) {
  const c      = engine.character;
  const events = engine.ageUp();
  const W      = Math.min(process.stdout.columns || 80, 82);

  console.log();
  console.log(C.primary('═'.repeat(W)));
  console.log(`  ${C.gold.bold('⏰  AGE ' + c.age)}`);
  console.log(C.primary('═'.repeat(W)));
  console.log();

  for (const ev of events) {
    if (ev.type === 'choice_queued') {
      const cd = CHOICES[ev.event.choiceKey];
      if (!cd) continue;
      console.log();
      console.log(`  ${C.secondary.bold('⚡  CHOICE: ' + ev.event.text)}`);
      console.log(`  ${C.dim(cd.prompt)}`);
      console.log();
      cd.options.forEach((o, i) =>
        console.log(`  ${chalk.cyan('[' + (i+1) + ']')} ${C.white(o.text)}`)
      );
      console.log();
      const ans = await ask(`  ${chalk.cyan('▸ Your choice: ')}`);
      const idx = parseInt(ans) - 1;
      const res = engine.resolveChoice(ev.event, idx);
      if (res) {
        console.log(`\n  ${C.secondary('→')} ${C.white(res.outcomeText)}`);
        _printEffectLine(res.effect);
      }
      console.log();
    } else {
      ui.printEvent(ev);
    }
  }

  // AI-generated event — once per year (null = skip for young children)
  if (!engine.gameOver && c.alive) {
    const predGood = (c.happiness + c.health + c.karma) / 300;
    const predBad  = (c.recklessness + (100 - c.health) + (100 - c.karma)) / 300;
    const cat      = pickAICategory(c, predBad, predGood);
    if (cat) {
      const aiText   = getAISentence(cat);
      const aiEffect = CAT_EFFECTS[cat] || {};
      if (aiText && isCoherent(aiText)) {
        c.applyEffect(aiEffect);
        c.addLog(aiText, '✦');
        ui.printEvent({
          type:   'ai_event',
          text:   aiText,
          effect: Object.keys(aiEffect).length ? aiEffect : null,
        });
      }
    }
  }

  if (engine.gameOver) {
    const death = events.find(e => e.type === 'death');
    if (death) {
      console.log();
      console.log(`  ${C.danger.bold(death.text)}`);
      await waitKey();
      ui.deathScreen(engine.generateDeathReport());
      return false;
    }
  }
  return true;
}

function _printEffectLine(effect) {
  if (!effect) return;
  const parts = [];
  if (effect.happiness) parts.push((effect.happiness > 0 ? C.success : C.danger)(`happiness ${effect.happiness > 0 ? '+' : ''}${effect.happiness}`));
  if (effect.health)    parts.push((effect.health > 0 ? C.success : C.danger)(`health ${effect.health > 0 ? '+' : ''}${effect.health}`));
  if (effect.wealth)    parts.push((effect.wealth > 0 ? C.gold : C.danger)(`$${effect.wealth > 0 ? '+' : ''}${effect.wealth.toLocaleString()}`));
  if (effect.smarts)    parts.push(C.info(`smarts ${effect.smarts > 0 ? '+' : ''}${effect.smarts}`));
  if (effect.karma)     parts.push(C.purple(`karma ${effect.karma > 0 ? '+' : ''}${effect.karma}`));
  if (parts.length)     console.log(`     ${parts.join(' | ')}`);
}

// ── Sub-menus ─────────────────────────────────────────────────────────────────
async function handleActivities(engine) {
  C.clear(); ui.printChar(engine.character); ui.printActivities();
  console.log();
  const map = {
    '1':'meditate','2':'exercise','3':'study','4':'party',
    '5':'work_harder','6':'volunteer','7':'casino','8':'crime',
    '9':'travel','0':'diet',
  };
  const ch = await ask(`  ${chalk.cyan('▸ ')}`);
  const key = map[ch];
  if (!key) { ui.warn('Invalid choice.'); await waitKey(); return; }

  if (key === 'casino') {
    const c = engine.character;
    if (c.wealth < 100) {
      ui.err('You need at least $100 to enter the casino.');
      await waitKey(); return;
    }
    const result = await openCasino(c.wealth);
    const net    = result.netChange;
    c.wealth     = result.finalWealth;
    c.addLog(
      net >= 0
        ? `Won $${net.toLocaleString()} at the casino.`
        : `Lost $${Math.abs(net).toLocaleString()} at the casino.`,
      net >= 0 ? '🎰' : '💸'
    );
    if (net >  10000) c.happiness = Math.min(100, c.happiness + 20);
    if (net < -5000)  c.happiness = Math.max(0,   c.happiness - 15);
    if (net < -20000) c.recklessness = Math.min(100, c.recklessness + 10);
    c.clampStats();
    C.clear(); ui.printChar(c);
    if (net >= 0) ui.ok(`Casino session: ${chalk.hex('#7DFF7D')('+$' + net.toLocaleString())}`);
    else          ui.err(`Casino session: -$${Math.abs(net).toLocaleString()}`);
    await waitKey(); return;
  }

  const res = engine.doActivity(key);
  if (!res) { ui.warn('Activity failed.'); await waitKey(); return; }

  console.log();
  console.log(`  ${C.secondary.bold(res.emoji + ' ' + res.text)}`);
  _printEffectLine(res.effect);
  if (res.outcome === 'win')  ui.ok('Lucky break!');
  if (res.outcome === 'lose') ui.err("Didn't go your way.");
  if (res.prisonText)    { console.log(); console.log(`  ${C.danger.bold(res.prisonText)}`); }
  if (res.addictionText) { console.log(); console.log(`  ${C.danger(res.addictionText)}`); }
  await waitKey();
}

async function handleCareer(engine) {
  C.clear(); ui.printChar(engine.character); ui.printJobs(JOBS, engine.character);
  console.log();
  const input = await ask(`  ${chalk.cyan('▸ Job number (0 to cancel): ')}`);
  const ch = parseInt(input);
  if (!ch) return;
  const res = engine.applyForJob(ch - 1);
  if (res.success) ui.ok(`Hired as ${res.job.title}! Salary $${engine.character.salary.toLocaleString()}/yr`);
  else             ui.err(res.reason);
  await waitKey();
}

async function handleLove(engine) {
  C.clear(); ui.printChar(engine.character);
  ui.sub('RELATIONSHIPS');
  const c    = engine.character;
  const opts = [];
  if (!c.relationship)            opts.push(['1', '💕 Start dating',  'start']);
  if (c.relationship === 'dating') opts.push(['2', '💍 Propose',       'propose']);
  if (c.relationship === 'married')opts.push(['3', '👶 Have a child',  'child']);
  if (!opts.length) { ui.info('Nothing available right now.'); await waitKey(); return; }
  opts.forEach(([k, n]) => console.log(`  ${chalk.cyan('[' + k + ']')} ${C.white(n)}`));
  console.log();
  const ch  = await ask(`  ${chalk.cyan('▸ ')}`);
  const sel = opts.find(o => o[0] === ch);
  if (!sel) return;
  let r;
  if (sel[2] === 'start')   r = engine.startDating();
  if (sel[2] === 'propose') r = engine.propose();
  if (sel[2] === 'child')   r = engine.haveChild();
  if (r) {
    if (r.success) ui.ok(r.childName ? `It's ${r.childName}!` : r.partnerName ? `Now dating ${r.partnerName}!` : 'It worked!');
    else           ui.err(r.reason);
  }
  await waitKey();
}

async function handleSave(engine) {
  C.clear(); ui.printChar(engine.character);
  ui.sub('SAVE LIFE');
  const saves = listSaves();
  console.log();
  if (saves.length) {
    console.log(`  ${C.muted('Existing saves:')}`);
    saves.forEach((s, i) =>
      console.log(`  ${C.dim((i+1)+'. ')}${C.white(s.name)} age ${C.gold(s.age)} · ${C.muted(s.job)} · $${(s.wealth||0).toLocaleString()}`)
    );
    console.log();
  }
  const raw = await ask(`  ${chalk.cyan('▸ Save slot name (Enter for "autosave"): ')}`);
  const slot = (raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'autosave');
  try {
    const file = saveGame(engine.character, slot);
    ui.ok(`Saved as "${slot}" ✓`);
    console.log(`  ${C.dim(file)}`);
  } catch(e) {
    ui.err('Save failed: ' + e.message);
  }
  await waitKey();
}

async function handleLoad() {
  C.clear();
  ui.header('LOAD LIFE');
  const saves = listSaves();
  if (!saves.length) {
    ui.warn('No save files found. Start a new life first.');
    await waitKey(); return null;
  }
  console.log();
  saves.forEach((s, i) => {
    const dt = s.savedAt ? new Date(s.savedAt).toLocaleString() : '?';
    console.log(`  ${chalk.cyan('[' + (i+1) + ']')} ${C.white.bold(s.name)} ${C.dim('— Age')} ${C.gold(s.age)} ${C.dim('·')} ${C.white(s.job)} ${C.dim('·')} ${C.gold('$'+(s.wealth||0).toLocaleString())}`);
    console.log(`      ${C.dim('Saved: ' + dt)}`);
    console.log();
  });
  console.log(`  ${chalk.cyan('[0]')} ${C.dim('Cancel')}`);
  console.log();
  const ch = await ask(`  ${chalk.cyan('▸ ')}`);
  const idx = parseInt(ch) - 1;
  if (isNaN(idx) || idx < 0 || idx >= saves.length) return null;
  try {
    const engine = loadSave(saves[idx].file);
    C.clear();
    ui.printChar(engine.character);
    ui.ok(`Welcome back, ${C.white.bold(engine.character.name)}! Age ${engine.character.age}.`);
    await waitKey('Press ENTER to continue your life...');
    return engine;
  } catch(e) {
    ui.err('Load failed: ' + e.message);
    await waitKey(); return null;
  }
}

async function handleAssets(engine) {
  C.clear(); ui.printChar(engine.character);
  ui.sub('ASSETS');
  const c    = engine.character;
  console.log(`  ${C.dim('Current wealth:')} ${C.gold('$' + c.wealth.toLocaleString())}`);
  console.log();
  const opts = [];
  if (!c.hasHouse) opts.push(['1', '🏠 Buy a House', 'house']);
  if (!c.hasCar)   opts.push(['2', '🚗 Buy a Car',   'car']);
  if (!opts.length) { ui.info('You already own everything!'); await waitKey(); return; }
  opts.forEach(([k, n]) => console.log(`  ${chalk.cyan('[' + k + ']')} ${C.white(n)}`));
  console.log();
  const ch  = await ask(`  ${chalk.cyan('▸ ')}`);
  const sel = opts.find(o => o[0] === ch);
  if (!sel) return;
  const r = sel[2] === 'house' ? engine.buyHouse() : engine.buyCar();
  if (r) {
    if (r.success) ui.ok(`Purchased! Paid $${r.price?.toLocaleString() || '?'}`);
    else           ui.err(r.reason);
  }
  await waitKey();
}

async function handleEducation(engine) {
  C.clear(); ui.printChar(engine.character);
  ui.sub('EDUCATION');
  const r = engine.enrollCollege();
  if (r.success) ui.ok('Graduated college! +15 smarts.');
  else           ui.err(r.reason);
  await waitKey();
}

async function handleLog(engine) {
  C.clear(); ui.printChar(engine.character);
  ui.printLog(engine.character);
  await waitKey();
}

async function handleAIInfo() {
  C.clear();
  ui.header('AI MODEL INFO');
  ui.printAIInfo(modelInfo);
  await waitKey();
}

// ── Main menu ─────────────────────────────────────────────────────────────────
function printJailMenu(c) {
  const W = Math.min(process.stdout.columns || 80, 82);
  console.log();
  console.log('  ' + C.danger('█'.repeat(W - 4)));
  console.log('  ' + C.danger('█') + C.danger.bold(' PRISON'.padEnd(W - 6)) + '  ' + C.danger('█'));
  console.log(`  ${C.danger('█')} ${C.white.bold(('  You have ' + c.prisonYears + ' year' + (c.prisonYears===1?'':'s') + ' remaining.').padEnd(W-6))}  ${C.danger('█')}`);
  console.log('  ' + C.danger('█'.repeat(W - 4)));
  console.log();
  console.log(`  ${chalk.cyan('[A]')} ${C.white('Serve Time'.padEnd(22))} ${C.dim('Let another year pass behind bars')}`);
  console.log(`  ${chalk.cyan('[B]')} ${C.white('Exercise'.padEnd(22))} ${C.dim('Stay fit inside')}`);
  console.log(`  ${chalk.cyan('[C]')} ${C.white('Study'.padEnd(22))} ${C.dim('Use the prison library')}`);
  console.log(`  ${chalk.cyan('[D]')} ${C.white('Meditate'.padEnd(22))} ${C.dim('Keep your mind clear')}`);
  console.log(`  ${chalk.cyan('[E]')} ${C.white('Write Letters'.padEnd(22))} ${C.dim('Keep in touch with the outside world')}`);
  console.log(`  ${chalk.cyan('[F]')} ${C.white('Plan Escape'.padEnd(22))} ${C.dim('High risk, high reward...')}`);
  console.log(`  ${chalk.cyan('[G]')} ${C.white('Life Log'.padEnd(22))} ${C.dim('Reflect on your choices')}`);
  console.log(`  ${chalk.cyan('[Q]')} ${C.dim('Quit')}`);
  console.log();
}

function printMenu(c) {
  if (c.inPrison) { printJailMenu(c); return; }
  console.log();
  ui.sub('WHAT WILL YOU DO?');
  const opts = [
    ['A', 'Age Up',       'Let a year pass — AI shapes your fate'],
    ['B', 'Activities',   'Meditate · Exercise · Study · Casino · Crime'],
    ['C', 'Career',       'Apply for jobs · Climb the ladder'],
    ['D', 'Love',         'Date · Propose · Have children'],
    ['E', 'Assets',       'Buy property and vehicles'],
    ['F', 'Education',    'Enroll in college'],
    ['G', 'Life Log',     'Review your story'],
    ['S', 'Save Life',    'Write your progress to a save file'],
    ['L', 'Load Life',    'Resume a previous life'],
    ['H', 'AI Info',      'Model stats & generated samples'],
    ['Q', 'Quit',         ''],
  ];
  const icons = ['⏰','🎯','💼','💕','🏠','🎓','📖','💾','📂','🤖','❌'];
  opts.forEach(([k, n, d], i) =>
    console.log(`  ${chalk.cyan('[' + k + ']')} ${C.white((icons[i]+' '+n).padEnd(24))} ${C.dim(d)}`)
  );
  console.log();
}

// ── Prison activity handler ──────────────────────────────────────────────────
async function handleJailAction(ch, engine) {
  const c = engine.character;
  switch (ch) {
    case 'a': {                   // Serve Time = Age Up inside prison
      const alive = await handleAgeUp(engine);
      if (!alive) return false;
      await waitKey();
      return true;
    }
    case 'b':                     // Exercise
      c.health  = Math.min(100, c.health  + 6);
      c.looks   = Math.min(100, c.looks   + 2);
      c.addLog('You worked out in the prison yard.', '💪');
      ui.ok('Health +6, Looks +2');
      await waitKey();
      return true;
    case 'c':                     // Study
      c.smarts  = Math.min(100, c.smarts  + 5);
      c.addLog('You studied in the prison library.', '📚');
      ui.ok('Smarts +5');
      await waitKey();
      return true;
    case 'd':                     // Meditate
      c.happiness = Math.min(100, c.happiness + 8);
      c.karma     = Math.min(100, c.karma     + 3);
      c.addLog('You meditated in your cell.', '🧘');
      ui.ok('Happiness +8, Karma +3');
      await waitKey();
      return true;
    case 'e': {                   // Write Letters
      c.happiness = Math.min(100, c.happiness + 5);
      const loved = c.partnerName || c.parents.mom;
      c.addLog(`You wrote letters to ${loved}.`, '✉️');
      ui.ok(`Letters sent to ${loved}. Happiness +5`);
      await waitKey();
      return true;
    }
    case 'f': {                   // Plan Escape
      const { randInt } = require('./src/events');
      const escapeChance = (c.smarts + c.recklessness) / 200;
      if (Math.random() < escapeChance * 0.3) {
        c.inPrison = false; c.prisonYears = 0;
        c.karma -= 20; c.recklessness += 15;
        c.addLog('You escaped from prison! A fugitive now.', '🏃');
        console.log(); console.log(`  ${C.danger.bold('You escaped! But you are now a fugitive.')}`);
        console.log(`  ${C.danger('Karma -20. The law will always be watching.')}`);
      } else {
        const extra = randInt(1, 2);
        c.prisonYears += extra;
        c.happiness -= 15; c.karma -= 5;
        c.addLog(`Escape attempt failed. ${extra} extra year(s) added.`, '🚨');
        console.log(); console.log(`  ${C.danger.bold('Caught! ' + extra + ' year(s) added to your sentence.')}`);
      }
      await waitKey();
      return true;
    }
    case 'g':
      C.clear(); ui.printChar(c); ui.printLog(c); await waitKey();
      return true;
    case 'q':
      console.log('\n  ' + C.secondary('Thanks for playing LIFEFORGE. 👋') + '\n');
      process.exit(0);
    default:
      ui.warn('Invalid option.'); await new Promise(r => setTimeout(r, 500));
      return true;
  }
}

// ── Game loop ─────────────────────────────────────────────────────────────────
async function gameLoop(engine) {
  while (!engine.gameOver) {
    C.clear();
    ui.printChar(engine.character);
    printMenu(engine.character);

    const ch = (await ask(`  ${chalk.cyan('▸ ')}`)).toLowerCase();

    // Prison intercept — restricted menu
    if (engine.character.inPrison) {
      const cont = await handleJailAction(ch, engine);
      if (cont === false) return;
      continue;
    }

    switch (ch) {
      case 'a': {
        const alive = await handleAgeUp(engine);
        if (!alive) return;
        await waitKey();
        break;
      }
      case 'b': await handleActivities(engine); break;
      case 'c': await handleCareer(engine);     break;
      case 'd': await handleLove(engine);       break;
      case 'e': await handleAssets(engine);     break;
      case 'f': await handleEducation(engine);  break;
      case 'g': await handleLog(engine);        break;
      case 'h': await handleAIInfo();            break;
      case 's': await handleSave(engine);   break;
      case 'l': {
        const loaded = await handleLoad();
        if (loaded) { await gameLoop(loaded); return; }
        break;
      }
      case 'q':
        console.log('\n  ' + C.secondary('Thanks for playing LIFEFORGE. 👋') + '\n');
        process.exit(0);
      default:
        ui.warn('Unknown command.');
        await new Promise(r => setTimeout(r, 600));
    }
  }
}

// ── Character creation ────────────────────────────────────────────────────────
async function createCharacter(engine) {
  C.clear();
  ui.header('CHARACTER CREATION');
  console.log();
  console.log(`  ${chalk.cyan('[1]')} ${C.white('Random')}  — Let fate decide`);
  console.log(`  ${chalk.cyan('[2]')} ${C.white('Custom')}  — Choose your identity`);
  console.log();
  const choice = await ask(`  ${chalk.cyan('▸ ')}`);
  if (choice !== '2') return engine.newGame();

  console.log();
  const name = await ask(`  ${C.white('Name')} ${C.dim('(Enter for random)')}${chalk.cyan(': ')}`);
  console.log();
  console.log(`  ${C.white('Gender:')}  ${chalk.cyan('[1]')} Male   ${chalk.cyan('[2]')} Female`);
  const gs     = await ask(`  ${chalk.cyan('▸ ')}`);
  const gender = gs === '2' ? 'female' : 'male';
  console.log();
  COUNTRIES.forEach((co, i) => console.log(`  ${chalk.cyan('[' + (i+1) + ']')} ${co}`));
  const ci      = parseInt(await ask(`  ${chalk.cyan('▸ Country: ')}`)) - 1;
  const country = COUNTRIES[ci] || rand(COUNTRIES);
  return engine.newGame({ name: name || undefined, gender, country });
}

// ── Startup splash ────────────────────────────────────────────────────────────
function printSplash(alreadyTrained) {
  // Only called on fast-path (model already trained) — clear and show clean start
  C.clear();
  ui.printLogo();
  console.log();
  if (alreadyTrained) {
    console.log(`  ${C.success('✓')} ${C.white('AI model loaded')} ${C.dim('(weights.json found — skipping training)')}`);
    if (modelInfo.trained) {
      console.log(`  ${C.dim('  Loss: ' + modelInfo.loss + '  |  Epochs: ' + modelInfo.epochs + '  |  Vocab: ' + modelInfo.vocabSize + ' words  |  Corpus: ' + (modelInfo.corpusSize || 1815) + ' sentences')}`);
    }
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const alreadyTrained = modelExists();

    if (alreadyTrained) {
      // ── Fast path: load existing weights, no training ──────────────────────
      const loaded = loadModelInfo();
      printSplash(true);
      if (!loaded) {
        ui.warn('Could not read weights.json — will retrain.');
        await doTraining();
        await waitKey('Model ready! Press ENTER to begin your life...');
      } else {
        await waitKey('Press ENTER to begin your life...');
      }
    } else {
      // ── First run: train the model ─────────────────────────────────────────
      await doTraining();
      // Don't clear the training output — user can see it was successful
      await waitKey('Model trained and saved! Press ENTER to begin your life...');
    }

    // ── Start game ─────────────────────────────────────────────────────────────
    const engine = new GameEngine();
    const c      = await createCharacter(engine);

    C.clear();
    ui.printChar(c);
    console.log();
    ui.ok(`Your life begins. You are ${C.gold.bold(c.name)}, born in ${c.city}, ${c.country}.`);
    ui.info(`Parents: ${C.white(c.parents.dad)} (father) and ${C.white(c.parents.mom)} (mother).`);
    if (modelInfo.trained) {
      console.log();
      ui.info(C.purple('✦') + C.dim(' = AI-generated event from the neural model'));
    }
    await waitKey('Press ENTER to start aging...');

    await gameLoop(engine);

    // ── Play again ─────────────────────────────────────────────────────────────
    while (true) {
      const again = (await ask(`\n  ${C.white('Play again?')} ${chalk.cyan('[y/n]')} `)).toLowerCase();
      if (again !== 'y') break;
      const eng2 = new GameEngine();
      const c2   = await createCharacter(eng2);
      C.clear();
      ui.printChar(c2);
      await waitKey('Press ENTER to start...');
      await gameLoop(eng2);
    }

    console.log('\n  ' + C.secondary('Thanks for playing LIFEFORGE! 👋') + '\n');

  } catch (e) {
    if (e.code === 'ERR_USE_AFTER_CLOSE') process.exit(0);
    console.error('\n  Error:', e.message, '\n');
    if (process.env.DEBUG) console.error(e.stack);
    process.exit(1);
  }
}

main();
