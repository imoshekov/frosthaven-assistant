/**
 * Validates app/src/data/character-decks/*.json.
 *
 * Run before committing hand-authored card data:
 *   node validate-character-decks.js
 *
 * Exits non-zero on any error. Initiative collisions are reported, not failed —
 * they exist in the real game data. Pass --baseline to rewrite the collision
 * baseline after an intentional change.
 */
const fs = require('fs');
const path = require('path');

const DECK_DIR = path.join(__dirname, 'app', 'src', 'data', 'character-decks');
const BASELINE_FILE = path.join(__dirname, 'character-deck-collisions.baseline.json');
const ICONS_FILE = path.join(__dirname, 'app', 'src', 'icons.scss');

const EXPECTED_CARD_COUNT = 504;
const EXPECTED_CLASS_COUNT = 17;
const PACKED_INITIATIVE_CLASSES = new Set(['blinkblade']);

const ELEMENTS = new Set(['fire', 'ice', 'earth', 'air', 'light', 'dark']);
// Mirrors ElementName / EnhancementTypeName / ConditionName in character-card-types.ts.
const ENHANCEMENT_TYPES = new Set(['square', 'circle', 'diamond', 'diamond_plus', 'hex', 'any']);
const CONDITION_NAMES = new Set([
  'poison', 'wound', 'muddle', 'immobilize', 'bane', 'stun', 'disarm', 'brittle',
  'ward', 'invisible', 'strengthen', 'regenerate', 'bless', 'curse',
]);
// Mirrors CardAction['valueType'] in character-card-types.ts. `minus`/`subtract` are
// not just display now — a bonus subAction's sign comes from this field, so a typo
// here would silently apply as `add` instead of erroring.
const VALUE_TYPES = new Set(['plus', 'minus', 'add', 'subtract', 'fixed']);

const EXECUTABLE_TYPES = new Set([
  'attack', 'heal', 'condition', 'element',
  'elementBonus', 'sufferDamage', 'sufferDamageBonus', 'textBonus', 'bonus',
  'xp', 'pierce', 'shield', 'retaliate', 'ignoreArmor',
]);
const DISPLAY_TYPES = new Set([
  'text', 'summon', 'persistentTrack', 'forceBox',
  'boxFhSubActions', 'extra', 'fly', 'grant', 'special', 'trigger', 'hint',
  'damage', 'teleport', 'swing', 'spawn', 'grid', 'box',
]);

/**
 * Card actions that only annotate or describe the game — they never change a
 * creature's HP, conditions, the element pool, or the board — so the schema
 * drops them: `move`/`push`/`pull`/`jump` are positional, `range`/`target` are
 * unenforced annotations, `loot` has no in-app economy, and `specialTarget`/
 * `area` are descriptive-only. Cards must not carry them.
 */
const NON_BOARD_TYPES = new Set([
  'move', 'push', 'pull', 'jump', 'range', 'target', 'loot', 'specialTarget', 'area',
]);

/**
 * Types and fields that carry a reference to something outside the card, or that only
 * described how gloomhavensecretariat laid a card out. Card entries must be complete
 * on their own, so the extractor rewrites all of these and none may survive.
 */
const FORBIDDEN_TYPES = new Set(['custom', 'card', 'concatenation', 'concatenationSpacer']);
const FORBIDDEN_FIELDS = ['valueObject', 'noDivider'];

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

/** Packed iff > 99. Mirrors the extractor and the runtime service. */
function decodePackedInitiative(value) {
  if (typeof value !== 'number' || value <= 99) return null;
  const padded = String(value).padStart(4, '0');
  return { fast: Number(padded.slice(0, 2)), slow: Number(padded.slice(2, 4)) };
}

