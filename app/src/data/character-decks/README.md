# Player ability card decks

One JSON file per Frosthaven character class, holding the ability cards the
**Actions** panel resolves from a player's two submitted initiatives.

These files are served as static assets (`angular.json` maps this folder to
`/data/character-decks`) and fetched lazily, one class at a time, by
[`CharacterDeckService`](../../app/services/character-deck.service.ts). They are
deliberately *not* inlined into `data-loader.service.ts`, which is already 72k lines
in the main bundle and would make hand-editing card data miserable.

---

## Rule 1: every card entry is self-contained

**A card entry must be readable and executable on its own.** Nothing in it may point
at anything outside itself:

- **No i18n keys or lookup ids.** Prose is stored literally in `text`. There is no
  `%data.custom.fh.drifter.abilities.1.1%` in this folder — the extractor resolves
  every such key to English before writing.
- **No references to other cards or shared tables.** Summon stats are inlined on the
  card that summons them; element bonuses spell out which elements they consume.
- **No layout leftovers.** The source encodes some things positionally (a run of
  `card: "slotXpFh:1"` tokens, a `concatenation` wrapper). Those are rewritten into
  explicit fields.

**The single exception is `image`** — a path relative to `app/src/images`, for a
printed detail this schema genuinely cannot express (an unusual summon token, say):

```json
{ "type": "summon", "summon": { "name": "Special", "image": "summons/fh.png" } }
```

`validate-character-decks.js` enforces all of this: it fails on any `%` left in a
`value` or `text`, on the non-self-contained types (`custom`, `card`,
`concatenation`, `concatenationSpacer`), on the fields `valueObject` and `noDivider`,
and on an `image` that is absolute or missing from `app/src/images`.

## Rule 2: experience is part of the card

XP lives in two places, and the distinction is what makes it correct in play:

| Where | Meaning | Applied |
| --- | --- | --- |
| `xp` on the **half** | The number printed in the half's corner. | Always, on execute. |
| `{ "type": "xp", "value": N }` **action** | Inline XP, e.g. from a triggered effect. | Always, unless it sits inside an `elementBonus`. |
| An `xp` action **inside an `elementBonus`** | XP you only get by taking that bonus. | Only if the player takes the bonus. |

The panel adds the hero's XP into the same state patch as the rest of the execution,
so it lands in one undo batch and updates `sessionExperience`, `totalXp` and `level`
together. `sumUnconditionalXp()` deliberately skips anything under an `elementBonus`;
`bonusXp()` reports what a specific bonus would grant.

## Rule 3: conditional element bonuses

Many cards read *"if you consume ICE, add +2 Attack"*. That is an **offer**, not an
effect, and the schema models it as one:

```json
{
  "type": "elementBonus",
  "elements": ["ice"],
  "consumeMode": "all",
  "subActions": [
    { "type": "attack", "value": 2, "valueType": "add", "small": true },
    { "type": "xp", "value": 1 }
  ]
}
```

The rules the panel implements:

1. The bonus is **offered only while its elements are active** (infused, full or
   waning). Otherwise it renders greyed with "not active" so the player can still see
   the card is capable of it.
2. Taking it is **the player's choice** — a checkbox, never automatic.
3. If taken, its `subActions` apply (attack bonuses fold into the attack value before
   the modifier is drawn, XP is awarded) **and the elements are consumed**, set back
   to `none`.
4. `consumeMode: "all"` consumes every element in `elements`. `consumeMode: "any"`
   consumes exactly one, and the panel asks the player which.

An `element` action, by contrast, **infuses**: `{ "type": "element", "elements": ["ice"] }`.
Never use `element` to mean consumption — the validator rejects an `element` carrying
`consumeMode`. On execution the panel consumes before infusing, so a half that
consumes one element and infuses another behaves correctly.

## Rule 4: multi-attack halves are independent strikes, in order

Some halves attack more than once — e.g. drifter #7 "Vile Assault": *Attack 2, Poison;
Attack 2, Wound*. Author each strike as its own top-level `attack` action, in printed
order, with whatever modifies *that* strike nested in its own `subActions`:

```json
{
  "actions": [
    {
      "type": "attack",
      "value": 2,
      "subActions": [{ "type": "condition", "value": "poison", "small": true }]
    },
    {
      "type": "attack",
      "value": 2,
      "subActions": [{ "type": "condition", "value": "wound", "small": true }]
    }
  ]
}
```

The execution panel resolves a multi-attack half one strike at a time: each gets its
own target, its own drawn modifier, and its own damage instance, exactly as if it were
resolved through Execute on its own. Only the *last* strike finalizes the half — that's
when XP, shield/retaliate, elements, summons and the spent-half flag apply, folded into
one Undo batch same as any other half. `pierce`, `condition` and `elementBonus` actions
nested under one attack apply only while that attack is the one being resolved — they
never leak onto the other attack in the pair. An action that sits beside the attacks
rather than nested under one of them (a self-buff a single-attack half grants
regardless, say) still applies every time, same as always.

