// Game Events Database

const NAMES = {
  first_male: ['Liam', 'Noah', 'Oliver', 'Elijah', 'Aiden', 'Lucas', 'Mason', 'Ethan', 'James', 'Logan',
    'Arjun', 'Rohan', 'Dev', 'Kabir', 'Ravi', 'Carlos', 'Diego', 'Miguel', 'Marco', 'Ivan'],
  first_female: ['Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
    'Priya', 'Ananya', 'Neha', 'Aisha', 'Zara', 'Sofia', 'Lucia', 'Elena', 'Anna', 'Mei'],
  last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore',
    'Patel', 'Shah', 'Kumar', 'Sharma', 'Singh', 'Rodriguez', 'Martinez', 'Chen', 'Kim', 'Tanaka'],
};

const COUNTRIES = ['USA', 'India', 'Brazil', 'UK', 'Japan', 'France', 'Germany', 'Canada', 'Australia', 'Mexico'];

const CITIES = {
  USA: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
  India: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'],
  Brazil: ['São Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza'],
  UK: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Sapporo'],
  France: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  Mexico: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana'],
};

const JOBS = [
  { title: 'Intern', salary: 15000, smartsReq: 20, minAge: 16 },
  { title: 'Fast Food Worker', salary: 22000, smartsReq: 0, minAge: 15 },
  { title: 'Retail Associate', salary: 28000, smartsReq: 10, minAge: 16 },
  { title: 'Office Clerk', salary: 35000, smartsReq: 40, minAge: 18 },
  { title: 'Nurse', salary: 65000, smartsReq: 60, minAge: 22 },
  { title: 'Teacher', salary: 55000, smartsReq: 65, minAge: 22 },
  { title: 'Engineer', salary: 95000, smartsReq: 75, minAge: 22 },
  { title: 'Lawyer', salary: 120000, smartsReq: 80, minAge: 25 },
  { title: 'Doctor', salary: 180000, smartsReq: 85, minAge: 26 },
  { title: 'CEO', salary: 350000, smartsReq: 90, minAge: 30 },
  { title: 'Professional Athlete', salary: 2000000, smartsReq: 20, minAge: 18 },
  { title: 'Actor', salary: 500000, smartsReq: 30, minAge: 18 },
  { title: 'Musician', salary: 80000, smartsReq: 25, minAge: 16 },
  { title: 'Programmer', salary: 110000, smartsReq: 78, minAge: 20 },
  { title: 'Criminal', salary: 40000, smartsReq: 10, minAge: 16 },
];

