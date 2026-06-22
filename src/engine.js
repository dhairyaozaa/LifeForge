// Game Engine - Life State Machine

const { NAMES, COUNTRIES, CITIES, JOBS, RANDOM_EVENTS, CHOICES, ACTIVITIES, DEATH_CAUSES, RELATIONSHIP_EVENTS, LIFE_MILESTONES, rand, randInt } = require('./events');

class Character {
  constructor(options = {}) {
    const country = options.country || rand(COUNTRIES);
    const cities = CITIES[country];
    const gender = options.gender || (Math.random() > 0.5 ? 'male' : 'female');
    const firstNames = NAMES[`first_${gender}`];

    this.name = options.name || `${rand(firstNames)} ${rand(NAMES.last)}`;
    this.gender = gender;
    this.country = country;
    this.city = options.city || rand(cities);
    this.age = 0;
    this.alive = true;
    this.deathAge = null;
    this.deathCause = null;

    // Core stats (0-100)
    this.happiness = randInt(40, 80);
    this.health = randInt(60, 100);
    this.smarts = randInt(20, 80);
    this.looks = randInt(20, 80);
    this.karma = randInt(40, 70);
    this.recklessness = randInt(10, 40);

    // Finances
    this.wealth = randInt(0, 5000);
    this.salary = 0;
    this.job = null;

    // Relationships
    this.relationship = null; // single, dating, married, divorced
    this.partnerName = null;
    this.children = 0;
    const _lastName = this.name.includes(' ')
      ? this.name.split(' ').slice(1).join(' ')
      : rand(NAMES.last);
    this.parents = {
      dad: `${rand(NAMES.first_male)} ${_lastName}`,
      mom: `${rand(NAMES.first_female)} ${_lastName}`
    };

    // Education
    this.education = 'none'; // none, high-school, college, postgrad

    // Life history log
    this.log = [];
    this.yearLog = {}; // age -> events

    // Assets
    this.hasHouse = false;
    this.hasCar = false;
    this.inPrison = false;
    this.prisonYears = 0;
    this.addictions = [];
  }

  clampStats() {
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
    this.happiness = clamp(this.happiness);
    this.health = clamp(this.health);
    this.smarts = clamp(this.smarts);
    this.looks = clamp(this.looks);
    this.karma = clamp(this.karma);
    this.recklessness = clamp(Math.min(100, Math.max(0, this.recklessness)));
    this.wealth = Math.max(-500000, this.wealth);
  }

  applyEffect(effect) {
    if (!effect) return;
    if (effect.happiness) this.happiness += effect.happiness;
    if (effect.health) this.health += effect.health;
    if (effect.smarts) this.smarts += effect.smarts;
    if (effect.looks) this.looks += effect.looks;
    if (effect.karma) this.karma += effect.karma;
    if (effect.recklessness) this.recklessness += effect.recklessness;
    if (effect.wealth) this.wealth += effect.wealth;
    this.clampStats();
  }

  addLog(text, emoji = '') {
    const entry = { age: this.age, text, emoji };
    this.log.push(entry);
    if (!this.yearLog[this.age]) this.yearLog[this.age] = [];
    this.yearLog[this.age].push(entry);
  }

  getLifeStage() {
    if (this.age < 5) return 'infant';
    if (this.age < 13) return 'child';
    if (this.age < 20) return 'teen';
    if (this.age < 65) return 'adult';
    return 'senior';
  }

  getNetWorth() {
    let nw = this.wealth;
    if (this.hasHouse) nw += 200000;
    if (this.hasCar) nw += 15000;
    return nw;
  }

  getLifeRating() {
    const avg = (this.happiness + this.health + this.smarts + this.looks + this.karma) / 5;
    const wealthBonus = Math.min(20, this.wealth / 50000);
    return Math.min(100, Math.round(avg + wealthBonus));
  }
}

class GameEngine {
  constructor(brain = null) {
    this.brain = brain;
    this.character = null;
    this.year = 0;
    this.gameOver = false;
    this.pendingEvents = [];
  }

  newGame(options = {}) {
    this.character = new Character(options);
    this.year = 0;
    this.gameOver = false;
    this.pendingEvents = [];
    this.character.addLog(`Born in ${this.character.city}, ${this.character.country}`, '👶');
    return this.character;
  }

