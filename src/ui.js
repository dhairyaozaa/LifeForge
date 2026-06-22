const chalk = require('chalk');
const { ART } = require('./ascii-art');

const C = {
  primary:   chalk.hex('#00E5CC'),
  secondary: chalk.hex('#FFB347'),
  accent:    chalk.hex('#FF6B6B'),
  muted:     chalk.hex('#666666'),
  white:     chalk.white,
  bold:      chalk.bold,
  success:   chalk.hex('#7DFF7D'),
  green:     chalk.hex('#7DFF7D'),    // alias for success
  danger:    chalk.hex('#FF4444'),
  red:       chalk.hex('#FF4444'),    // alias for danger
  info:      chalk.hex('#4EC9E0'),
  gold:      chalk.hex('#FFD700'),
  purple:    chalk.hex('#C77DFF'),
  pink:      chalk.hex('#FF85A1'),
  blue:      chalk.hex('#4EC9E0'),
  cyan:      chalk.cyan,
  dim:       chalk.dim,
  stat: v => v>=80 ? chalk.hex('#7DFF7D') : v>=60 ? chalk.hex('#FFD700') : v>=40 ? chalk.hex('#FFB347') : chalk.hex('#FF4444'),
  clear: () => process.stdout.write('\x1Bc'),
};

const W = () => Math.min(process.stdout.columns || 80, 82);