const RANDOM_EVENTS = {
  childhood: [
    { id: 'fell_tree', text: 'You fell out of a tree!', effect: { health: -5, happiness: -3 }, emoji: '🌳' },
    { id: 'won_spelling', text: 'You won the school spelling bee!', effect: { happiness: 15, smarts: 5 }, emoji: '🏆' },
    { id: 'new_friend', text: 'You made a best friend at school.', effect: { happiness: 15 }, emoji: '👫' },
    { id: 'bullied', text: 'You got bullied by older kids.', effect: { happiness: -10, health: -3 }, emoji: '😢' },
    { id: 'got_pet', text: 'Your parents got you a puppy!', effect: { happiness: 20 }, emoji: '🐶' },
    { id: 'parents_fight', text: 'Your parents had a big fight.', effect: { happiness: -10, karma: -5 }, emoji: '💔' },
    { id: 'read_books', text: 'You spent the summer reading books.', effect: { smarts: 8 }, emoji: '📚' },
    { id: 'sports_injury', text: 'Sports injury. Ouch.', effect: { health: -4 }, emoji: '⚽' },
    { id: 'honor_roll', text: 'You made the honor roll!', effect: { smarts: 6, happiness: 8 }, emoji: '⭐' },
    { id: 'food_poisoning', text: 'Bad cafeteria food hit you hard.', effect: { health: -6 }, emoji: '🤢' },
  ],
  teen: [
    { id: 'first_crush', text: 'You developed your first crush.', effect: { happiness: 10 }, emoji: '❤️' },
    { id: 'heartbreak', text: 'Your crush rejected you publicly.', effect: { happiness: -20 }, emoji: '💔' },
    { id: 'party_caught', text: 'Your parents caught you sneaking out.', effect: { happiness: -5, karma: -10 }, emoji: '🚔' },
    { id: 'viral_video', text: 'A video of you went viral online.', effect: { happiness: 15, looks: 5 }, emoji: '📱' },
    { id: 'drugs_offered', text: 'Someone offered you drugs at a party.', choices: true, choiceKey: 'drugs', emoji: '💊' },
    { id: 'scholarship', text: 'You won a small academic scholarship!', effect: { wealth: 5000, happiness: 15 }, emoji: '🎓' },
    { id: 'car_accident', text: 'You were in a minor car accident.', effect: { health: -7, wealth: -2000 }, emoji: '🚗' },
    { id: 'new_talent', text: 'You discovered a hidden musical talent!', effect: { happiness: 20, smarts: 5 }, emoji: '🎵' },
    { id: 'arrested_minor', text: 'You got arrested for vandalism.', effect: { karma: -20, happiness: -15 }, emoji: '🚔' },
    { id: 'ace_exam', text: 'You aced a major exam.', effect: { smarts: 8, happiness: 10 }, emoji: '📝' },
  ],
  adult: [
    { id: 'job_offer', text: 'You got an unexpected job offer!', effect: { happiness: 15 }, choices: true, choiceKey: 'job_offer', emoji: '💼' },
    { id: 'got_robbed', text: 'You were robbed walking home.', effect: { wealth: -500, happiness: -20, health: -5 }, emoji: '💸' },
    { id: 'lottery_small', text: 'You won $500 in the lottery!', effect: { wealth: 500, happiness: 10 }, emoji: '🎰' },
    { id: 'health_scare', text: 'A health scare sent you to the hospital.', effect: { health: -10, wealth: -2000, happiness: -10 }, emoji: '🏥' },
    { id: 'investment', text: 'A friend told you about a hot investment.', choices: true, choiceKey: 'investment', emoji: '📈' },
    { id: 'divorce', text: 'Your relationship hit a rough patch.', effect: { happiness: -25, wealth: -10000 }, emoji: '💔' },
    { id: 'got_promoted', text: 'You earned a promotion at work!', effect: { happiness: 20, wealth: 15000 }, emoji: '⬆️' },
    { id: 'inherited_money', text: 'A distant relative left you money.', effect: { wealth: 25000, happiness: 10 }, emoji: '💰' },
    { id: 'sued', text: 'Someone filed a lawsuit against you!', effect: { wealth: -20000, happiness: -20 }, emoji: '⚖️' },
    { id: 'midlife_crisis', text: 'You\'re having a midlife crisis.', choices: true, choiceKey: 'midlife', emoji: '🏎️' },
    { id: 'met_celebrity', text: 'You met a famous celebrity!', effect: { happiness: 15 }, emoji: '🌟' },
    { id: 'natural_disaster', text: 'A natural disaster struck your area.', effect: { health: -5, wealth: -3000, happiness: -8 }, emoji: '🌊' },
  ],
  senior: [
    { id: 'grandkid', text: 'You became a grandparent!', effect: { happiness: 25 }, emoji: '👶' },
    { id: 'health_decline', text: 'Your health is declining with age.', effect: { health: -7 }, emoji: '🏥' },
    { id: 'wisdom', text: 'People seek your wisdom and guidance.', effect: { happiness: 15, karma: 10 }, emoji: '🧙' },
    { id: 'retirement', text: 'You comfortably retired.', effect: { happiness: 20 }, emoji: '🏖️' },
    { id: 'scammed', text: 'You were scammed online.', effect: { wealth: -5000, happiness: -20 }, emoji: '💻' },
    { id: 'wrote_memoir', text: 'You started writing your memoir.', effect: { happiness: 15, smarts: 5 }, emoji: '📖' },
    { id: 'travel', text: 'You traveled to a place you always dreamed of.', effect: { happiness: 25 }, emoji: '✈️' },
    { id: 'pet_died', text: 'Your beloved pet passed away.', effect: { happiness: -20 }, emoji: '🐾' },
    { id: 'old_friend', text: 'You reconnected with a childhood friend.', effect: { happiness: 20 }, emoji: '👋' },
    { id: 'health_scare2', text: 'A serious health scare hospitalized you.', effect: { health: -12, wealth: -5000 }, emoji: '💊' },
  ],

  // ── Extended childhood events ──────────────────────────────────────────────
  childhood_extra: [
    { id: 'birthday_party', text: 'Your birthday party was the best one on the street.', effect: { happiness: 15 }, emoji: '🎂' },
    { id: 'learned_swim', text: 'You learned to swim this summer.', effect: { health: 5, happiness: 10 }, emoji: '🏊' },
    { id: 'lost_tooth', text: 'You lost your first tooth and put it under the pillow.', effect: { happiness: 8 }, emoji: '🦷' },
    { id: 'bike_accident', text: 'You fell off your bike. Knees heal.', effect: { health: -3, happiness: -5 }, emoji: '🚲' },
    { id: 'science_fair', text: 'Your science fair project won second place!', effect: { smarts: 6, happiness: 12 }, emoji: '🔬' },
    { id: 'imaginary_friend', text: 'You had an imaginary friend nobody else could see.', effect: { happiness: 10 }, emoji: '👻' },
    { id: 'caught_stealing', text: 'You were caught stealing from the corner shop.', effect: { karma: -15, happiness: -10 }, emoji: '🍬' },
    { id: 'rainy_day', text: 'A rainy week kept you inside reading books.', effect: { smarts: 5 }, emoji: '📚' },
  ],
  // ── Extended teen events ──────────────────────────────────────────────────
  teen_extra: [
    { id: 'first_job_teen', text: 'Your first part-time job paid minimum wage. It was humbling.', effect: { wealth: 500, smarts: 3 }, emoji: '💼' },
    { id: 'prom_night', text: 'Prom night was not what the movies promised. Better, in some ways.', effect: { happiness: 10 }, emoji: '🕺' },
    { id: 'sport_team', text: 'Making the varsity team changed how you carried yourself.', effect: { health: 8, happiness: 15, looks: 5 }, emoji: '🏅' },
    { id: 'online_game', text: 'You spent a summer deep in an online game. No regrets.', effect: { happiness: 8, smarts: 3 }, emoji: '🎮' },
    { id: 'fender_bender', text: 'You dented the car in the driveway. The conversation that followed was long.', effect: { happiness: -10, wealth: -300 }, emoji: '🚗' },
    { id: 'fake_id', text: 'The fake ID worked once and then did not.', effect: { karma: -8, recklessness: 8 }, emoji: '🪪' },
    { id: 'college_app', text: 'College application season was the most stressful month of your life so far.', effect: { happiness: -10, smarts: 5 }, emoji: '📝' },
    { id: 'first_concert', text: 'Your first concert was absurdly loud and completely perfect.', effect: { happiness: 18 }, emoji: '🎵' },
  ],
  // ── Extended adult events ──────────────────────────────────────────────────
  adult_extra: [
    { id: 'startup_idea', text: 'A startup idea kept you up at night. Exciting. Probably nothing.', effect: { happiness: 8, smarts: 5 }, emoji: '💡' },
    { id: 'tax_return', text: 'A bigger-than-expected tax return arrived.', effect: { wealth: 1200, happiness: 10 }, emoji: '💵' },
    { id: 'identity_theft', text: 'Someone used your credit card number fraudulently.', effect: { wealth: -800, happiness: -15 }, emoji: '💳' },
    { id: 'mentor_found', text: 'A mentor took you seriously before you took yourself seriously.', effect: { smarts: 8, happiness: 10, karma: 5 }, emoji: '🧑‍🏫' },
    { id: 'moved_city', text: 'You moved to a new city. Everything felt possible.', effect: { happiness: 15, wealth: -3000 }, emoji: '🏙️' },
    { id: 'viral_post', text: 'Something you posted online went mildly viral. Complicated feelings.', effect: { happiness: 12 }, emoji: '📱' },
    { id: 'car_totaled', text: 'Your car was totaled. Not your fault. Still your problem.', effect: { wealth: -8000, happiness: -20 }, emoji: '🚗' },
    { id: 'side_income', text: 'A side hustle paid out more than you expected this quarter.', effect: { wealth: 4000, happiness: 8 }, emoji: '💰' },
    { id: 'therapy_start', text: 'You started therapy. The first session felt strange. The tenth did not.', effect: { happiness: 10, karma: 8 }, emoji: '🛋️' },
    { id: 'house_repair', text: 'The roof needed fixing. The roof always needs fixing.', effect: { wealth: -5000 }, emoji: '🏠' },
    { id: 'promoted_skip', text: 'You were promoted, skipping an entire tier. It caused some awkwardness.', effect: { wealth: 20000, happiness: 15, karma: -3 }, emoji: '⬆️' },
    { id: 'fraud_victim', text: 'A sophisticated scam caught you off guard.', effect: { wealth: -3000, happiness: -18, karma: 5 }, emoji: '⚠️' },
  ],
  // ── Extended senior events ─────────────────────────────────────────────────
  senior_extra: [
    { id: 'memoir_published', text: 'Your short memoir was published locally. People actually read it.', effect: { happiness: 20, smarts: 3 }, emoji: '📖' },
    { id: 'senior_moment', text: 'You forgot where you put something important for three days.', effect: { happiness: -5 }, emoji: '🔑' },
    { id: 'old_friend_visits', text: 'A friend from forty years ago visited. You talked until midnight.', effect: { happiness: 22 }, emoji: '👋' },
    { id: 'bucket_list', text: 'You crossed something off the bucket list you swore you would never write.', effect: { happiness: 20 }, emoji: '✅' },
    { id: 'fall_injury', text: 'A fall caused an injury that healed slowly and left a lesson.', effect: { health: -10, happiness: -10 }, emoji: '🤕' },
    { id: 'digital_scam', text: 'An online scam got past your guard.', effect: { wealth: -2000, happiness: -15 }, emoji: '💻' },
    { id: 'great_grandchild', text: 'A great-grandchild was born. Four generations alive at once.', effect: { happiness: 25 }, emoji: '👶' },
    { id: 'legacy_gift', text: 'You gave a significant gift to someone who needed it more than you.', effect: { karma: 20, happiness: 15, wealth: -10000 }, emoji: '🎁' },
  ],
};