Don't put two attacks under one `subActions` tree, and don't put an unrelated attack's
condition on the wrong one — `collectAttacks()` in
[`character-card-types.ts`](../../app/types/character-card-types.ts) walks the
half looking for independent `attack` actions (skipping over `elementBonus`, whose own
nested `attack` is a bonus to add to the base value, not a separate strike — see Rule 3
and `takenBonusAttack`).

## Rule 5: `multiTarget` is one attack hitting an unknown number of targets

Distinct from Rule 4: a multi-*attack* half is several separate strikes, each with its
own modifier draw. A multi-*target* attack is a **single** strike that hits more than
one creature — e.g. "Attack 2 to all adjacent enemies". The app has no board, so it
can't count who's adjacent or in range; instead the half offers every hostile creature
and the DM taps on however many the printed range actually covers:

```json
{
  "actions": [{ "type": "attack", "value": 2, "multiTarget": true }]
}
```

Set `multiTarget: true` directly on the `attack` action. The execution panel then:

1. Lets the player select any number of targets (a toggle strip, not a single pick).
2. Draws **one** attack modifier for the whole strike — real Frosthaven rules apply one
   modifier card to every target a multi-target attack hits, not one draw each.
3. Still computes each target's damage independently: the shared modifier and pierce
   apply to all of them, but each target's own armour and conditions (poison, brittle,
   ward) tell their damage apart, same as `DamageService.compute()` always does.
4. Applies every target's damage and conditions in the same patch batch the half's XP,
   shield/retaliate and spent-flag land in — one Undo reverses all of it.

"Custom…" (the manual attack-modal override) isn't offered for a `multiTarget` attack —
it and `customOverride` only ever carry one target's worth of values. Don't set
`multiTarget` on a `heal`; healing always targets one ally, chosen the normal way. Don't
combine it with a fixed printed target count either — the "Not part of the schema"
list further down already excludes `target`/`specialTarget`, and `multiTarget` doesn't
reintroduce a count, it just says "more than one, DM's call."

## Rule 6: summons are real figures, created only by cards

A `summon` action doesn't just print a token on the card — executing that half brings a
**real figure onto the board**. A summon is friendly like a hero but statted and
managed like a monster: it has the full monster stat line, takes damage, can be healed
and conditioned, and can be killed.

```json
{
  "type": "summon",
  "summon": {
    "name": "Polar Cat",
    "health": 6,
    "attack": 2,
    "movement": 3,
    "range": 1,
    "armor": 1,
    "retaliate": 2,
    "retaliateRange": 2,
    "attackTarget": 2,
    "flying": false,
    "immunities": ["poison", "wound"],
    "count": 1,
    "abilities": [{ "type": "pierce", "value": 3 }],
    "notes": ["Discard after its third attack."],
    "image": "summons/fh.png"
  }
}
```

Only `name` is required; leave out whatever the token doesn't print.