  ageUp() {
    const c = this.character;
    if (!c || !c.alive) return [];
    const events = [];

    c.age++;
    this.year++;

    // Prison time
    if (c.inPrison) {
      c.prisonYears--;
      if (c.prisonYears <= 0) {
        c.inPrison = false;
        events.push({ type: 'system', text: '🔓 You were released from prison. Time to rebuild.', emoji: '🔓' });
        c.addLog('Released from prison.', '🔓');
        c.happiness += 15;
      } else {
        events.push({ type: 'system', text: `⛓️ Year ${c.prisonYears} remaining in prison. Time crawls.`, emoji: '⛓️' });
        c.happiness -= 10;
        c.health -= 5;
        c.clampStats();
        return events;
      }
    }

    // Natural age-based health changes
    if (c.age < 18) {
      // Youth: strong natural recovery
      c.health += randInt(2, 5);
    } else if (c.age < 30) {
      // Young adult: still recovering well
      c.health += randInt(0, 2);
    } else if (c.age < 45) {
      // Prime: roughly stable
      c.health += randInt(-1, 1);
    } else if (c.age >= 45 && c.age < 65) {
      // Middle age: slight decline
      c.health -= randInt(0, 1);
      c.looks  -= (c.age >= 40) ? randInt(0, 1) : 0;
    } else {
      // Senior: steady decline
      c.health -= randInt(1, 3);
      c.looks  -= 1;
    }

    // Salary income
    if (c.salary > 0 && c.job) {
      const annualPay = c.salary;
      const tax = annualPay * 0.28;
      c.wealth += Math.floor(annualPay - tax);
      events.push({ type: 'income', text: `💰 Earned $${Math.floor(annualPay - tax).toLocaleString()} after taxes from ${c.job}.`, emoji: '💰' });
    }

    // AI prediction
    let prediction = { goodEventChance: 0.3, badEventChance: 0.3, healthTrend: 0, wealthTrend: 0 };
    if (this.brain && this.brain.trained) {
      prediction = this.brain.predict({
        happiness: c.happiness, health: c.health, wealth: c.wealth,
        smarts: c.smarts, looks: c.looks, age: c.age,
        karma: c.karma, recklessness: c.recklessness
      });
    }

    // Apply AI health/wealth trend (subtle)
    c.health += prediction.healthTrend * 0.3;
    c.wealth += prediction.wealthTrend * 0.1;

    // Life stage events — merge base + extra pools
    const stage = c.getLifeStage();
    const baseKey = (stage === 'infant' || stage === 'child') ? 'childhood'
                  : stage === 'teen'   ? 'teen'
                  : stage === 'senior' ? 'senior'
                  : 'adult';
    const base  = RANDOM_EVENTS[baseKey] || [];
    const extra = RANDOM_EVENTS[baseKey + '_extra'] || [];
    const stageEvents = [...base, ...extra];

    // Roll for events based on AI prediction
    const numEvents = randInt(1, 2);
    const usedIds = new Set();

    for (let i = 0; i < numEvents; i++) {
      const event = rand(stageEvents.filter(e => !usedIds.has(e.id)));
      if (!event) continue;
      usedIds.add(event.id);

      if (event.choices) {
        // Queue choice event
        this.pendingEvents.push(event);
        events.push({ type: 'choice_queued', event });
      } else {
        c.applyEffect(event.effect);
        c.addLog(event.text, event.emoji);
        events.push({ type: 'random', text: `${event.emoji} ${event.text}`, effect: event.effect, emoji: event.emoji });
      }
    }

    // Milestone check
    const milestone = LIFE_MILESTONES.find(m => m.age === c.age);
    if (milestone) {
      events.push({ type: 'milestone', text: `${milestone.emoji} MILESTONE: ${milestone.text}`, emoji: milestone.emoji });
      c.addLog(`[Milestone] ${milestone.text}`, milestone.emoji);
      c.happiness += 5;
    }

    // Relationship event (adults)
    if (c.age >= 16 && c.relationship !== 'married' && Math.random() < 0.25) {
      const relEvent = rand(RELATIONSHIP_EVENTS);
      c.applyEffect(relEvent.effect);
      events.push({ type: 'relationship', text: `💕 ${relEvent.text}`, emoji: '💕' });
      c.addLog(relEvent.text, '💕');
    }

    // Education milestones
    if (c.age === 18 && c.education === 'none') {
      c.education = 'high-school';
      c.smarts += 5;
      events.push({ type: 'education', text: '🎓 You graduated high school!', emoji: '🎓' });
      c.addLog('Graduated high school.', '🎓');
    }

    // Death check
    const deathResult = this._checkDeath(c, prediction);
    if (deathResult) {
      c.alive = false;
      c.deathAge = c.age;
      c.deathCause = deathResult.cause;
      this.gameOver = true;
      events.push({ type: 'death', text: deathResult.text, emoji: '💀' });
    }

    c.clampStats();
    return events;
  }