const CHOICES = {
  drugs: {
    prompt: 'What do you do?',
    options: [
      { text: 'Try them', effect: { happiness: 15, health: -20, karma: -10, recklessness: 15 }, outcome: 'You tried them. The high was intense but the consequences lasting.' },
      { text: 'Politely decline', effect: { karma: 5, happiness: -5 }, outcome: 'You declined. Some called you boring, but you kept your head clear.' },
      { text: 'Leave immediately', effect: { karma: 10 }, outcome: 'You left the party. Better safe than sorry.' }
    ]
  },
  investment: {
    prompt: 'What do you do with the investment tip?',
    options: [
      { text: 'Invest $10,000', effect: { wealth: 35000, happiness: 25 }, failEffect: { wealth: -10000, happiness: -30 }, failChance: 0.4, outcome: 'Big gamble...', failOutcome: 'The investment collapsed. You lost everything you put in.' },
      { text: 'Invest $1,000 cautiously', effect: { wealth: 3000, happiness: 10 }, failEffect: { wealth: -1000, happiness: -10 }, failChance: 0.35, outcome: 'Modest gains.' },
      { text: 'Skip it', effect: { karma: 5 }, outcome: 'You played it safe. Smart move, maybe.' }
    ]
  },
  job_offer: {
    prompt: 'A rival company offers you a much better salary. What do you do?',
    options: [
      { text: 'Take the new job', effect: { wealth: 30000, happiness: 15, karma: -5 }, outcome: 'You jumped ship. Higher pay, but burned some bridges.' },
      { text: 'Use it to negotiate a raise', effect: { wealth: 15000, happiness: 10 }, failEffect: { happiness: -10 }, failChance: 0.3, outcome: 'Bold move!', failOutcome: 'Your bluff failed. The boss called it. Awkward.' },
      { text: 'Decline, stay loyal', effect: { karma: 15, happiness: 5 }, outcome: 'You stayed. Loyalty has its own rewards.' }
    ]
  },
  midlife: {
    prompt: 'Your midlife crisis hits hard. What\'s your outlet?',
    options: [
      { text: 'Buy a sports car', effect: { happiness: 20, wealth: -40000 }, outcome: 'Vroom! Feels amazing. Bank account disagrees.' },
      { text: 'Start a new hobby', effect: { happiness: 15, smarts: 5 }, outcome: 'Pottery, skydiving, or parkour — whatever it is, it helps.' },
      { text: 'See a therapist', effect: { happiness: 10, karma: 10, wealth: -2000 }, outcome: 'Talking helped more than you expected.' },
      { text: 'Ignore it and work harder', effect: { happiness: -5, wealth: 10000 }, outcome: 'You buried the feelings in work. Classic.' }
    ]
  }
};