function line(ch='─') { return C.muted(ch.repeat(W())); }
function dline()      { return C.primary('═'.repeat(W())); }
function center(txt)  {
  const l = txt.replace(/\x1b\[[0-9;]*m/g,'').length;
  return ' '.repeat(Math.max(0,Math.floor((W()-l)/2)))+txt;
}
function pbar(v,max,w=20,f='█',e='░') {
  const n=Math.round((v/max)*w);
  return f.repeat(Math.max(0,n))+e.repeat(Math.max(0,w-n));
}

const LOGO = `
██╗     ██╗███████╗███████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██║     ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║     ██║█████╗  █████╗  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
██║     ██║██╔══╝  ██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
███████╗██║██║     ███████╗██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚══════╝╚═╝╚═╝     ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝`;

class UI {
  printLogo() {
    LOGO.split('\n').forEach(l => {
      if (l.includes('█')) console.log(C.primary(l));
      else if (l.trim()) console.log(C.muted(l));
    });
    console.log(center(C.secondary.bold('◈  A I - P O W E R E D  L I F E  S I M U L A T O R  ◈')));
  }

  header(title) {
    console.log(); console.log(dline());
    console.log(center(C.secondary.bold(` ◈ ${title} ◈ `)));
    console.log(dline());
  }

  sub(text) {
    console.log(line()); console.log(` ${C.primary('▸')} ${C.bold(text)}`); console.log(line());
  }

  printChar(c) {
    const stage = c.getLifeStage();
    const art   = ART.getLifeStageArt(c.age);
    console.log(); console.log(dline());

    const glyph = c.gender==='male'?'♂':'♀';
    const status = c.inPrison ? '⛓ ' : c.alive ? '💚' : '💀';
    console.log(center(C.gold.bold(` ${status} ${c.name} ${glyph} `)));
    console.log(center(C.muted(`Age ${c.age}  •  ${c.city}, ${c.country}  •  ${stage.toUpperCase()}`)));
    console.log(line());

    // Art + stats side by side
    // Art is now an array of strings (no split needed for array art)
    const artLines = Array.isArray(art)
      ? art
      : art.split('\n').filter(l => l.length > 0);

    // Stat bars — 6 stats including recklessness
    const stats = [
      { label:'😊 Happiness', v:c.happiness },
      { label:'❤️  Health   ', v:c.health   },
      { label:'🧠 Smarts   ', v:c.smarts   },
      { label:'✨ Looks    ', v:c.looks    },
      { label:'⚡ Karma    ', v:c.karma    },
      { label:'🎲 Reckless ', v:c.recklessness, invert:true },
    ];
    const statLines = stats.map(s => {
      const dispVal = s.invert ? 100-s.v : s.v;
      const bar = ART.statBar(dispVal, 16);
      const numColor = s.invert
        ? (s.v>70?C.danger:s.v>40?C.secondary:C.success)
        : C.stat(s.v);
      return `${C.muted(s.label)} [${bar}] ${numColor(String(s.v).padStart(3))}`;
    });

    // Color the art based on life stage — wrapped to guarantee callable
    const _stageChalk = stage==='infant'||stage==='child' ? C.blue
                      : stage==='teen'    ? C.purple
                      : stage==='adult'   ? C.primary
                      : stage==='senior'  ? C.secondary
                      : C.muted;
    const stageColor = s => (typeof _stageChalk === 'function' ? _stageChalk(s) : s);

    // Side-by-side: art (left) + stats (right)
    const artWidth = Math.max(...artLines.map(l => l.length)) + 2;
    const maxL = Math.max(artLines.length, statLines.length);
    for (let i=0;i<maxL;i++) {
      const raw = artLines[i] || '';
      const padded = stageColor(raw.padEnd(artWidth));
      console.log(`  ${padded}  ${statLines[i]||''}`);
    }
    console.log(line());

    // Job / wealth row
    const jobTxt = c.job ? `${c.job} ($${c.salary.toLocaleString()}/yr)` : 'Unemployed';
    const nw = c.getNetWorth();
    const wc = nw>500000?C.gold:nw>0?C.success:C.danger;
    console.log(`  💼 ${C.muted('Job:')}      ${C.white(jobTxt)}`);
    console.log(`  💰 ${C.muted('Net worth:')} ${wc('$'+nw.toLocaleString())}`);

    // Badges
    const badges=[];
    if(c.hasHouse)       badges.push(C.success('🏠 House'));
    if(c.hasCar)         badges.push(C.success('🚗 Car'));
    if(c.relationship)   badges.push(C.pink(`💕 ${c.relationship}`));
    if(c.partnerName)    badges.push(C.muted(`(${c.partnerName})`));
    if(c.children>0)     badges.push(C.secondary(`👶×${c.children}`));
    if(c.education!=='none') badges.push(C.info(`🎓 ${c.education}`));
    if(c.inPrison)       badges.push(C.danger(`⛓ Prison (${c.prisonYears}yr left)`));
    if(c.addictions.length) badges.push(C.danger('⚠ Addiction'));
    if(badges.length)    console.log('  '+badges.join('  '));
    console.log(dline());
  }

  printEvent(ev) {
    const col = ev.type==='death'?C.danger:ev.type==='milestone'?C.gold:
                ev.type==='income'?C.success:ev.type==='relationship'?C.pink:
                ev.type==='ai_event'?C.info:C.white;

    // AI-generated events get a special marker
    const prefix = ev.type==='ai_event' ? C.purple('✦ ') : '  ';
    console.log(`${prefix}${col(ev.text)}`);

    if(ev.effect){
      const e=ev.effect, parts=[];
      if(e.happiness) parts.push((e.happiness>0?C.success:C.danger)(`happiness ${e.happiness>0?'+':''}${e.happiness}`));
      if(e.health)    parts.push((e.health>0?C.success:C.danger)(`health ${e.health>0?'+':''}${e.health}`));
      if(e.wealth)    parts.push((e.wealth>0?C.gold:C.danger)(`$${e.wealth>0?'+':''}${e.wealth.toLocaleString()}`));
      if(e.smarts)    parts.push(C.info(`smarts ${e.smarts>0?'+':''}${e.smarts}`));
      if(e.karma)     parts.push(C.purple(`karma ${e.karma>0?'+':''}${e.karma}`));
      if(parts.length) console.log(`     ${C.muted('→')} ${parts.join(' | ')}`);
    }
  }

  printChoice(event, choices) {
    const { CHOICES } = require('./events');
    const cd = CHOICES[event.choiceKey]; if(!cd) return;
    console.log(); console.log(`  ${C.secondary.bold('⚡ CHOICE: '+event.text)}`);
    console.log(`  ${C.muted(cd.prompt)}`); console.log();
    cd.options.forEach((o,i)=>console.log(`  ${C.primary(`[${i+1}]`)} ${C.white(o.text)}`));
  }

  printMainMenu(c) {
    console.log(); this.sub('WHAT WILL YOU DO?');
    const opts=[
      ['A','⏰ Age Up',       'Let a year pass — the AI shapes your fate'],
      ['B','🎯 Activities',   'Meditate · Exercise · Study · Party · Crime'],
      ['C','💼 Career',       'Apply for jobs · Climb the ladder'],
      ['D','💕 Love',         'Date · Propose · Have children'],
      ['E','🏠 Assets',       'Buy property and vehicles'],
      ['F','🎓 Education',    'Enroll in college'],
      ['G','📖 Life Log',     'Review your story'],
      ['H','🤖 AI Info',      'Model details & generated samples'],
      ['Q','❌ Quit',         ''],
    ];
    opts.forEach(([k,n,d])=>{
      console.log(`  ${C.primary('['+k+']')} ${C.white(n.padEnd(22))} ${C.muted(d)}`);
    });
    console.log();
  }

  printActivities() {
    this.sub('ACTIVITIES');
    const acts=[
      ['1','🧘 Meditate',    '+happiness +health'],
      ['2','💪 Exercise',    '+health +looks'],
      ['3','📚 Study',       '+smarts'],
      ['4','🎉 Party',       '+happiness -health'],
      ['5','💼 Overtime',    '+wealth'],
      ['6','❤️  Volunteer',  '+karma +happiness'],
      ['7','🎰 Casino',      'Roulette · Blackjack · Poker'],
      ['8','🔪 Crime',       '±wealth (very risky)'],
      ['9','✈️  Travel',     '+happiness -wealth'],
      ['0','🥗 Diet',        '+health +looks'],
    ];
    acts.forEach(([k,n,e])=>console.log(`  ${C.primary('['+k+']')} ${C.white(n.padEnd(22))} ${C.muted(e)}`));
  }

  printJobs(jobs, c) {
    this.sub('JOB LISTINGS');
    console.log(`  ${C.muted('Smarts: '+c.smarts+' | Age: '+c.age)}`); console.log();
    jobs.forEach((j,i)=>{
      const ok = c.smarts>=j.smartsReq && c.age>=j.minAge;
      console.log(`  ${ok?C.success('✓'):C.danger('✗')} ${C.primary('['+(i+1)+']')} ${C.white(j.title.padEnd(22))} ${C.gold('$'+j.salary.toLocaleString()+'/yr')} ${C.muted('(smarts '+j.smartsReq+'+, age '+j.minAge+')')}`);
    });
  }

  printLog(c, n=25) {
    this.sub('LIFE LOG — '+c.name);
    c.log.slice(-n).forEach(e=>{
      console.log(`  ${C.muted('[Age '+String(e.age).padStart(2)+']')} ${e.emoji||'▸'} ${C.white(e.text)}`);
    });
    if(c.log.length>n) console.log(`  ${C.muted('... and '+(c.log.length-n)+' earlier events')}`);
  }

  printAIInfo(info) {
    this.sub('AI MODEL — LIFEFORGE NEURAL LM');
    if(!info.trained){
      console.log(`  ${C.danger('Model not trained yet.')}`); return;
    }
    console.log(`  ${C.muted('Type:')}           ${C.white('Feedforward Neural Language Model (Bengio 2003)')}`);
    console.log(`  ${C.muted('Architecture:')}   ${C.white('embed('+info.vocabSize+'×48) → FC(512,ReLU) → FC(256,ReLU) → softmax('+info.vocabSize+')')}`);
    console.log(`  ${C.muted('Parameters:')}     ${C.info((info.params||'~300k').toLocaleString())}`);
    console.log(`  ${C.muted('Trained Epochs:')} ${C.info(info.epochs)}`);
    console.log(`  ${C.muted('Best Loss:')}      ${C.info(info.loss)}`);
    console.log(`  ${C.muted('Vocab Size:')}     ${C.info(info.vocabSize+' words')}`);
    console.log(`  ${C.muted('Corpus:')}         ${C.info('335 hand-authored life-event sentences (18 categories)')}`);
    console.log(`  ${C.muted('Context Window:')} ${C.info('W=5 previous words → predict next word')}`);
    console.log(`  ${C.muted('Inference:')}      ${C.success('Local · No API · No Internet · Runs on your laptop')}`);
    if(info.samples && Object.keys(info.samples).length) {
      console.log(); console.log(`  ${C.secondary('Sample generations:')}`);
      Object.entries(info.samples).slice(0,5).forEach(([cat,txt])=>{
        console.log(`  ${C.purple('['+cat+']')}`);
        console.log(`    ${C.white(txt)}`);
      });
    }
  }

  trainProgress(pct, msg) {
    const bar = pbar(pct,100,42,'▓','░');
    const col = C.primary(bar.slice(0,Math.round(pct/100*42)))+C.muted(bar.slice(Math.round(pct/100*42)));
    process.stdout.write(`\r  [${col}] ${C.gold(String(pct).padStart(3)+'%')} ${C.muted(msg.slice(0,45).padEnd(45))}`);
  }

  printTrainScreen() {
    C.clear(); console.log(); this.printLogo(); console.log();
    console.log(dline());
    console.log(center(C.info.bold(' 🤖  TRAINING AI MODEL ON YOUR MACHINE  🤖 ')));
    console.log(dline()); console.log();
    console.log(`  ${C.muted('Model type:')}  Feedforward Neural Language Model`);
    console.log(`  ${C.muted('Training on:')} 335 hand-authored life event sentences`);
    console.log(`  ${C.muted('Runtime:')}     Pure Python + NumPy — no GPU, no cloud, no API`);
    console.log();
  }

  deathScreen(r) {
    C.clear(); console.log();
    console.log(C.danger(ART.coffin)); console.log();
    console.log(dline());
    console.log(center(C.danger.bold(' ☠   G A M E   O V E R   ☠ ')));
    console.log(dline()); console.log();
    console.log(center(C.gold.bold(r.name)));
    console.log(center(C.muted('Age 0 — '+r.age)));
    console.log(center(C.white('Died: '+r.cause.replace(/_/g,' ')))); console.log();
    console.log(line());
    const rb = pbar(r.rating,100,32);
    const fc = Math.round(r.rating/100*32);
    const cbar = C.stat(r.rating)(rb.slice(0,fc))+C.muted(rb.slice(fc));
    console.log(center(`Life Rating  [${cbar}]  ${C.gold(r.rating+'/100')}`));
    console.log();
    [['💰 Net Worth','$'+r.netWorth.toLocaleString()],
     ['👶 Children',String(r.children)],
     ['📖 Events Lived',String(r.log.length)]
    ].forEach(([k,v])=>console.log(`  ${C.muted(k.padEnd(20))} ${C.white(v)}`));
    console.log(); console.log(line());
    console.log(center(C.secondary.italic(`"${r.epitaph}"`)));
    console.log(line()); console.log();
  }

  info(m)    { console.log(`  ${C.info('ℹ')} ${C.white(m)}`); }
  ok(m)      { console.log(`  ${C.success('✓')} ${C.white(m)}`); }
  err(m)     { console.log(`  ${C.danger('✗')} ${C.danger(m)}`); }
  warn(m)    { console.log(`  ${C.secondary('⚠')} ${C.secondary(m)}`); }
}

module.exports = { UI, C };