function iconClassesInScss() {
  if (!fs.existsSync(ICONS_FILE)) return null;
  const src = fs.readFileSync(ICONS_FILE, 'utf8');
  const found = new Set();
  for (const m of src.matchAll(/&\.([A-Za-z0-9_-]+)\s*\{/g)) found.add(m[1]);
  return found;
}

function walkActions(actions, visit, depth = 0) {
  for (const a of actions || []) {
    visit(a, depth);
    if (Array.isArray(a.subActions)) walkActions(a.subActions, visit, depth + 1);
  }
}

function main() {
  if (!fs.existsSync(DECK_DIR)) {
    console.error(`Deck directory not found: ${DECK_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DECK_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  const iconClasses = iconClassesInScss();

  // 1. class count
  if (files.length !== EXPECTED_CLASS_COUNT) {
    err(`Expected ${EXPECTED_CLASS_COUNT} deck files, found ${files.length}`);
  }

  const cardIdOwner = new Map();   // cardId -> "class #id", for global uniqueness
  const collisions = {};           // class -> level -> initiative -> [names]
  let totalCards = 0, authoredHalves = 0, totalHalves = 0;
  const perClass = [];
  const usedIconTypes = new Set();

  for (const file of files.sort()) {
    const characterClass = file.replace(/\.json$/, '');
    let deck;
    try {
      deck = JSON.parse(fs.readFileSync(path.join(DECK_DIR, file), 'utf8'));
    } catch (e) {
      err(`${file}: invalid JSON — ${e.message}`);
      continue;
    }

    if (deck.characterClass !== characterClass) {
      err(`${file}: characterClass "${deck.characterClass}" does not match filename`);
    }
    if (!Array.isArray(deck.cards)) {
      err(`${file}: missing cards array`);
      continue;
    }

    const packed = PACKED_INITIATIVE_CLASSES.has(characterClass);
    let classAuthored = 0;

    for (const card of deck.cards) {
      totalCards++;
      const where = `${characterClass} #${card.cardId} (${card.name})`;

      // 2. cardId present + globally unique
      if (typeof card.cardId !== 'number') {
        err(`${where}: cardId missing or not a number`);
      } else if (cardIdOwner.has(card.cardId)) {
        err(`cardId ${card.cardId} used by both ${cardIdOwner.get(card.cardId)} and ${where}`);
      } else {
        cardIdOwner.set(card.cardId, where);
      }

      if (typeof card.name !== 'string' || !card.name) err(`${where}: name missing`);

      // 4. level and initiative ranges
      const levelOk = card.level === 'X' ||
        (Number.isInteger(card.level) && card.level >= 1 && card.level <= 9);
      if (!levelOk) err(`${where}: level "${card.level}" is not 1..9 or "X"`);

      if (typeof card.initiative !== 'number') {
        err(`${where}: initiative missing`);
      } else if (packed) {
        // 5. blinkblade decoding
        const dec = decodePackedInitiative(card.initiative);
        if (!dec) {
          err(`${where}: expected a packed initiative (>99), got ${card.initiative}`);
        } else {
          if (!(dec.fast >= 1 && dec.fast < dec.slow && dec.slow <= 99)) {
            err(`${where}: packed ${card.initiative} decodes to ${dec.fast}/${dec.slow}, expected 1 <= fast < slow <= 99`);
          }
          if (card.initiativeFast !== dec.fast || card.initiativeSlow !== dec.slow) {
            err(`${where}: initiativeFast/Slow (${card.initiativeFast}/${card.initiativeSlow}) disagree with a fresh decode (${dec.fast}/${dec.slow})`);
          }
        }
      } else {
        if (card.initiative < 1 || card.initiative > 99) {
          err(`${where}: initiative ${card.initiative} outside 1..99`);
        }
        if (card.initiativeFast !== undefined || card.initiativeSlow !== undefined) {
          err(`${where}: only ${[...PACKED_INITIATIVE_CLASSES].join('/')} may carry initiativeFast/Slow`);
        }
      }

      // 3. both halves well-formed
      for (const halfName of ['top', 'bottom']) {
        const half = card[halfName];
        totalHalves++;
        if (!half || typeof half !== 'object') {
          err(`${where}: missing ${halfName} half`);
          continue;
        }
        if (!Array.isArray(half.actions)) {
          err(`${where} ${halfName}: actions is not an array`);
          continue;
        }
        // "Authored" is derived from the data itself, not a stored flag: a half
        // either has real action content or it doesn't.
        if (half.actions.length > 0) {
          authoredHalves++;
          classAuthored++;
        }

        // 7 + 8. action types and unresolved placeholders
        walkActions(half.actions, (a, depth) => {
          if (typeof a.type !== 'string') {
            err(`${where} ${halfName}: action with no type`);
            return;
          }
          if (FORBIDDEN_TYPES.has(a.type)) {
            err(`${where} ${halfName}: action type "${a.type}" is not self-contained — the extractor should have rewritten it`);
          } else if (NON_BOARD_TYPES.has(a.type)) {
            err(`${where} ${halfName}: action type "${a.type}" does not affect board state and must not be authored — strip it`);
          } else if (!EXECUTABLE_TYPES.has(a.type) && !DISPLAY_TYPES.has(a.type)) {
            warn(`${where} ${halfName}: unknown action type "${a.type}"`);
          }
          for (const field of FORBIDDEN_FIELDS) {
            if (a[field] !== undefined) {
              err(`${where} ${halfName}: action carries "${field}", which is not self-contained`);
            }
          }

          // Self-containment: no value or prose may reference anything off-card.
          for (const field of ['value', 'text']) {
            if (typeof a[field] === 'string' && a[field].includes('%')) {
              err(`${where} ${halfName}: unresolved reference in ${field} — ${a[field]}`);
            }
          }

          if (a.type === 'condition' && typeof a.value === 'string' && !CONDITION_NAMES.has(a.value)) {
            err(`${where} ${halfName}: unknown condition "${a.value}"`);
          }

          if (a.targetAlly !== undefined) {
            if (a.type !== 'condition' && a.type !== 'attack') {
              err(`${where} ${halfName}: targetAlly only applies to 'condition' or 'attack', not '${a.type}'`);
            }
            if (a.selfOnly) {
              err(`${where} ${halfName}: ${a.type} can't be both selfOnly and targetAlly`);
            }
          }

          // The `ignoreArmor: true` flag belongs on the attack it modifies. Anywhere
          // else it is inert — nothing reads it off a heal or a condition — so catch
          // it here rather than letting it look authored and do nothing.
          if (a.ignoreArmor !== undefined) {
            if (a.type !== 'attack') {
              err(`${where} ${halfName}: ignoreArmor only applies to 'attack', not '${a.type}'`);
            }
            if (typeof a.ignoreArmor !== 'boolean') {
              err(`${where} ${halfName}: ignoreArmor must be true or false`);
            }
            usedIconTypes.add('ignoreArmor');
          }

          // "Attack X" / "Heal X" — a value the card leaves to the player, typed into
          // the panel when the half is resolved. Only these three read it; anywhere
          // else the string coerces to 0 through actionValue and the action does
          // nothing. Pair it with a `text` subAction saying what X is, the way the
          // drifter cards do ("where X is the number of hexes you moved").
          const isManualX = typeof a.value === 'string' && a.value.trim().toUpperCase() === 'X';
          if (isManualX) {
            if (a.type !== 'attack' && a.type !== 'heal' && a.type !== 'sufferDamage') {
              err(`${where} ${halfName}: "value": "X" only applies to 'attack', 'heal' or 'sufferDamage', not '${a.type}'`);
            }
            if (a.valueType !== undefined) {
              err(`${where} ${halfName}: "value": "X" is the whole value; drop valueType`);
            }
          }

          if (a.valueType !== undefined && !VALUE_TYPES.has(a.valueType)) {
            err(`${where} ${halfName}: unknown valueType "${a.valueType}"`);
          }

          // multiTarget is `true` (open-ended) or a printed cap of 2 or more. A cap of
          // 1 is just a normal single-target action, and anything else is a typo.
          if (a.multiTarget !== undefined && typeof a.multiTarget !== 'boolean') {
            if (!Number.isInteger(a.multiTarget) || a.multiTarget < 2) {
              err(`${where} ${halfName}: multiTarget must be true or an integer >= 2, got ${JSON.stringify(a.multiTarget)}`);
            }
          }

          if (a.enhancementTypes !== undefined) {
            if (!Array.isArray(a.enhancementTypes) || a.enhancementTypes.length === 0) {
              err(`${where} ${halfName}: enhancementTypes must be a non-empty array`);
            } else {
              for (const enh of a.enhancementTypes) {
                if (!ENHANCEMENT_TYPES.has(enh)) err(`${where} ${halfName}: unknown enhancementTypes value "${enh}"`);
              }
            }
          }

          // 'condition' and 'element' are containers: the icon comes from their value
          // (e.g. .icon.wound, .icon.elem-ice), not from the type name. The two
          // sufferDamage types share the one `.icon.damage` art rather than owning a
          // class each, so neither names an icon after itself either.
          const iconExempt = new Set([
            'condition', 'element', 'elementBonus', 'sufferDamage', 'sufferDamageBonus',
            'textBonus', 'bonus', 'xp',
          ]);
          if (EXECUTABLE_TYPES.has(a.type) && !iconExempt.has(a.type)) {
            usedIconTypes.add(a.type);
          }
          if (a.type === 'condition' && typeof a.value === 'string') usedIconTypes.add(a.value);

          // Elements are named explicitly now, so every one needs a matching icon.
          if (a.type === 'element' || a.type === 'elementBonus') {
            if (!Array.isArray(a.elements) || a.elements.length === 0) {
              err(`${where} ${halfName}: ${a.type} has no elements[]`);
            } else {
              for (const el of a.elements) {
                if (!ELEMENTS.has(el)) err(`${where} ${halfName}: unknown element "${el}"`);
                else usedIconTypes.add('elem-' + el);
              }
            }
          }
          if (a.type === 'elementBonus') {
            if (a.consumeMode !== 'all' && a.consumeMode !== 'any') {
              err(`${where} ${halfName}: elementBonus needs consumeMode 'all' or 'any'`);
            }
            if (!Array.isArray(a.subActions) || a.subActions.length === 0) {
              err(`${where} ${halfName}: elementBonus grants nothing (no subActions)`);
            }
          }
          // `element` never *consumes* — `elementBonus` is the type for that — but
          // `consumeMode: 'any'` on an `element` naming several is a real, separate
          // thing: "infuse ICE or AIR" the player's choice, not "infuse both". 'all'
          // (the default, so it need not be written) infuses every one named, same
          // as always. A single-element `element` has nothing to choose between, so
          // 'any' there is a typo, not a card.
          if (a.type === 'element' && a.consumeMode !== undefined) {
            if (a.consumeMode !== 'all' && a.consumeMode !== 'any') {
              err(`${where} ${halfName}: element's consumeMode must be 'all' or 'any'`);
            } else if (a.consumeMode === 'any' && (!Array.isArray(a.elements) || a.elements.length < 2)) {
              err(`${where} ${halfName}: element needs 2+ elements for consumeMode 'any' — nothing to choose between otherwise`);
            }
          }

          // A textBonus is gated on a condition nothing in this app can compute, so
          // the printed text is the whole offer — required, not merely helpful — and
          // there is nothing to consume, so elements/consumeMode/value would be dead.
          if (a.type === 'textBonus') {
            if (typeof a.text !== 'string' || !a.text.trim()) {
              err(`${where} ${halfName}: textBonus needs non-empty text describing the condition`);
            }
            if (!Array.isArray(a.subActions) || a.subActions.length === 0) {
              err(`${where} ${halfName}: textBonus grants nothing (no subActions)`);
            }
            if (a.elements !== undefined || a.consumeMode !== undefined || a.value !== undefined) {
              err(`${where} ${halfName}: textBonus is judged by the player, not paid for — drop elements/consumeMode/value`);
            }
          }

          // A plain `bonus` has nothing to check and nothing to judge — no cost, no
          // printed condition — so every field that would carry either is dead data.
          if (a.type === 'bonus') {
            if (!Array.isArray(a.subActions) || a.subActions.length === 0) {
              err(`${where} ${halfName}: bonus grants nothing (no subActions)`);
            }
            if (a.elements !== undefined || a.consumeMode !== undefined || a.value !== undefined || a.text !== undefined) {
              err(`${where} ${halfName}: bonus is unconditional — drop elements/consumeMode/value/text`);
            }
          }

          // Both self-damage types are priced in `value`, and both draw the shared
          // damage icon. A cost of 0 is not a cost: that's an unconditional effect
          // authored as a bargain, which the panel would offer for nothing. The one
          // exception is a `sufferDamage` printed as "Suffer X" — the player supplies
          // it, so it has no fixed positive value to check here. A bonus's price stays
          // fixed regardless: "X" already errored above for `sufferDamageBonus`.
          if (a.type === 'sufferDamage' || a.type === 'sufferDamageBonus') {
            if (!(isManualX && a.type === 'sufferDamage') && !(Number(a.value) > 0)) {
              err(`${where} ${halfName}: ${a.type} needs a positive value — the HP it costs the hero`);
            }
            if (a.selfOnly !== undefined) {
              err(`${where} ${halfName}: ${a.type} is always the acting hero; drop selfOnly`);
            }
            usedIconTypes.add('damage');
          }
          if (a.type === 'sufferDamageBonus' && (!Array.isArray(a.subActions) || a.subActions.length === 0)) {
            err(`${where} ${halfName}: sufferDamageBonus grants nothing (no subActions)`);
          }
          if (a.type === 'xp' && !(Number(a.value) > 0)) {
            err(`${where} ${halfName}: xp action needs a positive value`);
          }
          if (a.type === 'summon') {
            const summon = a.summon;
            if (!summon || typeof summon.name !== 'string' || !summon.name) {
              err(`${where} ${halfName}: summon needs an inline summon.name`);
            } else {
              // A summon becomes a real figure on the board, so its printed stat line
              // has to be usable as numbers.
              for (const stat of ['health', 'attack', 'movement', 'range', 'armor', 'retaliate', 'retaliateRange', 'attackTarget']) {
                if (summon[stat] !== undefined && !Number.isFinite(Number(summon[stat]))) {
                  err(`${where} ${halfName}: summon.${stat} "${summon[stat]}" is not a number`);
                }
              }
              if (summon.count !== undefined && !(Number.isInteger(summon.count) && summon.count >= 1)) {
                err(`${where} ${halfName}: summon.count must be a whole number of 1 or more`);
              }
              if (summon.flying !== undefined && typeof summon.flying !== 'boolean') {
                err(`${where} ${halfName}: summon.flying must be a boolean`);
              }
              if (summon.immunities !== undefined) {
                if (!Array.isArray(summon.immunities)) {
                  err(`${where} ${halfName}: summon.immunities must be an array`);
                } else {
                  for (const immunity of summon.immunities) {
                    if (!CONDITION_NAMES.has(immunity)) {
                      err(`${where} ${halfName}: summon immunity "${immunity}" is not a condition name`);
                    }
                  }
                }
              }
              // Every stat the summon shows on the board needs its icon.
              if (summon.health !== undefined) usedIconTypes.add('heart');
              if (summon.attack !== undefined) usedIconTypes.add('attack');
              if (summon.movement !== undefined) usedIconTypes.add('move');
              if (summon.range !== undefined) usedIconTypes.add('range');
              if (summon.armor !== undefined) usedIconTypes.add('shield');
              if (summon.retaliate !== undefined) usedIconTypes.add('retaliate');
              if (summon.flying) usedIconTypes.add('flying');
            }
          }
          if (a.type === 'persistentTrack' && (!Array.isArray(a.slots) || a.slots.length === 0)) {
            err(`${where} ${halfName}: persistentTrack needs slots[]`);
          }
          if (a.type === 'text' && (typeof a.text !== 'string' || !a.text.trim())) {
            err(`${where} ${halfName}: text action has no text`);
          }

          // The one sanctioned outside reference: an image path under /images.
          for (const holder of [a, a.summon]) {
            if (holder && holder.image !== undefined) {
              if (typeof holder.image !== 'string' || /^[a-z]+:|^\//i.test(holder.image)) {
                err(`${where} ${halfName}: image must be a relative path under /images — got "${holder.image}"`);
              } else if (!fs.existsSync(path.join(__dirname, 'app', 'src', 'images', holder.image))) {
                err(`${where} ${halfName}: image not found in app/src/images — "${holder.image}"`);
              }
            }
          }

          if (depth > 6) warn(`${where} ${halfName}: action nesting deeper than 6`);
        });
      }

      // 6. collision tracking, per level a hero could be at
      if (typeof card.initiative === 'number' && levelOk) {
        const inits = packed
          ? [card.initiativeFast, card.initiativeSlow].filter(v => typeof v === 'number')
          : [card.initiative];
        const cardLevel = card.level === 'X' ? 1 : card.level;
        for (let heroLevel = Math.max(1, cardLevel); heroLevel <= 9; heroLevel++) {
          for (const init of inits) {
            collisions[characterClass] ??= {};
            collisions[characterClass][heroLevel] ??= {};
            (collisions[characterClass][heroLevel][init] ??= []).push(card.name);
          }
        }
      }
    }

    perClass.push({ characterClass, cards: deck.cards.length, authored: classAuthored });
  }

  // 1. total card count
  if (totalCards !== EXPECTED_CARD_COUNT) {
    err(`Expected ${EXPECTED_CARD_COUNT} cards total, found ${totalCards}`);
  }

  // 7b. every icon the data needs must exist in icons.scss
  if (iconClasses) {
    const missing = [...usedIconTypes].filter(t => !iconClasses.has(t)).sort();
    if (missing.length) {
      warn(`icons.scss has no .icon class for: ${missing.join(', ')}`);
    }
  } else {
    warn(`Could not read ${ICONS_FILE} — skipped icon coverage check`);
  }

  // Reduce collisions to counts per class/level
  const collisionCounts = {};
  for (const [cls, byLevel] of Object.entries(collisions)) {
    for (const [level, byInit] of Object.entries(byLevel)) {
      const dupes = Object.entries(byInit).filter(([, names]) => names.length > 1);
      if (dupes.length) {
        collisionCounts[cls] ??= {};
        collisionCounts[cls][level] = dupes.length;
      }
    }
  }

  // Report
  console.log('Class            Cards  Authored halves');
  for (const c of perClass) {
    console.log(`${c.characterClass.padEnd(16)} ${String(c.cards).padStart(5)}  ${c.authored}/${c.cards * 2}`);
  }
  const pct = ((authoredHalves / totalHalves) * 100).toFixed(1);
  console.log(`\nTotal: ${totalCards} cards, authored ${authoredHalves}/${totalHalves} halves (${pct}%)`);

  console.log('\nInitiative collisions after level filtering (informational):');
  const collisionClasses = Object.keys(collisionCounts).sort();
  if (!collisionClasses.length) {
    console.log('  none');
  } else {
    for (const cls of collisionClasses) {
      const byLevel = collisionCounts[cls];
      const maxAtLevel = Math.max(...Object.values(byLevel));
      console.log(`  ${cls.padEnd(14)} up to ${maxAtLevel} ambiguous initiative(s) at level ${
        Object.entries(byLevel).find(([, n]) => n === maxAtLevel)[0]}+`);
    }
  }

  // 6b. fail if collisions grew against the baseline (catches an authoring typo)
  if (process.argv.includes('--baseline')) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(collisionCounts, null, 2) + '\n');
    console.log(`\nWrote collision baseline to ${BASELINE_FILE}`);
  } else if (fs.existsSync(BASELINE_FILE)) {
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    for (const [cls, byLevel] of Object.entries(collisionCounts)) {
      for (const [level, count] of Object.entries(byLevel)) {
        const was = baseline[cls]?.[level] ?? 0;
        if (count > was) {
          err(`${cls} level ${level}: initiative collisions rose from ${was} to ${count} — likely a duplicated initiative in hand-authored data (re-run with --baseline if intended)`);
        }
      }
    }
  } else {
    warn(`No collision baseline at ${BASELINE_FILE} — run with --baseline to create one`);
  }

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  x ${e}`);
    process.exit(1);
  }
  console.log('\nOK — no errors.');
}

main();