const ACTIVITIES = {
  meditate: { text: 'You meditated for an hour.', effect: { happiness: 8, health: 3 }, emoji: '🧘' },
  exercise: { text: 'You hit the gym hard.', effect: { health: 12, looks: 5, happiness: 5 }, emoji: '💪' },
  study: { text: 'You studied for hours.', effect: { smarts: 8, happiness: -3 }, emoji: '📚' },
  party: { text: 'You partied all night.', effect: { happiness: 15, health: -8, recklessness: 5 }, emoji: '🎉' },
  work_harder: { text: 'You put in overtime at work.', effect: { wealth: 2000, happiness: -5 }, emoji: '💼' },
  volunteer: { text: 'You volunteered at a shelter.', effect: { karma: 15, happiness: 10 }, emoji: '❤️' },
  gamble: { text: 'You hit the casino.', winEffect: { wealth: 5000, happiness: 20 }, loseEffect: { wealth: -3000, happiness: -15 }, winChance: 0.4, emoji: '🎰' },
  crime: { text: 'You committed a petty crime.', winEffect: { wealth: 2000, karma: -20 }, loseEffect: { wealth: -5000, happiness: -30, karma: -30 }, winChance: 0.5, emoji: '🔪' },
  travel: { text: 'You took a vacation abroad.', effect: { happiness: 20, wealth: -3000 }, emoji: '✈️' },
  diet: { text: 'You started a strict diet.', effect: { health: 8, looks: 5, happiness: -5 }, emoji: '🥗' },
};