  _checkDeath(c, prediction) {
    // Base death chance — very low, rises meaningfully after 55
    let deathChance = 0.001;

    // Age curve: starts at 65, meaningful at 80, steep after 90
    if (c.age >= 65) deathChance += (c.age - 64) * 0.003;
    if (c.age >= 80) deathChance += (c.age - 79) * 0.016;
    if (c.age >= 90) deathChance += (c.age - 89) * 0.035;

    // Low health penalty — much reduced (health recovers naturally in youth)
    if (c.health < 10) deathChance += 0.06;
    else if (c.health < 25) deathChance += 0.015;

    // AI bad event prediction raises death slightly
    if (prediction.badEventChance > 0.75) deathChance += 0.008;

    // Recklessness — low weight
    deathChance += c.recklessness * 0.00015;

    // Karma helps a little
    deathChance -= c.karma * 0.00008;

    // Addictions — meaningful but not instant
    if (c.addictions.length > 0) deathChance += 0.012 * c.addictions.length;

    // Cap at 80% per year
    deathChance = Math.max(0, Math.min(0.80, deathChance));

    if (Math.random() < Math.max(0, deathChance)) {
      let cause, causeText;
      if (c.age >= 70) {
        cause = 'old_age';
        causeText = rand(DEATH_CAUSES.old_age);
      } else if (c.health < 20) {
        cause = 'illness';
        causeText = rand(DEATH_CAUSES.illness);
      } else if (c.recklessness > 70) {
        cause = 'reckless';
        causeText = rand(DEATH_CAUSES.reckless);
      } else if (c.addictions.length > 0) {
        cause = 'overdose';
        causeText = rand(DEATH_CAUSES.overdose);
      } else {
        cause = 'accident';
        causeText = rand(DEATH_CAUSES.accident);
      }

      return {
        cause,
        text: `💀 YOU DIED at age ${c.age} from ${causeText}.`
      };
    }
    return null;
  }

  resolveChoice(event, choiceIndex) {
    const c = this.character;
    const choiceData = CHOICES[event.choiceKey];
    if (!choiceData || !choiceData.options[choiceIndex]) return null;

    const choice = choiceData.options[choiceIndex];
    let outcomeText = choice.outcome;
    let effect = choice.effect;

    if (choice.failChance && Math.random() < choice.failChance) {
      outcomeText = choice.failOutcome || choice.outcome;
      effect = choice.failEffect || choice.effect;
    }

    c.applyEffect(effect);
    c.addLog(`${event.text} → ${outcomeText}`, event.emoji);
    return { outcomeText, effect };
  }

  doActivity(activityKey) {
    const c = this.character;
    const activity = ACTIVITIES[activityKey];
    if (!activity) return null;

    const result = { text: activity.text, emoji: activity.emoji };

    if (activity.winEffect && activity.loseEffect) {
      if (Math.random() < (activity.winChance || 0.5)) {
        c.applyEffect(activity.winEffect);
        result.effect = activity.winEffect;
        result.outcome = 'win';
      } else {
        c.applyEffect(activity.loseEffect);
        result.effect = activity.loseEffect;
        result.outcome = 'lose';
      }
    } else {
      c.applyEffect(activity.effect);
      result.effect = activity.effect;
    }

    // Crime has extra consequences
    if (activityKey === 'crime' && result.outcome !== 'win') {
      if (Math.random() < 0.5) {
        c.inPrison = true;
        c.prisonYears = randInt(1, 5);
        result.prisonText = `🚔 You were caught! Sentenced to ${c.prisonYears} years in prison!`;
        c.addLog(`Went to prison for ${c.prisonYears} years.`, '🚔');
      }
    }

    // Drug addiction chance
    if (activityKey === 'party' && c.recklessness > 60 && Math.random() < 0.15) {
      if (!c.addictions.includes('alcohol')) {
        c.addictions.push('alcohol');
        result.addictionText = '🍺 You developed an alcohol dependency.';
      }
    }

    c.addLog(activity.text, activity.emoji);
    return result;
  }

