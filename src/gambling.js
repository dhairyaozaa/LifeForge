'use strict';
/**
 * LIFEFORGE CASINO
 * ─────────────────────────────────────────────────────
 * Three fully playable terminal mini-games:
 *   🎡  ROULETTE   — spin the wheel, bet on numbers/colors/ranges
 *   🃏  BLACKJACK  — hit/stand/double-down vs dealer
 *   ♠️  POKER       — 5-card draw with hand evaluation
 *
 * All games feature:
 *   • ASCII animations (wheel spin, card flip, chip stack)
 *   • Live info boxes showing bet / balance / status
 *   • Color-coded suit rendering
 */

const chalk  = require('chalk');
const readline = require('readline');

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const A = {
  up:    (n=1) => `\x1b[${n}A`,
  down:  (n=1) => `\x1b[${n}B`,
  col:   (n=1) => `\x1b[${n}G`,
  clear: ()    => '\x1b[2J\x1b[H',
  eol:   ()    => '\x1b[K',
  hide:  ()    => '\x1b[?25l',
  show:  ()    => '\x1b[?25h',
  save:  ()    => '\x1b[s',
  load:  ()    => '\x1b[u',
  goto:  (r,c) => `\x1b[${r};${c}H`,
};

const w = () => Math.min(process.stdout.columns || 80, 80);

// ── Colors ───────────────────────────────────────────────────────────────────
// All entries are chalk instances so .bold, .italic etc. chain naturally
const C = {
  gold:   chalk.hex('#FFD700'),
  green:  chalk.hex('#00E5A0'),
  red:    chalk.hex('#FF4444'),
  blue:   chalk.hex('#4EC9E0'),
  purple: chalk.hex('#C77DFF'),
  white:  chalk.white,
  dim:    chalk.hex('#666666'),
  bold:   chalk.bold,
  cyan:   chalk.cyan,
  bg:     {
    red:   chalk.bgRed.white.bold,
    black: chalk.bgGray.white.bold,
    green: chalk.bgGreen.black.bold,
  },
};

// ── Sleep / input ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function ask(prompt) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, a => { rl.close(); res(a.trim().toLowerCase()); });
  });
}

async function waitKey(msg = 'Press ENTER to continue...') {
  await ask(`\n  ${C.dim(msg)}`);
}

