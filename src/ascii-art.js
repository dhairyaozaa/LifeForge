'use strict';
/**
 * LIFEFORGE — ASCII Art
 * Pixel-art style characters using consistent box-drawing + text chars.
 * Each stage is drawn on a 12-wide × 14-tall canvas.
 */

const chalk = require('chalk');

const ART = {

  // ────────────────────────────────────────────────────────────────────────────
  // CHARACTERS  (each line padded to same width for clean side-by-side layout)
  // ────────────────────────────────────────────────────────────────────────────

  baby: [
    '   _______   ',
    '  / o   o \\  ',
    ' |    v    | ',
    '  \\_______/  ',
    '   |OOOOO|   ',
    '   |OOOOO|   ',
    '  /|OOOOO|\\ ',
    ' (_)     (_) ',
  ],

  child: [
    '   _______   ',
    '  / ^   ^ \\  ',
    ' |    w    | ',
    '  \\_______/  ',
    '    __|__    ',
    '   / | | \\   ',
    '  /  | |  \\  ',
    '    /   \\    ',
    '   /     \\   ',
  ],

  teen: [
    '  ________   ',
    ' / -   - \\   ',
    '|    u    |  ',
    ' \\________/  ',
    '   _|  |_    ',
    '  / |  | \\   ',
    ' /  |  |  \\  ',
    '    |  |     ',
    '   / \\ / \\   ',
    '  /   X   \\  ',
  ],

  adult: [
    '  ________   ',
    ' / o    o \\  ',
    '|    __    | ',
    ' \\________/  ',
    '   _||||_    ',
    '  / |||| \\   ',
    ' /  ||||  \\  ',
    '/   ||||   \\ ',
    '    /  \\     ',
    '   /    \\    ',
    '  /      \\   ',
  ],

  senior: [
    '  ________   ',
    ' / @    @ \\  ',
    '|    ~~    | ',
    ' \\________/  ',
    '  __|    |__ ',
    ' /  |    |  \\',
    '/   |    |   ',
    '    |    |   ',
    '    | JJ |   ',
    '   /|    |\\  ',
    '  (_)    (_) ',
  ],

  dead: [
    '  ________   ',
    ' / X    X \\  ',
    '|    __    | ',
    ' \\________/  ',
    '    /||\\     ',
    '   / || \\    ',
    '  /  ||  \\   ',
  ],

  // ── Scenes ──────────────────────────────────────────────────────────────────

  grave: [
    '   _________  ',
    '  /         \\ ',
    ' |  R . I . P | ',
    ' |    ___    | ',
    ' |   /   \\   | ',
    ' |   \\___/   | ',
    '  \\_________/ ',
    '    |     |   ',
    '    |     |   ',
    ' ___|_____|___ ',
    '/             \\',
  ].join('\n'),

  coffin: [
    '   __________  ',
    '  /    +     \\ ',
    ' /  R.I.P.    \\',
    '/_______________\\',
    '|               |',
    '|               |',
    '|               |',
    ' \\             / ',
    '  \\___________/  ',
  ].join('\n'),

  prison: [
    ' _______________',
    '|  |  |  |  |  |',
    '|  |  |  |  |  |',
    '|  |  |  |  |  |',
    '|__|__|__|__|__|',
    '   COUNTY JAIL  ',
  ].join('\n'),

  // ── Stat bar ────────────────────────────────────────────────────────────────
  statBar(val, width = 16) {
    const n = Math.round((val / 100) * width);
    const c = val >= 80 ? chalk.hex('#7DFF7D')
            : val >= 60 ? chalk.hex('#FFD700')
            : val >= 40 ? chalk.hex('#FFB347')
            :             chalk.hex('#FF4444');
    return c('#'.repeat(Math.max(0, n))) +
           chalk.hex('#333333')('-'.repeat(Math.max(0, width - n)));
  },

  progressBar(val, max, width = 20, fill = '#', empty = '-') {
    const n = Math.round((val / max) * width);
    return fill.repeat(Math.max(0, n)) + empty.repeat(Math.max(0, width - n));
  },

  getLifeStageArt(age) {
    if (age < 4)  return ART.baby.join('\n');
    if (age < 13) return ART.child.join('\n');
    if (age < 20) return ART.teen.join('\n');
    if (age < 65) return ART.adult.join('\n');
    return ART.senior.join('\n');
  },

  // Logo
  logo: [
    '##      ## ########  ########  ########  ########  #######  ########   ######   ########',
    '##      ## ##        ##        ##        ##       ##     ## ##     ## ##    ##  ##      ',
    '##      ## ##        ##        ##        ##       ##     ## ##     ## ##        ##      ',
    '##      ## ######    ######    ######    #######  ##     ## ########  ##   #### ######  ',
    '##      ## ##        ##        ##              ## ##     ## ##   ##   ##    ##  ##      ',
    '##      ## ##        ##        ##        ##    ## ##     ## ##    ##  ##    ##  ##      ',
    '######## ## ##        ########  ########  #######   #######  ##     ##  ######   ########',
  ].join('\n'),

};

module.exports = { ART };