  applyForJob(jobIndex) {
    const c = this.character;
    const job = JOBS[jobIndex];
    if (!job) return { success: false, reason: 'Invalid job.' };
    if (c.age < job.minAge) return { success: false, reason: `You must be at least ${job.minAge} to apply.` };
    if (c.smarts < job.smartsReq) return { success: false, reason: `You need ${job.smartsReq} smarts to qualify.` };

    const successChance = 0.4 + (c.smarts - job.smartsReq) / 200 + c.looks / 300;
    if (Math.random() < successChance) {
      c.job = job.title;
      c.salary = job.salary + randInt(-5000, 5000);
      c.addLog(`Got hired as ${job.title}. Salary: $${c.salary.toLocaleString()}`, '💼');
      return { success: true, job };
    } else {
      c.happiness -= 5;
      return { success: false, reason: 'The application was rejected.' };
    }
  }

  buyHouse() {
    const c = this.character;
    const price = randInt(150000, 500000);
    if (c.wealth < price * 0.2) return { success: false, reason: `You need $${Math.floor(price * 0.2).toLocaleString()} for a down payment.` };
    c.wealth -= Math.floor(price * 0.2);
    c.hasHouse = true;
    c.addLog(`Bought a house for $${price.toLocaleString()}.`, '🏠');
    return { success: true, price };
  }

  buyCar() {
    const c = this.character;
    const price = randInt(15000, 60000);
    if (c.wealth < price) return { success: false, reason: `You need $${price.toLocaleString()} to buy a car.` };
    c.wealth -= price;
    c.hasCar = true;
    c.addLog(`Bought a car for $${price.toLocaleString()}.`, '🚗' );
    return { success: true, price };
  }

  enrollCollege() {
    const c = this.character;
    if (c.age < 18) return { success: false, reason: 'You need to finish high school first.' };
    if (c.education !== 'high-school') return { success: false, reason: 'You need a high school diploma.' };
    if (c.smarts < 50) return { success: false, reason: `You need at least 50 smarts. You have ${c.smarts}.` };
    if (c.wealth < 20000) return { success: false, reason: 'You need $20,000 for tuition.' };
    c.wealth -= 20000;
    c.smarts += 15;
    c.education = 'college';
    c.addLog('Graduated college with a degree!', '🎓');
    return { success: true };
  }

  getRelationshipStatus() {
    return this.character.relationship || 'single';
  }

  startDating() {
    const c = this.character;
    if (c.relationship) return { success: false, reason: 'You are already in a relationship.' };
    const namePool = c.gender === 'male' ? NAMES.first_female : NAMES.first_male;
    c.partnerName = `${rand(namePool)} ${rand(NAMES.last)}`;
    c.relationship = 'dating';
    c.happiness += 15;
    c.addLog(`Started dating ${c.partnerName}.`, '💕');
    return { success: true, partnerName: c.partnerName };
  }

  propose() {
    const c = this.character;
    if (c.relationship !== 'dating') return { success: false, reason: 'You need to be dating someone first.' };
    const acceptChance = 0.5 + c.happiness / 200 + c.wealth / 500000;
    if (Math.random() < acceptChance) {
      c.relationship = 'married';
      c.happiness += 25;
      c.wealth -= 5000; // ring
      c.addLog(`Married ${c.partnerName}!`, '💍');
      return { success: true };
    } else {
      c.relationship = null;
      c.partnerName = null;
      c.happiness -= 30;
      c.addLog('Got rejected. The engagement is off.', '💔');
      return { success: false, reason: 'They said no. That hurts.' };
    }
  }

  haveChild() {
    const c = this.character;
    if (c.relationship !== 'married') return { success: false, reason: 'You should be married first... or should you?' };
    if (c.age < 18 || c.age > 50) return { success: false, reason: 'The timing doesn\'t seem right.' };
    c.children++;
    c.happiness += 20;
    c.wealth -= 15000; // child cost/year
    const childName = rand(c.gender === 'male' ? NAMES.first_female : NAMES.first_male);
    c.addLog(`Had a baby! Named them ${childName}.`, '👶');
    return { success: true, childName };
  }

  generateDeathReport() {
    const c = this.character;
    const rating = c.getLifeRating();
    let epitaph;
    if (rating >= 80) epitaph = 'A life well-lived. They will be greatly missed.';
    else if (rating >= 60) epitaph = 'A decent life, with its share of highs and lows.';
    else if (rating >= 40) epitaph = 'A turbulent journey. They tried their best.';
    else epitaph = 'A life of struggle. May they find peace now.';

    return {
      name: c.name, age: c.deathAge, cause: c.deathCause,
      netWorth: c.getNetWorth(), children: c.children,
      rating, epitaph, log: c.log
    };
  }
}

module.exports = { GameEngine, Character };