const DEATH_CAUSES = {
  old_age: ['natural causes', 'peacefully in sleep', 'surrounded by loved ones', 'after a long illness'],
  accident: ['a car accident', 'a workplace accident', 'a freak accident', 'a hiking mishap'],
  illness: ['heart disease', 'cancer', 'complications from illness', 'a sudden medical emergency'],
  crime: ['a violent altercation', 'in circumstances related to crime', 'a tragic street encounter'],
  overdose: ['a drug overdose', 'substance abuse complications'],
  reckless: ['an extreme sports mishap', 'a reckless dare gone wrong', 'skydiving without proper training'],
};

const RELATIONSHIP_EVENTS = [
  { text: 'You matched with someone on a dating app.', effect: { happiness: 10 } },
  { text: 'You went on an awkward first date.', effect: { happiness: -5 } },
  { text: 'You went on a wonderful date!', effect: { happiness: 15 } },
  { text: 'Your partner surprised you with flowers.', effect: { happiness: 20 } },
  { text: 'You and your partner had a big argument.', effect: { happiness: -15 } },
  { text: 'You caught your partner flirting with someone.', effect: { happiness: -25 } },
  { text: 'You and your partner took a romantic trip.', effect: { happiness: 25, wealth: -2000 } },
];

const LIFE_MILESTONES = [
  { age: 5, text: 'You started kindergarten!', emoji: '🎒' },
  { age: 10, text: 'You made your first real best friend.', emoji: '👫' },
  { age: 13, text: 'You became a teenager. Everything changed.', emoji: '😤' },
  { age: 16, text: 'You got your driver\'s license... after 3 attempts.', emoji: '🚗' },
  { age: 18, text: 'You turned 18. Legal adult. The world is yours.', emoji: '🎉' },
  { age: 21, text: 'You turned 21. Your first legal drink. Cheers!', emoji: '🍺' },
  { age: 30, text: 'You hit 30. Quarter-life crisis? Try this on.', emoji: '😱' },
  { age: 40, text: 'The big 4-0. You\'re in your prime... right?', emoji: '🎂' },
  { age: 50, text: 'Half a century old. The wisdom is real now.', emoji: '🧠' },
  { age: 65, text: 'Retirement age. All those years of work...', emoji: '🏖️' },
  { age: 80, text: 'You\'re 80! That\'s remarkable.', emoji: '🎖️' },
  { age: 100, text: 'You\'re a CENTENARIAN! Incredible!', emoji: '👑' },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

module.exports = { NAMES, COUNTRIES, CITIES, JOBS, RANDOM_EVENTS, CHOICES, ACTIVITIES, DEATH_CAUSES, RELATIONSHIP_EVENTS, LIFE_MILESTONES, rand, randInt };