// ── Box drawing ──────────────────────────────────────────────────────────────
function box(lines, width, style = 'single', title = '') {
  const b = style === 'double'
    ? { tl:'╔', tr:'╗', bl:'╚', br:'╝', h:'═', v:'║' }
    : { tl:'┌', tr:'┐', bl:'└', br:'┘', h:'─', v:'│' };
  const inner = width - 2;
  const titleStr = title ? ` ${title} ` : '';
  const topFill = titleStr
    ? b.h.repeat(Math.floor((inner - titleStr.length) / 2)) + titleStr +
      b.h.repeat(Math.ceil((inner - titleStr.length) / 2))
    : b.h.repeat(inner);
  const rows = [
    b.tl + topFill + b.tr,
    ...lines.map(l => {
      const stripped = l.replace(/\x1b\[[0-9;]*m/g, '');
      const pad = Math.max(0, inner - stripped.length - 2);
      return `${b.v} ${l}${' '.repeat(pad)} ${b.v}`;
    }),
    b.bl + b.h.repeat(inner) + b.br,
  ];
  return rows;
}

// ── Info panel (? boxes) ─────────────────────────────────────────────────────
// These show live game state with highlighted ? when value is unknown/pending

function infoPanel(fields) {
  // fields: [{label, value, color?, pending?}]
  const lines = fields.map(f => {
    const val = f.pending
      ? chalk.yellow.bold('  ?  ')
      : (f.color ? f.color(String(f.value)) : C.white(String(f.value)));
    const label = C.dim(f.label.padEnd(14));
    return `${label} ${val}`;
  });
  return box(lines, 36, 'double', ' STATUS ');
}

function printPanel(fields) {
  const rows = infoPanel(fields);
  rows.forEach(r => console.log('  ' + r));
}

// ─────────────────────────────────────────────────────────────────────────────
//  ██████╗  ██████╗ ██╗   ██╗██╗     ███████╗████████╗████████╗███████╗
//  ██╔══██╗██╔═══██╗██║   ██║██║     ██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝
//  ██████╔╝██║   ██║██║   ██║██║     █████╗     ██║      ██║   █████╗
//  ██╔══██╗██║   ██║██║   ██║██║     ██╔══╝     ██║      ██║   ██╔══╝
//  ██║  ██║╚██████╔╝╚██████╔╝███████╗███████╗   ██║      ██║   ███████╗
//  ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝   ╚═╝      ╚═╝   ╚══════╝
// ─────────────────────────────────────────────────────────────────────────────

const ROULETTE_NUMBERS = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,
  5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function numColor(n) {
  if (n === 0) return C.green(String(n).padStart(2,'0'));
  return RED_NUMS.has(n) ? C.red(String(n).padStart(2,'0')) : C.white(String(n).padStart(2,'0'));
}

function numBg(n) {
  if (n === 0) return chalk.bgGreen.white.bold(` ${String(n).padStart(2,'0')} `);
  return RED_NUMS.has(n)
    ? chalk.bgRed.white.bold(` ${String(n).padStart(2,'0')} `)
    : chalk.bgGray.white.bold(` ${String(n).padStart(2,'0')} `);
}

// Wheel ASCII — 13 visible slots on a horizontal strip
function renderWheel(offset, highlight = false) {
  const len   = ROULETTE_NUMBERS.length;
  const COUNT = 9;                              // 9 slots fits any terminal ≥60
  const slots = [];
  for (let i = 0; i < COUNT; i++) {
    const idx      = ((offset + i) % len + len) % len;
    const n        = ROULETTE_NUMBERS[idx];
    const isCenter = (i === Math.floor(COUNT / 2));
    if (isCenter && highlight) {
      slots.push(numBg(n));
    } else {
      slots.push(numColor(n) + C.dim('|'));
    }
  }
  // Width: 9 slots × 6 chars + 2 padding = 56 → border ═×44
  const inner = slots.join(' ');
  const innerPlain = inner.replace(/\x1b\[[0-9;]*m/g, '');
  const W     = innerPlain.length + 2;          // +2 for the two spaces
  const track  = '╔' + '═'.repeat(W) + '╗';
  const bottom = '╚' + '═'.repeat(W) + '╝';
  const arrowPad = Math.floor(W / 2) + 1;
  const arrow  = ' '.repeat(arrowPad) + C.gold('▼');
  return [arrow, track, '║ ' + inner + ' ║', bottom];
}

async function animateWheel(finalOffset) {
  process.stdout.write(A.hide());
  const totalFrames = 60;
  const easeFrames  = 20; // last 20 frames slow down

  for (let f = 0; f < totalFrames; f++) {
    const progress = f / totalFrames;
    // Ease out: fast start, slow end
    const speed = f < (totalFrames - easeFrames)
      ? 3                                    // fast
      : Math.max(0.3, 3 * (1 - (f - (totalFrames - easeFrames)) / easeFrames));
    const offset = Math.floor(finalOffset - (totalFrames - f) * speed) % ROULETTE_NUMBERS.length;
    const isLast  = f === totalFrames - 1;
    const lines   = renderWheel(((offset % ROULETTE_NUMBERS.length) + ROULETTE_NUMBERS.length) % ROULETTE_NUMBERS.length, isLast);

    if (f > 0) process.stdout.write(A.up(4));
    lines.forEach(l => console.log('  ' + l));

    const delay = f < totalFrames - easeFrames ? 40 : 40 + (f - (totalFrames - easeFrames)) * 18;
    await sleep(delay);
  }
  process.stdout.write(A.show());
}

async function playRoulette(playerWealth) {
  console.log('\x1b[2J\x1b[H');

  // Header
  console.log('\n  ' + C.gold('╔════════════════════════════════════════════╗'));
  console.log('  ' + C.gold('║') + C.gold.bold('        🎡  CASINO ROULETTE  🎡           ') + C.gold('║'));
  console.log('  ' + C.gold('╚════════════════════════════════════════════╝'));
  console.log();

  // Bet type menu with info boxes
  const betTypes = [
    { key:'1', label:'RED',      desc:'Numbers 1-36 (red)',     payout:'2x',  color:C.red   },
    { key:'2', label:'BLACK',    desc:'Numbers 1-36 (black)',   payout:'2x',  color:C.white },
    { key:'3', label:'ODD',      desc:'Any odd number',         payout:'2x',  color:C.blue  },
    { key:'4', label:'EVEN',     desc:'Any even number',        payout:'2x',  color:C.blue  },
    { key:'5', label:'LOW 1-18', desc:'Numbers 1 to 18',        payout:'2x',  color:C.purple},
    { key:'6', label:'HIGH 19+', desc:'Numbers 19 to 36',       payout:'2x',  color:C.purple},
    { key:'7', label:'SINGLE #', desc:'Pick exact number',      payout:'35x', color:C.gold  },
    { key:'0', label:'LEAVE',    desc:'Walk away',              payout:'—',   color:C.dim   },
  ];

  // Render bet board
  console.log('  ┌──────────────────────────────────────────────────┐');
  console.log('  │  ' + C.gold.bold('PLACE YOUR BET') + '                                   │');
  console.log('  ├──────────────────────────────────────────────────┤');
  betTypes.forEach(b => {
    const keyStr  = C.cyan(`[${b.key}]`);
    const lbl     = b.color(b.label.padEnd(10));
    const desc    = C.dim(b.desc.padEnd(22));
    const pay     = C.gold(b.payout.padStart(4));
    console.log(`  │  ${keyStr} ${lbl} ${desc} ${pay}  │`);
  });
  console.log('  └──────────────────────────────────────────────────┘');
  console.log();

  // Info panel (pending bets shown as ?)
  printPanel([
    { label: 'Your Wealth', value: `$${playerWealth.toLocaleString()}`, color: C.gold },
    { label: 'Bet Type',    value: '???', pending: true },
    { label: 'Bet Amount',  value: '???', pending: true },
    { label: 'Payout',      value: '???', pending: true },
  ]);

  const betChoice = await ask(`\n  ${C.cyan('▸ Choose bet type: ')}`);
  const bt = betTypes.find(b => b.key === betChoice);
  if (!bt || bt.key === '0') return { won: false, amount: 0, leave: true };

  // Number input for single bet
  let targetNum = -1;
  if (bt.key === '7') {
    const numIn = await ask(`  ${C.cyan('▸ Enter number (0-36): ')}`);
    targetNum = parseInt(numIn);
    if (isNaN(targetNum) || targetNum < 0 || targetNum > 36) {
      console.log(`\n  ${C.red('Invalid number.')}`);
      return { won: false, amount: 0 };
    }
  }

  // Bet amount
  console.log();
  console.log(`  ${C.dim('Chip options:')}  ${C.white('[1]')} $100  ${C.white('[2]')} $500  ${C.white('[3]')} $1,000  ${C.white('[4]')} $5,000  ${C.white('[C]')} custom`);
  const chipChoice = await ask(`  ${C.cyan('▸ Choose chips: ')}`);
  let betAmt = 0;
  if      (chipChoice === '1') betAmt = 100;
  else if (chipChoice === '2') betAmt = 500;
  else if (chipChoice === '3') betAmt = 1000;
  else if (chipChoice === '4') betAmt = 5000;
  else if (chipChoice === 'c') {
    const custom = await ask(`  ${C.cyan('▸ Enter amount: $')}`);
    betAmt = parseInt(custom.replace(/,/g,'')) || 0;
  }
  if (betAmt <= 0 || betAmt > playerWealth) {
    console.log(`\n  ${C.red('Invalid bet amount.')}`);
    return { won: false, amount: 0 };
  }

  // Show updated panel
  console.log();
  printPanel([
    { label: 'Your Wealth', value: `$${playerWealth.toLocaleString()}`, color: C.gold },
    { label: 'Bet Type',    value: bt.label,   color: bt.color  },
    { label: 'Bet Amount',  value: `$${betAmt.toLocaleString()}`, color: C.gold },
    { label: 'Payout',      value: bt.payout,  color: C.green   },
  ]);

  await ask(`\n  ${C.dim('Press ENTER to SPIN...')}`);

  // Determine result
  const resultIdx    = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
  const resultNumber = ROULETTE_NUMBERS[resultIdx];

  // animateWheel offset: shift so the CENTER slot lands on resultNumber
  const COUNT_  = 9;
  const CENTER_ = Math.floor(COUNT_ / 2);   // slot 4 of 9
  const len_    = ROULETTE_NUMBERS.length;
  const spinOffset = ((resultIdx - CENTER_ % len_) + len_) % len_;

  // Animate
  console.log('\n  ' + C.gold('— SPINNING —'));
  console.log(); console.log(); console.log(); console.log();
  await animateWheel(spinOffset);

  // Show result
  console.log();
  const isRed   = RED_NUMS.has(resultNumber);
  const isBlack = resultNumber !== 0 && !isRed;
  console.log('  ' + C.gold('━'.repeat(48)));
  console.log(`  ${C.gold.bold('RESULT:')}  ${numBg(resultNumber)}  ${
    resultNumber === 0 ? C.green('GREEN') : isRed ? C.red('RED') : C.white('BLACK')
  }  ${resultNumber % 2 === 0 ? C.blue('EVEN') : C.blue('ODD')}  ${
    resultNumber >= 1 && resultNumber <= 18 ? C.purple('LOW') : resultNumber > 18 ? C.purple('HIGH') : ''
  }`);
  console.log('  ' + C.gold('━'.repeat(48)));

  // Evaluate win
  let won = false;
  if (bt.key === '1') won = isRed;
  else if (bt.key === '2') won = isBlack;
  else if (bt.key === '3') won = resultNumber !== 0 && resultNumber % 2 !== 0;
  else if (bt.key === '4') won = resultNumber !== 0 && resultNumber % 2 === 0;
  else if (bt.key === '5') won = resultNumber >= 1 && resultNumber <= 18;
  else if (bt.key === '6') won = resultNumber >= 19 && resultNumber <= 36;
  else if (bt.key === '7') won = resultNumber === targetNum;

  const multiplier = bt.key === '7' ? 35 : 1;
  const winAmount  = won ? betAmt * multiplier : 0;
  const netChange  = won ? betAmt * multiplier : -betAmt;

  await sleep(600);

  if (won) {
    console.log();
    console.log('  ' + chalk.bgGreen.black.bold('  [ YOU WIN! ]  '));
    console.log(`  ${C.green.bold(`+$${winAmount.toLocaleString()}`)}  ${C.dim('('+bt.payout+' payout)')}`);
  } else {
    console.log();
    console.log('  ' + chalk.bgRed.white.bold('  [NO WIN]  '));
    console.log(`  ${C.red.bold(`-$${betAmt.toLocaleString()}`)}`);
  }

  printPanel([
    { label: 'Result',      value: (resultNumber===0?'00':resultNumber) + (isRed?' RED':isBlack?' BLACK':' GREEN'), color: resultNumber===0?C.green:isRed?C.red:C.white },
    { label: 'Outcome',     value: won ? 'WIN' : 'LOSS', color: won ? C.green : C.red },
    { label: 'Net Change',  value: (netChange>0?'+':netChange<0?'-':'') + '$'+Math.abs(netChange).toLocaleString(), color: netChange>=0?C.green:C.red },
    { label: 'New Balance', value: '$'+(playerWealth+netChange).toLocaleString(), color: C.gold },
  ]);

  await waitKey();
  return { won, amount: netChange };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ██████╗ ██╗      █████╗  ██████╗██╗  ██╗     ██╗ █████╗  ██████╗██╗  ██╗
//  ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝     ██║██╔══██╗██╔════╝██║ ██╔╝
//  ██████╔╝██║     ███████║██║     █████╔╝      ██║███████║██║     █████╔╝
//  ██╔══██╗██║     ██╔══██║██║     ██╔═██╗ ██   ██║██╔══██║██║     ██╔═██╗
//  ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗╚█████╔╝██║  ██║╚██████╗██║  ██╗
//  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
// ─────────────────────────────────────────────────────────────────────────────

const SUITS  = ['♠','♥','♦','♣'];
const RANKS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const DECK   = SUITS.flatMap(s => RANKS.map(r => ({ suit:s, rank:r })));

function suitColor(s) {
  return (s==='♥'||s==='♦') ? chalk.red.bold(s) : chalk.white.bold(s);
}

function cardValue(rank) {
  if (['J','Q','K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

// 7-line ASCII card
function renderCard(card, faceDown=false) {
  if (faceDown) {
    return [
      '┌───────┐',
      '│░░░░░░░│',
      '│░ ♠ ♥ ░│',
      '│░░░░░░░│',
      '│░ ♦ ♣ ░│',
      '│░░░░░░░│',
      '└───────┘',
    ];
  }
  const r  = card.rank.padEnd(2);
  const s  = card.suit;
  const rc = (s==='♥'||s==='♦') ? chalk.red.bold : chalk.white.bold;
  return [
    '┌───────┐',
    `│${rc(r)}     │`,
    `│       │`,
    `│   ${rc(s)}   │`,
    `│       │`,
    `│     ${rc(card.rank.padStart(2))}│`,
    '└───────┘',
  ];
}

function renderHand(cards, faceDownIdx = -1) {
  const rendered = cards.map((c, i) => renderCard(c, i === faceDownIdx));
  const height = rendered[0].length;
  const rows = [];
  for (let r = 0; r < height; r++) {
    rows.push('  ' + rendered.map(c => c[r]).join(' '));
  }
  return rows;
}

function handTotal(cards) {
  let total = cards.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces  = cards.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function shuffleDeck() {
  const d = [...DECK];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [d[i],d[j]] = [d[j],d[i]];
  }
  return d;
}

async function dealCardAnim(hand, card, label, faceDown=false) {
  process.stdout.write(A.hide());
  // Brief flash of card being dealt
  hand.push(card);
  await sleep(200);
  process.stdout.write(A.show());
}

async function playBlackjack(playerWealth) {
  console.log('\x1b[2J\x1b[H');
  console.log('\n  ' + C.gold('╔════════════════════════════════════════════╗'));
  console.log('  ' + C.gold('║') + C.gold.bold('       🃏  CASINO BLACKJACK  🃏           ') + C.gold('║'));
  console.log('  ' + C.gold('╚════════════════════════════════════════════╝'));
  console.log();

  // Bet input with pending panel
  printPanel([
    { label: 'Your Wealth', value: `$${playerWealth.toLocaleString()}`, color: C.gold },
    { label: 'Your Bet',    value: '???', pending: true },
    { label: 'Your Total',  value: '???', pending: true },
    { label: 'Dealer Total',value: '???', pending: true },
  ]);

  console.log(`\n  ${C.dim('Chips:')}  ${C.white('[1]')} $100  ${C.white('[2]')} $500  ${C.white('[3]')} $1,000  ${C.white('[4]')} $5,000  ${C.white('[C]')} custom`);
  const chipIn = await ask(`  ${C.cyan('▸ Your bet: ')}`);
  let bet = 0;
  if      (chipIn==='1') bet=100;
  else if (chipIn==='2') bet=500;
  else if (chipIn==='3') bet=1000;
  else if (chipIn==='4') bet=5000;
  else if (chipIn==='c') { const v=await ask(`  ${C.cyan('▸ Amount: $')}`); bet=parseInt(v.replace(/,/g,''))||0; }
  if (bet<=0||bet>playerWealth) { console.log(`\n  ${C.red('Invalid bet.')}`); return {won:false,amount:0}; }

  // Deal
  const deck   = shuffleDeck();
  let di = 0;
  const player = [deck[di++], deck[di++]];
  const dealer = [deck[di++], deck[di++]];

  const redraw = (dealerReveal=false) => {
    console.log('\x1b[2J\x1b[H');
    console.log('\n  ' + C.gold('╔════════════════════════════════════════════╗'));
    console.log('  ' + C.gold('║') + C.gold.bold('       🃏  CASINO BLACKJACK  🃏           ') + C.gold('║'));
    console.log('  ' + C.gold('╚════════════════════════════════════════════╝'));
    console.log();

    // Dealer
    console.log(`  ${C.red.bold('DEALER')} ${dealerReveal ? C.white('('+handTotal(dealer)+')') : C.dim('(?)')}`);
    const dealerRows = renderHand(dealer, dealerReveal ? -1 : 1);
    dealerRows.forEach(r => console.log(r));
    console.log();

    // Player
    const pt = handTotal(player);
    console.log(`  ${C.green.bold('YOU')} ${C.white('('+pt+')')} ${pt>21?C.red.bold(' BUST!'):''}  ${C.dim('Bet: $'+bet.toLocaleString())}`);
    renderHand(player).forEach(r => console.log(r));
    console.log();

    // Status panel
    const dt = dealerReveal ? handTotal(dealer) : '?';
    printPanel([
      { label: 'Your Wealth',  value: `$${playerWealth.toLocaleString()}`, color: C.gold  },
      { label: 'Current Bet',  value: `$${bet.toLocaleString()}`,          color: C.gold  },
      { label: 'Your Total',   value: pt + (pt>21?' BUST':''),             color: pt>21?C.red:pt===21?C.gold:C.green },
      { label: 'Dealer Total', value: dealerReveal ? String(dt) : '? ?',  color: C.white, pending: !dealerReveal },
    ]);
  };

  redraw(false);

  // Check natural blackjack
  if (handTotal(player) === 21) {
    await sleep(400);
    redraw(true);
    console.log(`\n  ${chalk.bgYellow.black.bold('  [ BLACKJACK! 1.5x PAYOUT! ]  ')}`);
    const win = Math.floor(bet * 1.5);
    console.log(`  ${C.green.bold('+$'+win.toLocaleString())}`);
    await waitKey();
    return { won: true, amount: win };
  }

  // Player turn
  let doubled = false;
  let playerDone = false;
  while (!playerDone) {
    const canDouble = player.length === 2 && playerWealth >= bet * 2;
    console.log();
    console.log(`  ${C.cyan('[H]')} Hit   ${C.cyan('[S]')} Stand  ${canDouble ? C.cyan('[D]')+' Double down' : C.dim('[D] Double (need $'+bet.toLocaleString()+')')}`);
    const action = await ask(`  ${C.cyan('▸ Action: ')}`);

    if (action === 'h') {
      player.push(deck[di++]);
      redraw(false);
      if (handTotal(player) > 21) { playerDone = true; }
      else if (handTotal(player) === 21) { playerDone = true; }
    } else if (action === 's') {
      playerDone = true;
    } else if (action === 'd' && canDouble) {
      bet *= 2; doubled = true;
      player.push(deck[di++]);
      redraw(false);
      playerDone = true;
    } else {
      console.log(`  ${C.red('Invalid.')}`);
    }
  }

  const playerTotal = handTotal(player);

  // Dealer reveals and plays (hits until ≥17)
  await sleep(300);
  redraw(true);
  await sleep(600);

  while (handTotal(dealer) < 17) {
    await sleep(600);
    dealer.push(deck[di++]);
    redraw(true);
  }

  const dealerTotal = handTotal(dealer);
  await sleep(400);

  // Determine outcome
  let outcome, netChange;
  if (playerTotal > 21) {
    outcome = 'BUST — You lose'; netChange = -bet;
  } else if (dealerTotal > 21) {
    outcome = 'Dealer BUST — You win!'; netChange = bet;
  } else if (playerTotal > dealerTotal) {
    outcome = 'You win!'; netChange = bet;
  } else if (dealerTotal > playerTotal) {
    outcome = 'Dealer wins'; netChange = -bet;
  } else {
    outcome = 'Push — Tie'; netChange = 0;
  }

  console.log();
  console.log('  ' + C.gold('━'.repeat(44)));
  if (netChange > 0) {
    console.log('  ' + chalk.bgGreen.black.bold('  [ '+outcome.toUpperCase()+' ]  '));
    console.log(`  ${C.green.bold('+$'+netChange.toLocaleString())}${doubled?' '+C.dim('(doubled down)'):''}`);
  } else if (netChange < 0) {
    console.log('  ' + chalk.bgRed.white.bold('  [ '+outcome.toUpperCase()+' ]  '));
    console.log(`  ${C.red.bold('-$'+Math.abs(netChange).toLocaleString())}`);
  } else {
    console.log('  ' + chalk.bgYellow.black.bold('  [ '+outcome.toUpperCase()+' ]  '));
    console.log(`  ${C.dim('No change')}`);
  }

  printPanel([
    { label: 'Your Total',   value: playerTotal+(playerTotal>21?' BUST':''), color: playerTotal>21?C.red:C.green },
    { label: 'Dealer Total', value: dealerTotal+(dealerTotal>21?' BUST':''), color: dealerTotal>21?C.green:C.red },
    { label: 'Outcome',      value: outcome, color: netChange>0?C.green:netChange<0?C.red:C.gold },
    { label: 'Net Change',   value: (netChange>=0?'+':'') + '$'+Math.abs(netChange).toLocaleString(), color: netChange>=0?C.green:C.red },
  ]);

  await waitKey();
  return { won: netChange > 0, amount: netChange };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ██████╗  ██████╗ ██╗  ██╗███████╗██████╗
//  ██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝██╔══██╗
//  ██████╔╝██║   ██║█████╔╝ █████╗  ██████╔╝
//  ██╔═══╝ ██║   ██║██╔═██╗ ██╔══╝  ██╔══██╗
//  ██║     ╚██████╔╝██║  ██╗███████╗██║  ██║
//  ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
// ─────────────────────────────────────────────────────────────────────────────

// 5-card draw poker hand evaluator
function evaluateHand(cards) {
  const ranks  = cards.map(c => RANKS.indexOf(c.rank));
  const suits  = cards.map(c => c.suit);
  const sorted = [...ranks].sort((a,b)=>b-a);
  const freq   = {};
  ranks.forEach(r => { freq[r] = (freq[r]||0)+1; });
  const counts = Object.values(freq).sort((a,b)=>b-a);
  const flush  = suits.every(s => s === suits[0]);
  const isRoyal    = sorted[0]===12&&sorted[1]===11&&sorted[2]===10&&sorted[3]===9&&sorted[4]===0;
  const straight = (sorted[0]-sorted[4]===4 && counts[0]===1)
    || (sorted[0]===12&&sorted[1]===3&&sorted[2]===2&&sorted[3]===1&&sorted[4]===0)
    || isRoyal;

  if (flush && isRoyal)         return { rank:9, name:'Royal Flush',    multi:800 };
  if (flush && straight)                              return { rank:8, name:'Straight Flush', multi:50  };
  if (counts[0]===4)                                  return { rank:7, name:'Four of a Kind', multi:25  };
  if (counts[0]===3 && counts[1]===2)                return { rank:6, name:'Full House',     multi:9   };
  if (flush)                                          return { rank:5, name:'Flush',          multi:6   };
  if (straight)                                       return { rank:4, name:'Straight',       multi:4   };
  if (counts[0]===3)                                  return { rank:3, name:'Three of a Kind',multi:3   };
  if (counts[0]===2 && counts[1]===2)                return { rank:2, name:'Two Pair',       multi:2   };
  if (counts[0]===2 && ranks.some(r=>r>=10||r===0))         return { rank:1, name:'Jacks or Better',multi:1   };
  return { rank:0, name:'High Card', multi:0 };
}

function renderPokerHand(cards, keep=[]) {
  const cols = cards.map((c,i) => ({
    lines: renderCard(c),
    keep:  keep[i] || false,
    idx:   i,
  }));
  const height = cols[0].lines.length;
  const rows = [];
  for (let r=0;r<height;r++) {
    rows.push('  ' + cols.map(c => c.lines[r]).join(' '));
  }
  // Keep/discard labels below
  const labels = '  ' + cols.map(c =>
    c.keep ? chalk.green.bold('  KEEP  ') : C.dim('  ~~~~  ')
  ).join(' ');
  rows.push(labels);
  const nums = '  ' + cols.map((c,i) =>
    C.cyan(`    [${i+1}]  `)
  ).join(' ');
  rows.push(nums);
  return rows;
}

async function playPoker(playerWealth) {
  console.log('\x1b[2J\x1b[H');
  console.log('\n  ' + C.gold('╔════════════════════════════════════════════╗'));
  console.log('  ' + C.gold('║') + C.gold.bold('      ♠️  VIDEO POKER (5-Card Draw)  ♠️      ') + C.gold('║'));
  console.log('  ' + C.gold('╚════════════════════════════════════════════╝'));
  console.log();

  // Paytable
  console.log('  ' + C.gold('─── PAY TABLE ───────────────────────────────'));
  const pays = [
    ['Royal Flush','800x'],['Straight Flush','50x'],['Four of a Kind','25x'],
    ['Full House','9x'],['Flush','6x'],['Straight','4x'],
    ['Three of a Kind','3x'],['Two Pair','2x'],['Jacks or Better','1x'],['High Card','—'],
  ];
  pays.forEach(([h,p]) => {
    console.log(`  ${C.dim(h.padEnd(22))} ${C.gold(p)}`);
  });
  console.log('  ' + C.gold('─────────────────────────────────────────────'));
  console.log();

  // Bet
  printPanel([
    { label: 'Your Wealth', value: `$${playerWealth.toLocaleString()}`, color: C.gold },
    { label: 'Your Bet',    value: '???', pending: true },
    { label: 'Best Hand',   value: '???', pending: true },
    { label: 'Payout',      value: '???', pending: true },
  ]);

  console.log(`\n  ${C.dim('Chips:')}  ${C.white('[1]')} $100  ${C.white('[2]')} $500  ${C.white('[3]')} $1,000  ${C.white('[4]')} $5,000  ${C.white('[C]')} custom`);
  const chipIn = await ask(`  ${C.cyan('▸ Your bet: ')}`);
  let bet=0;
  if(chipIn==='1')bet=100;else if(chipIn==='2')bet=500;
  else if(chipIn==='3')bet=1000;else if(chipIn==='4')bet=5000;
  else if(chipIn==='c'){const v=await ask(`  ${C.cyan('▸ Amount: $')}`);bet=parseInt(v.replace(/,/g,''))||0;}
  if(bet<=0||bet>playerWealth){console.log(`\n  ${C.red('Invalid bet.')}`);return{won:false,amount:0};}

  // Deal initial hand
  const deck = shuffleDeck();
  let di=0;
  let hand = [deck[di++],deck[di++],deck[di++],deck[di++],deck[di++]];
  let keep = [false,false,false,false,false];

  const redrawPoker = () => {
    console.log('\x1b[2J\x1b[H');
    console.log('\n  ' + C.gold('╔════════════════════════════════════════════╗'));
    console.log('  ' + C.gold('║') + C.gold.bold('      ♠️  VIDEO POKER (5-Card Draw)  ♠️      ') + C.gold('║'));
    console.log('  ' + C.gold('╚════════════════════════════════════════════╝'));
    console.log();
    renderPokerHand(hand, keep).forEach(r=>console.log(r));
    console.log();
    const ev = evaluateHand(hand);
    printPanel([
      { label: 'Your Bet',   value: `$${bet.toLocaleString()}`, color: C.gold },
      { label: 'Hand',       value: ev.name, color: ev.rank>=4?C.gold:ev.rank>=2?C.green:C.white },
      { label: 'Multiplier', value: ev.multi>0?`${ev.multi}x`:'—', color: ev.multi>0?C.green:C.dim },
      { label: 'Payout',     value: ev.multi>0?'$'+(bet*ev.multi).toLocaleString():'—', color: ev.multi>0?C.gold:C.dim },
    ]);
  };

  redrawPoker();

  // Card selection
  console.log();
  console.log(`  ${C.white('Toggle which cards to KEEP:')}`);
  console.log(`  ${C.dim('Type card numbers to toggle (e.g. "135" keeps cards 1,3,5)')}`);
  console.log(`  ${C.dim('Press ENTER with no input to keep all.')}`);
  console.log(`  ${C.dim('Type "all" to keep all, "none" to discard all.')}`);
  console.log(`  ${C.cyan('[D]')} Draw (finalize hand once happy with selection)`);

  let done = false;
  while (!done) {
    const inp = await ask(`\n  ${C.cyan('▸ Toggle/Draw: ')}`);
    if (inp === 'd' || inp === '') {
      done = true;
    } else if (inp === 'all') {
      keep = [true,true,true,true,true];
      redrawPoker();
    } else if (inp === 'none') {
      keep = [false,false,false,false,false];
      redrawPoker();
    } else {
      [...inp].forEach(ch => {
        const idx = parseInt(ch)-1;
        if (idx>=0 && idx<=4) keep[idx] = !keep[idx];
      });
      redrawPoker();
    }
  }

  // Draw phase — replace un-kept cards with animation
  process.stdout.write(A.hide());
  for (let i=0;i<5;i++) {
    if (!keep[i]) {
      await sleep(180);
      hand[i] = deck[di++];
    }
  }
  process.stdout.write(A.show());

  // Final hand
  keep = [true,true,true,true,true];
  redrawPoker();

  const result   = evaluateHand(hand);
  const winAmt   = bet * result.multi;
  const netChange= result.multi > 0 ? winAmt - bet : -bet;
  // (payout already includes bet for multi≥1 games, so net = winAmt - bet when multi>0)
  // Actually: player paid `bet`, if multi>0 they win back bet*multi (net = bet*(multi-1)), if multi=0 they lose bet
  const actual = result.multi > 0 ? bet*(result.multi-1) : -bet;

  await sleep(400);
  console.log();
  console.log('  ' + C.gold('━'.repeat(44)));
  if (result.rank >= 1) {
    console.log('  ' + chalk.bgGreen.black.bold(`  [ ${result.name.toUpperCase()}! ]  `));
    console.log(`  ${C.green.bold('+$'+Math.abs(actual).toLocaleString())}  ${C.dim('('+result.multi+'× payout)')}`);
  } else {
    console.log('  ' + chalk.bgRed.white.bold('  [ '+result.name.toUpperCase()+' ]  '));
    console.log(`  ${C.red.bold('-$'+bet.toLocaleString())}`);
  }

  printPanel([
    { label: 'Final Hand',  value: result.name, color: result.rank>=6?C.gold:result.rank>=3?C.green:C.white },
    { label: 'Multiplier',  value: result.multi>0?result.multi+'×':'—', color: result.multi>0?C.green:C.red },
    { label: 'Net Change',  value: (actual>0?'+':actual<0?'-':'') + '$'+Math.abs(actual).toLocaleString(), color: actual>=0?C.green:C.red },
    { label: 'New Balance', value: '$'+(playerWealth+actual).toLocaleString(), color: C.gold },
  ]);

  await waitKey();
  return { won: actual > 0, amount: actual };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CASINO LOBBY
// ─────────────────────────────────────────────────────────────────────────────

async function openCasino(characterWealth) {
  let wealth = characterWealth;
  let totalNet = 0;

  while (true) {
    console.log('\x1b[2J\x1b[H');
    console.log('\n  ' + C.gold('╔══════════════════════════════════════════════╗'));
    console.log('  ' + C.gold('║') + C.gold.bold('    🎰  LIFEFORGE CASINO  🎰                ') + C.gold('║'));
    console.log('  ' + C.gold('║') + C.dim('         Where fortunes are made and lost   ') + C.gold('║'));
    console.log('  ' + C.gold('╚══════════════════════════════════════════════╝'));
    console.log();

    // Wealth display
    const wealthColor = wealth > characterWealth ? C.green : wealth < characterWealth ? C.red : C.gold;
    const netStr = totalNet >= 0 ? C.green('+$'+totalNet.toLocaleString()) : C.red('-$'+Math.abs(totalNet).toLocaleString());
    printPanel([
      { label: 'Chips in Hand', value: '$'+wealth.toLocaleString(), color: wealthColor },
      { label: 'Session P/L',   value: totalNet===0?'$0':(totalNet>0?'+':'')+('$'+Math.abs(totalNet).toLocaleString()), color: totalNet>=0?C.green:C.red },
      { label: 'Table Min',     value: '$100', color: C.dim },
      { label: 'Table Max',     value: '$5,000', color: C.dim },
    ]);

    console.log();
    console.log(`  ${C.cyan('[1]')} ${C.gold('🎡 Roulette')}     ${C.dim('Bet on numbers, colors, ranges')}`);
    console.log(`  ${C.cyan('[2]')} ${C.gold('🃏 Blackjack')}    ${C.dim('Beat the dealer. Bust = lose')}`);
    console.log(`  ${C.cyan('[3]')} ${C.gold('♠  Video Poker')}  ${C.dim('5-card draw. Jacks or better pays')}`);
    console.log(`  ${C.cyan('[0]')} ${C.dim('Leave Casino')}`);
    console.log();

    if (wealth < 100) {
      console.log(`  ${C.red('⚠  Insufficient funds. Minimum bet is $100.')}`);
    }

    const choice = await ask(`  ${C.cyan('▸ Choose game: ')}`);

    if (choice === '0') break;
    if (wealth < 100) {
      console.log(`\n  ${C.red('You don\'t have enough to play. Leaving casino...')}`);
      await sleep(1500);
      break;
    }

    let result = { won: false, amount: 0, leave: false };

    if (choice === '1') result = await playRoulette(wealth);
    else if (choice === '2') result = await playBlackjack(wealth);
    else if (choice === '3') result = await playPoker(wealth);
    else continue;

    if (result.leave) break;
    wealth    += result.amount;
    totalNet  += result.amount;
    if (wealth <= 0) {
      wealth = 0;
      console.log(`\n  ${C.red.bold('You\'re broke! The casino shows you the door.')}`);
      await sleep(2000);
      break;
    }
  }

  return { finalWealth: wealth, netChange: wealth - characterWealth };
}

module.exports = { openCasino };