| Field | Becomes |
| --- | --- |
| `health` | starting and max HP (minimum 1) |
| `attack`, `movement`, `range` | the stat line on its row |
| `armor` | shield |
| `retaliate`, `retaliateRange` | retaliate, with its range |
| `attackTarget` | how many figures its attack hits (defaults to 1) |
| `flying` | the flying icon |
| `immunities` | conditions it cannot receive — `ConditionName` values only |
| `count` | how many figures to spawn, each with its own standee number |
| `abilities` | printed abilities; `condition` ones show as icons on its row, exactly like a monster's; a `pierce` one is stored as a fixed stat and prefills the Attack modal when this summon is picked as the attacker |
| `notes` | literal prose the fields above can't carry |
| `image` | token art, relative to `app/src/images` (the schema's one outside reference) |

Rules the app enforces:

1. **Only a card action creates a summon.** There is no manual add-summon anywhere —
   `AppContext.summonFromCard()` is the single entry point, called by the execution
   panel when a half carrying a summon action is executed.
2. **It shares its owner's initiative**, and acts immediately before them in the turn
   order. It has no initiative of its own to show or edit; ordering derives the value
   from the owner every time it's read (`effectiveInitiative()`), so it follows the
   hero automatically each round instead of holding a stale copy.
3. **It is not a hero.** `isHero()` excludes summons deliberately, so a summon never
   submits initiative, never blocks the reveal, holds no cards, and earns no XP.
4. **Several copies stay distinct.** `count: 2` spawns two figures numbered 1 and 2,
   continuing on from any of that summon the owner already has out. Two different
   heroes summoning the same creature are grouped and ordered separately.
5. **Its attack is available like a hero's.** The generic Attack modal's attacker strip
   (opened from the target's own row) lists summons alongside heroes, with their token
   art. Picking a summon there fills in its printed `attack` and any `pierce` from
   `abilities` automatically, so the DM doesn't have to re-read the token — and any
   damage it lands is credited to its **owner's** stats, since the summon has no
   stats of its own to record against.

### Gotchas when hand-authoring a summon

- Frosthaven sometimes prints the quantity in the name (the source has
  `"2 White Owls"` with `count: 1`). Prefer `{ "name": "White Owl", "count": 2 }` so
  the app spawns two tellable-apart figures.
- Don't put `{ "type": "fly" }` in `abilities` — set `"flying": true`, which is a real
  stat rather than a rendered icon. The importer already promotes it for you.

---

## Current state

All 504 cards have correct `cardId`, `name`, `level` and `initiative`. Most **action
bodies are still empty**, because the upstream source has not written them:

| Deck | Halves with data |
| --- | --- |
| `drifter` | 62 / 62 |
| `snowflake` | 60 / 60 |
| `banner-spear` | 8 / 58 |
| the other 14 classes | 0 |

**130 of 1008 halves (12.9%)** have real action data — a half either has an
`actions` array with content, or it's empty; there is no separate flag to track that,
since it's fully derived from the data (`hasCardData()` in
[`character-card-types.ts`](../../app/types/character-card-types.ts)). An empty half
is not a dead end: the panel still shows the real card name, level and initiative,
and offers a manual attack-value box plus the **Default Attack 2** / **Default Move 2**
actions. Turn tracking works for all 17 classes today; filling in a half's `actions`
only improves how much the panel can apply automatically.

## Where this data came from

These 504 cards were originally pulled from gloomhavensecretariat by a one-shot
extractor script — resolving prose to literal English, decoding Blinkblade's packed
initiatives, and rewriting the source's implicit encodings into the explicit forms
below. That script has since been removed from the repo: it was a single-use import
tool, not a sync, and re-running it against the source would have discarded every
hand-authored edit made since. From here on the JSON files in this folder *are* the
data; edit them directly. (If a full re-import from gloomhavensecretariat is ever
genuinely needed again, it can be rebuilt from this README's format description and
the extraction logic described above — but that should be a deliberate, rare thing,
not routine tooling.)

## Validating

```bash
node validate-character-decks.js   # run before committing
```

Checks all 504 cards are present, `cardId` is globally unique, levels and initiatives
are in range, Blinkblade decodes consistently, every action `type` is known and
self-contained, every `elementBonus` names real elements and grants something, every
`summon` has an inline name, every icon the data needs exists in `icons.scss`, and no
reference survives anywhere. It also reports initiative collisions per class and level
(informational — the real game data has them, see the Gotchas below).

## Authoring a card half

Fill in `actions` — that alone is what makes a half count as authored:

```json
{
  "cardId": 10,
  "name": "Deadly Shot",
  "level": 1,
  "initiative": 32,
  "top": {
    "xp": 1,
    "actions": [
      {
        "type": "attack",
        "value": 1,
        "subActions": [
          { "type": "condition", "value": "poison", "small": true },
          {
            "type": "elementBonus",
            "elements": ["ice"],
            "consumeMode": "all",
            "subActions": [{ "type": "attack", "value": 2, "valueType": "add", "small": true }]
          }
        ]
      }
    ]
  },
  "bottom": {
    "actions": [{ "type": "heal", "value": 2 }]
  }
}
```

Only actions that change game state belong in `actions` — the printed range, target count,
movement, push/pull distance, and loot are flavor the DM reads off the physical card, not
data this app models. See "Not part of the schema" below.

### Action fields

| Field | Meaning |
| --- | --- |
| `type` | See the tables below. |
| `value` | Number or string; always read through `actionValue()`, which coerces. For `condition`, one of the condition names below. |
| `valueType` | `add`/`plus` renders `+N`, `minus`/`subtract` renders `−N`. |
| `subActions` | Modifiers *on this action* — an inflicted condition, a conditional bonus. Renders nested. |
| `small` | The card convention for a modifier riding on its parent. Renders smaller. |
| `text` | Literal prose. The only place prose lives — never a key. |
| `elements` | `element`: what is infused. `elementBonus`: what is consumed. One or more of the six elements below. |
| `consumeMode` | `elementBonus` only: `all` or `any`. |
| `enhancementTypes` | The enhancement-sticker slots printed on the action. Not applied by this app; kept because it's printed. One or more of the enhancement types below. |
| `multiTarget` | `attack` only: `true` lets the player pick more than one target for this strike. See Rule 5. |
| `summon` | `summon` only: the figure's inline stat line — see Rule 6 for every field. |
| `slots` | `persistentTrack` only: one entry per printed slot, with its `xp`. |
| `image` | Relative to `app/src/images`. The one sanctioned outside reference. |

### Fields with a fixed set of values

Every one of these is a closed set, exported as a named type from
[`character-card-types.ts`](../../app/types/character-card-types.ts) and checked by
the validator — an unlisted value is a hand-authoring error, not a new option.

| Field | Type | Values |
| --- | --- | --- |
| `elements` (each entry) | `ElementName` | `fire`, `ice`, `earth`, `air`, `light`, `dark` |
| `enhancementTypes` (each entry) | `EnhancementTypeName` | `square`, `circle`, `diamond`, `diamond_plus`, `hex`, `any` |
| `condition` action's `value` | `ConditionName` | `poison`, `wound`, `muddle`, `immobilize`, `bane`, `stun`, `disarm`, `brittle`, `ward`, `invisible`, `strengthen`, `regenerate`, plus `bless`/`curse` (printed as conditions but never applied — see the gotchas below) |
| `consumeMode` | — | `all`, `any` |
| `valueType` | — | `plus`, `minus`, `add`, `subtract`, `fixed` |
| card `level` | — | `1`–`9`, or `"X"` |
| `CharacterDeck.characterClass` | `CharacterClassName` | the 17 Frosthaven classes: `astral`, `banner-spear`, `blinkblade`, `boneshaper`, `coral`, `deathwalker`, `drifter`, `drill`, `fist`, `geminate`, `kelp`, `meteor`, `prism`, `shackles`, `shards`, `snowflake`, `trap` |

### Half-level fields

`xp`, `lost`, `persistent`, `round`, `loss` — rendered as badges on the tile.

### Executed action types

The panel changes game state for these:

| Type | Effect |
| --- | --- |
| `attack` | Feeds the damage pipeline against the chosen target, via the modifier row. More than one `attack` in a half is resolved as independent strikes, one at a time — see Rule 4. `multiTarget: true` instead lets one strike hit several targets with a single draw — see Rule 5. |
| `heal` | Raises the target's HP, capped at `maxHp`. Targets allies. |
| `condition` | Applied to the target, skipping immunities. |
| `element` | Infuses every element in `elements`. |
| `elementBonus` | Offered when available; consumes `elements` if the player takes it. |
| `xp` | Experience for the acting hero. |
| `shield`, `retaliate` | Applied to the acting hero for the round. |
| `summon` | Brings a real figure onto the board, on the owner's initiative. See Rule 6. |
| `pierce` | Read to annotate the attack's armor penetration, not applied on its own. |
| `ignoreArmor` | Nested under an `attack` the same way `pierce`/`condition` are. Skips the target's shield entirely for that strike — stronger than any amount of pierce, and combines freely with whatever else the attack does (poison, wound, …). No `value`. |

### Rendered but never applied

`persistentTrack`, `text`, and the layout wrappers `forceBox`, `boxFhSubActions`, `extra`.

### Not part of the schema

`move`, `push`, `pull`, `jump`, `range`, `target`, `loot`, `specialTarget`, `area` are
never authored. None of them change a creature's HP, conditions, the element pool, or
the board — this app has no board model for movement, and range/target/loot are
unenforced flavor the DM reads off the physical card. The extractor drops them on
sight, and the validator errors if one appears in the data. Don't hand-author them
back in — if a card's *only* content on a half is one of these, leave `actions: []`
and let the panel fall back to the unauthored manual-entry state.

### Gotchas

- **`bless` and `curse`** appear as `condition` values but are attack-modifier cards,
  not creature states, so they have no `CreatureConditions` entry. They render as
  icons and are skipped on execution — don't expect them to apply.
- **Blinkblade** packs both identities into one initiative (`2050` = fast 20 / slow 50).
  Keep `initiative` as printed; `initiativeFast`/`initiativeSlow` are derived and the
  validator checks they agree with a fresh decode.
- **Level `"X"`** cards are available from level 1.
- **Initiative is not unique.** 8 of 17 decks collide, so the panel offers a chooser.
  Don't "fix" a collision that exists on the real cards.
- **`persistentTrack` slot counts are a best reading** of the source's positional
  tokens, and the track is display-only — the app never advances the token. Check it
  against the printed card when you hand-author.
- New action types need an icon class in [`icons.scss`](../../../icons.scss); the
  validator warns when one is missing.

## Attribution

Card data derived from [GloomhavenSecretariat](https://github.com/Lurkars/gloomhavensecretariat)
(source AGPL-3.0; game data and assets from the Creator Pack by Isaac Childres,
CC BY-NC-SA 4.0). Gloomhaven and Frosthaven and all related properties are owned by
Cephalofair Games. Consistent with the monster, scenario and item data and the card
frame art already vendored in this repo.
