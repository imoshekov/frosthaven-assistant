/**
 * Extracts effect tags from rawdata.js item descriptions and prints
 * an updated effects map (itemId -> string[]) to stdout.
 *
 * Usage: node extract-item-effects.js > item-effects.json
 */
const fs = require('fs');

const source = fs.readFileSync('./rawdata.js', 'utf8');

// Action types we want to track as filter tags (skip generic ones like attack/range/target)
const RELEVANT_ACTIONS = new Set([
    'shield', 'heal', 'move', 'push', 'pull', 'jump', 'damage'
]);

// All condition types
const CONDITION_TYPES = new Set([
    'regenerate', 'ward', 'bless', 'strengthen', 'invisible',
    'wound', 'poison', 'immobilize', 'disarm', 'muddle', 'stun', 'curse',
    'brittle', 'bane', 'impair'
]);

// Find the item descriptions locale section.
// It starts after: "items": {  followed by  "fh-1": { "1": "...", ".": "name" }
// We locate it by searching for the pattern from the English locale section (~line 89577).
const itemsSectionStart = source.indexOf('"items": {\n        "fh-1":');
if (itemsSectionStart === -1) {
    console.error('Could not find item descriptions section');
    process.exit(1);
}

// Find the closing of this items block — look for the next key at the same level
// (which will be something like '"scenarioRules":' or similar)
// We extract enough content to cover all items (fh-1 through fh-250)
const sectionText = source.slice(itemsSectionStart, itemsSectionStart + 80000);

// Extract all "fh-N": { ... } entries where the body only has string values
// (i.e. description entries, not item data entries)
const results = {};

// Match "fh-N": { body }
// Body may span multiple lines, so we use a character-by-character approach
let pos = 0;
const fhKeyRe = /"fh-(\d+)":\s*\{/g;
let m;
while ((m = fhKeyRe.exec(sectionText)) !== null) {
    const id = parseInt(m[1]);
    const bodyStart = m.index + m[0].length;

    // Find matching closing brace
    let depth = 1;
    let i = bodyStart;
    while (i < sectionText.length && depth > 0) {
        if (sectionText[i] === '{') depth++;
        else if (sectionText[i] === '}') depth--;
        i++;
    }
    const body = sectionText.slice(bodyStart, i - 1);

    // Only process if this looks like a description entry (values are strings, not objects)
    if (body.includes('"id":') || body.includes('ItemSlot') || body.includes('"slot":')) continue;

    const effects = new Set();

    // Extract %game.action.X% or %game.action.X:N%
    const actionRe = /%game\.action\.([a-zA-Z]+)(?::[^%]+)?%/g;
    let am;
    while ((am = actionRe.exec(body)) !== null) {
        const action = am[1].toLowerCase();
        if (RELEVANT_ACTIONS.has(action)) effects.add(action);
    }

    // Extract %game.condition.X%
    const condRe = /%game\.condition\.([a-zA-Z]+)(?::[^%]+)?%/g;
    let cm;
    while ((cm = condRe.exec(body)) !== null) {
        const cond = cm[1].toLowerCase();
        if (CONDITION_TYPES.has(cond)) effects.add(cond);
    }

    // Extract %game.attackmodifier.*% → tag as 'attackmodifier'
    if (/%game\.attackmodifier\.[a-zA-Z0-9]+%/.test(body)) {
        effects.add('attackmodifier');
    }

    // Extract %game.damage% in damage-DEALING context:
    //   - enemy/enemies/attacker/figures suffer %game.damage% (item inflicts)
    //   - %game.damage% N on enemies (area/trap damage)
    // Exclude: "you suffer", "ally suffers" (trigger), "at least %game.damage%", "or fewer" (threshold)
    const bodyNoSelfDamage = body
        .replace(/(?:you|your summons?|the ally).{0,60}%game\.damage%/g, '')
        .replace(/at least.{0,20}%game\.damage%/g, '')
        .replace(/%game\.damage%.{0,10}(?:or fewer)/g, '');
    if (
        /(?:enemy|enemies|figure|figures|attacker)\b.{0,120}%game\.damage%/.test(bodyNoSelfDamage) ||
        /trap.{0,40}%game\.damage%/.test(bodyNoSelfDamage) ||
        (/suffer\b.{0,60}%game\.damage%\s+\d/.test(bodyNoSelfDamage) && !/\byou\b.{0,30}suffer/.test(body))
    ) {
        effects.add('damage');
    }

    if (effects.size > 0) {
        results[id] = Array.from(effects).sort();
    }
}

console.log(JSON.stringify(results, null, 2));
