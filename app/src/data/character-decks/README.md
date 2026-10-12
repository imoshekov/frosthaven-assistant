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
| `{ "type": "xp", "value": N }` **action** | Inline XP, e.g. from a triggered effect. | Always, unless it sits inside a conditional bonus. |
| An `xp` action **inside a conditional bonus** | XP you only get by taking that bonus. | Only if the player takes the bonus. |

The panel adds the hero's XP into the same state patch as the rest of the execution,
so it lands in one undo batch and updates `sessionExperience`, `totalXp` and `level`
together. `sumUnconditionalXp()` deliberately skips anything under a conditional bonus
(`elementBonus`, `sufferDamageBonus`, `textBonus` or `bonus` — see Rules 3, 7, 9 and 10);
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
Never use `element` to mean consumption — `elementBonus` is that. On execution the
panel consumes before infusing, so a half that consumes one element and infuses
another behaves correctly.

Naming more than one element on an `element` action infuses all of them by default —
the same "all" `consumeMode` already means for `elementBonus` needs no writing out.
"Infuse ICE **or** AIR" instead is `consumeMode: "any"`, and the panel offers the same
kind of picker `elementBonus`'s "any" does, except there is no cost to check first:
infusing isn't gated on anything being available, so the picker always shows, and
Execute is withheld until the player has actually picked one — an unresolved "any"
infuses nothing, never a silent guess:

```json
{ "type": "element", "elements": ["ice", "air"], "consumeMode": "any" }
```

`consumeMode: "any"` on an `element` naming only one element is a typo, not a card —
there's nothing to choose between, and the validator rejects it.

Elements are not the only currency a bonus can be bought with — see Rule 7 for the
same bargain priced in the hero's own HP.

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

Each `attack` here is a **fresh, independent action**, so the second one *may* strike
the same enemy the first one just hit — that's the normal case for "Vile Assault"
above, both aimed at one foe. The picked target even survives from one attack to the
next so re-aiming isn't busywork. This is the opposite of Rule 5's `multiTarget`, where
every strike belongs to the *same* attack action and so may never repeat a target — see
the comparison table there for which of the two a given card wants.

Don't put two attacks under one `subActions` tree, and don't put an unrelated attack's
condition on the wrong one — `collectAttacks()` in
[`character-card-types.ts`](../../app/types/character-card-types.ts) walks the
half looking for independent `attack` actions (skipping over `elementBonus`, whose own
nested `attack` is a bonus to add to the base value, not a separate strike — see Rule 3
and `takenBonusAttack`).

## Rule 5: `multiTarget` is one attack action hitting several targets

Distinct from Rule 4: a multi-*attack* half is several separate attack actions. A
multi-*target* attack is **one** attack action aimed at more than one creature — e.g.
"Attack 2 to all adjacent enemies". Set `multiTarget` directly on the `attack` action,
either open-ended or with a printed cap:

```json
{
  "actions": [{ "type": "attack", "value": 2, "multiTarget": true }]
}
```

`true` means **however many apply** — "all adjacent enemies", "every enemy in range".
The app has no board, so it can't count who's adjacent; the half offers every hostile
creature and the DM taps on however many the printed range actually covers.

A **number** is the cap the card prints — "Attack 3, target 2" / "attack up to 2
enemies":

```json
{
  "actions": [{ "type": "attack", "value": 3, "multiTarget": 2 }]
}
```

The panel then stops offering targets once that many have been hit, and the label
counts down ("up to 2 — 1 left"). Use an integer of 2 or more; `1` is just a normal
single-target attack, and the validator rejects it.

Either way, the execution panel:

1. Resolves it **one target at a time**, each with its own modifier draw. That is the
   rule: *"Each targeted figure is attacked separately, drawing a modifier card for each
   one."* Press Execute per target; "Done" ends the attack.
2. Refuses to hit the same figure twice — a struck target drops out of the strip for the
   rest of that attack action, and comes back for the next one.
3. Computes each target's damage independently: its own shield, poison, ward and brittle
   apply to its own strike, and the per-attack +/- adjustment carries across all of them
   because it belongs to the attack rather than to the strike.
4. Applies each strike as its own patch batch, so each is separately visible in the log;
   the half's XP, shield/retaliate and spent-flag land with the final one, and the tile's
   Undo reverses the whole half at once.

A `multiTarget` half with **no** attack — "Muddle all adjacent enemies", or "Heal 2 to
all adjacent allies" — has no modifier to draw and so is applied to every selected
target at once, from a toggle strip. Works the same way on `heal` as it does on
`condition`: each selected ally is healed independently, capped at their own `maxHp`. A
cap works there too: `multiTarget: 2` stops the player selecting a third (deselecting
still works, so targets can be swapped).

### Choosing between Rule 4 and Rule 5

The two look alike on the table but differ on **whether one enemy can be hit twice**:

| The card says | Author it as | Same enemy twice? |
| --- | --- | --- |
| "Attack 3, target 2" — up to 2 enemies | one `attack`, `"multiTarget": 2` | **No.** A struck target drops out of the strip for the rest of that attack action. |
| "Attack 2. Attack 2." — two strikes | two `attack` actions (Rule 4) | **Yes.** Each is a fresh action; the picked target even carries over, so re-hitting is the default. |
| "Attack 2 to all adjacent enemies" | one `attack`, `"multiTarget": true` | **No**, and no cap either — the DM taps whoever is in range. |

```json
// (a) one attack, up to 2 different enemies — 2 modifier draws, no repeats
{ "actions": [{ "type": "attack", "value": 3, "multiTarget": 2 }] }

// (b) two attacks — 2 modifier draws, may both land on the same enemy
{ "actions": [{ "type": "attack", "value": 2 }, { "type": "attack", "value": 2 }] }
```

The two combine: two independent `multiTarget` attacks in a row each get their own
no-repeat set, so the second may re-strike whoever the first already hit — see
`doubleSweep` in `player-card-execution-panel.multitarget.spec.ts`.

"Custom…" (the manual attack-modal override) isn't offered for a `multiTarget` attack —
it and `customOverride` only ever carry one target's worth of values. And `multiTarget:
N` is the *only* way to write a target count — the "Not part of the schema" list
further down still excludes `target`/`specialTarget`, which were descriptive
annotations rather than something the panel enforces.

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

## Rule 7: a card can charge its own player HP

Some cards are paid for in blood: *"suffer 1 damage"*. There are two shapes, and which
one you author depends on a single question — **can the player say no?**

### Mandatory: `sufferDamage`

A cost the half charges whenever it is executed. `value` is the HP:

```json
{
  "actions": [
    { "type": "attack", "value": 3 },
    { "type": "sufferDamage", "value": 2 }
  ]
}
```

The acting hero loses that HP on Execute. It is always the hero, so — unlike `heal` and
`condition` — it needs no `selfOnly`, and the validator rejects one: there is no other
figure it could mean. Nest it under an `attack` if the card prints it as part of that
strike, or leave it beside the attacks if the half charges it regardless; either way it
is charged **once per half**, at the same moment XP, shield and a `selfOnly` heal are —
never once per strike of a multi-attack or `multiTarget` half.

Self-damage is not an attack, and the panel treats it accordingly: **no modifier is
drawn for it, and shield, ward and brittle do not reduce it.** Those answer an attack,
not a price the card charges its own player. The hero floors at 0 HP rather than dying —
exhaustion is board state this app does not model, the same call `retaliate` has always
made here.

### Optional: `sufferDamageBonus`

Rule 3's bargain with a different currency: *"suffer 1 damage: +3 Attack"*. `value` is
what it costs, `subActions` is what it grants — exactly the `elementBonus` shape, minus
`elements`/`consumeMode`:

```json
{
  "type": "attack",
  "value": 2,
  "subActions": [{
    "type": "sufferDamageBonus",
    "value": 1,
    "subActions": [
      { "type": "attack", "value": 3, "valueType": "add", "small": true },
      { "type": "xp", "value": 1 }
    ]
  }]
}
```

Everything Rule 3 says about an `elementBonus` holds here too, because the panel puts
both in one list and one checkbox flow:

1. It is **an offer, never automatic** — its attack, XP and conditions stay locked away
   from every "what does this half do" scan until the player ticks it.
2. It is **offered only while the cost can be paid**: the hero must have *more* HP than
   it costs, not merely as much. Paying down to exactly 0 is exhaustion, not a bargain,
   so the row greys out with "not enough HP" rather than leaving a hero standing at 0.
3. Taking it charges the HP on execution, alongside any mandatory `sufferDamage` on the
   same half.

Both kinds are recorded on the half's execution as `selfDamageSuffered`, so **Undo gives
the HP back** — its own share only, leaving alone whatever else hurt or healed the hero
in between.

> Don't reach for `sufferDamage` to model a self-inflicted **condition**. "Poison
> yourself" is `{ "type": "condition", "value": "poison", "selfOnly": true }`; this rule
> is for cards that take HP directly.

## Rule 8: "Attack X" is a value the player supplies

Some cards print a value the card itself can't know — *"Attack X, where X is the number
of hexes you moved"*, *"Heal X, where X is twice the number of tokens looted"*. The app
has no board and no loot counter, so it cannot derive X. Write the literal string `"X"`
and let the player type it when the half is resolved:

```json
{
  "actions": [{
    "type": "attack",
    "value": "X",
    "subActions": [
      { "type": "text", "text": "where X is the number of hexes you moved.", "small": true }
    ]
  }]
}
```

Always pair it with a `text` subAction saying what X is — that prose is the only thing
telling the player what to count, and Rule 1 means it has to be on the card itself. The
validator **warns** for an `"X"` with no `text` mentioning X anywhere under it; a
handful of trap and shackles halves are still missing theirs, waiting on someone with
the printed card to hand. It is a warning rather than an error only for that reason —
promote it to an error in `validate-character-decks.js` once they are written. The
validator does **reject** `{0}`-style placeholders left over from the source's icon
templating, since the panel prints them literally.

The panel gives that strike a number box instead of a printed value, tagged `X`. What is
typed then behaves as an ordinary attack value in every respect: the modifier card
multiplies it, the target's shield is subtracted from it, `pierce`/`ignoreArmor` apply,
and the +/- row stacks on top. `"X"` works on `attack`, `heal` and `sufferDamage` only —
anywhere else `actionValue()` coerces it to 0 and the action would silently do nothing,
so the validator rejects it there.

A `sufferDamage` reads its own box the same way — "Suffer X, where X is the number of
enemies that suffered damage with this action" (shackles' "Penance") — except a
`sufferDamageBonus` can't take `"X"` at all: an optional bonus has to be offered at a
known price, not a number the player fills in after deciding whether to take it.

In a multi-attack half each strike keeps its own box, so a variable strike can sit
beside a fixed one:

```json
{
  "actions": [
    { "type": "attack", "value": "X" },
    { "type": "attack", "value": 2 }
  ]
}
```

**An entered 0 is a real attack, not an absent one.** It still takes a target, draws a
modifier, provokes the target's retaliate and lands whatever conditions ride on it — it
simply deals no damage. That is why the panel asks "is this resolving an attack?"
(`isResolvingAttack`) rather than "is its value above 0?" everywhere it matters. Leaving
the box empty is the same as typing 0.

Don't add `valueType` to an `"X"` — the string is the whole value, and a `+X` is not
something any card prints.

## Rule 9: a bonus the player judges rather than pays for

Rule 3 and Rule 7 both gate a bonus on something the app *can* check — elements active,
HP to spare. Some cards gate one on a condition the app has no state for at all:
*"Add +3 Attack and gain 1 XP if your current HP is less than half your maximum"*,
*"if you are the only hero adjacent to the target"*. There's no board, no live party
count, nothing to query — so `textBonus` hands the check to the player instead of
computing it:

```json
{
  "type": "textBonus",
  "text": "if your current hit point value is less than half (rounded up) your maximum hit point value",
  "subActions": [
    { "type": "attack", "value": 3, "valueType": "add", "small": true },
    { "type": "xp", "value": 1 }
  ]
}
```

It renders and behaves exactly like an `elementBonus`/`sufferDamageBonus` — a checkbox
offer, `subActions` locked away until taken, never applied on its own — with two
differences:

1. **`text` replaces the cost.** There is nothing to consume, so no `elements` or
   `consumeMode`; there is nothing to pay, so no `value`. The validator rejects all
   three on a `textBonus`, and requires non-empty `text` — that prose is the entire
   offer, so Rule 1 means it has to say the whole condition, not just gesture at it.
2. **It is always offered.** `isBonusAvailable()` never greys it out with "not active"
   or "not enough HP" — the checkbox itself means *"this is true right now,"* not *"I
   choose this."* The app cannot verify the player's HP fraction any more than it can
   verify who's adjacent to whom, so it doesn't try; checking the box is the same act
   of trust the game already asks of a DM-run table.

Reach for `textBonus` only once you've confirmed the condition genuinely isn't
computable from data this app tracks. A hero's `hp`/`maxHp` are real fields — "Down to
the Dirt" above still uses `textBonus` because the point isn't whether the *engine*
could check it, but that this schema's conditional-bonus mechanism was built to hand
one lever (a checkbox) to the player for exactly this shape of card, rather than
growing a second, computed path for some conditions and not others. If a future card's
condition is cheap to compute and always right, that's a case for extending the panel,
not for reaching past `textBonus`.

**Nested under a `text` action**, the same mechanism gates a bonus on "did you actually
do the optional thing this half describes" — a maneuver the card only narrates, with a
consequence if you take it. "You may perform a certain maneuver. If you use it, infuse
AIR":

```json
{
  "type": "text",
  "text": "You may perform a certain maneuver.",
  "subActions": [
    {
      "type": "textBonus",
      "text": "if you use it",
      "subActions": [
        { "type": "element", "elements": ["air"] }
      ]
    }
  ]
}
```

`text` renders prose only and applies nothing by itself (see "Rendered but never
applied" below) — the `element` only fires because it sits inside the `textBonus`, not
because it sits inside the `text`. `collectConditionalBonuses` recurses through a
`text` action looking for exactly this, so the checkbox still surfaces in the panel's
Bonuses list even though the card tile itself only prints the sentence above it, not
the nested subActions — unlike `attack`/`heal`, which render their subActions inline,
`text` doesn't.

## Rule 10: a bonus with nothing to check at all

Some cards offer a trade that's neither paid for (Rules 3/7) nor gated on a printed
condition to judge (Rule 9) — just a free choice, always available: meteor #224 "Cloud
of Ash" prints *"Shield 2. You may give up 1 shield to infuse Earth and gain 1 XP."*
There's nothing to consume (no element needs to already be active — that's what would
make it an `elementBonus`) and nothing to read off the board and judge (that's what
`textBonus` is for). It's simply "take this, or don't":

```json
{
  "type": "shield",
  "value": 2,
  "subActions": [
    {
      "type": "bonus",
      "subActions": [
        { "type": "shield", "value": 1, "valueType": "subtract", "small": true },
        { "type": "element", "elements": ["earth"], "small": true },
        { "type": "xp", "value": 1 }
      ]
    }
  ]
}
```

Renders and behaves exactly like the other three conditional bonuses — a checkbox,
`subActions` locked away until taken — with one difference: **it carries no cost field
at all.** No `text` (nothing to judge), no `elements`/`consumeMode` (nothing to
consume), no `value` (nothing to pay). The validator rejects all four on a `bonus`, and
`isBonusAvailable()` always returns true for it — there's nothing that could ever grey
it out.

**Don't reach for this to mean "a nested action of the same type, valued negative."**
`{ "type": "shield", "value": 2, "subActions": [{ "type": "shield", "value": 1,
"valueType": "subtract" }, ...] }` with no `bonus`/`elementBonus`/`textBonus` wrapper is
not a bonus at all as far as the panel is concerned — a same-type nested action isn't
one of the four things `collectConditionalBonuses` looks for, so its `-1` is silently
never applied while whatever rides beside it (an `element`, an `xp`) fires
unconditionally, every time, with no way to decline it. That was a real, repeated
authoring bug across several classes — always wrap the optional side of the trade in
`bonus` (or `elementBonus`/`textBonus`, whichever actually matches the card's cost).

---

## Current state

All 504 cards have correct `cardId`, `name`, `level` and `initiative`. Around two
thirds of the **action bodies are still empty**, because the upstream source has not
written them. `node validate-character-decks.js` prints the live per-deck count; the
table below is a snapshot:

| Deck | Halves with data |
| --- | --- |
| `drifter` | 61 / 62 |
| `astral` | 57 / 60 |
| `snowflake` | 54 / 60 |
| `shackles` | 47 / 58 |
| `prism` | 43 / 60 |
| `trap` | 34 / 56 |
| `banner-spear` | 14 / 58 |
| `boneshaper` | 10 / 62 |
| `deathwalker` | 2 / 60 |
| the other 8 classes | 0 |

**322 of 1008 halves (31.9%)** have real action data — a half either has an
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
| `value` | Number or string; always read through `actionValue()`, which coerces. For `condition`, one of the condition names below. For `sufferDamage`/`sufferDamageBonus`, the HP it costs the hero — see Rule 7. The literal `"X"` on an `attack`/`heal`/`sufferDamage` means the player supplies it at execution time — see Rule 8. |
| `valueType` | On a bonus's own `subActions` (Rule 3/7/9/10), this is the sign, not just the display: `add`/`plus` (or no `valueType` at all) *adds* that much to the value it's nested under, `minus`/`subtract` *removes* it — "if you use it, remove 1 shield" is `{ "type": "shield", "value": 1, "valueType": "subtract" }`. The printed number is always a plain magnitude; `valueType` alone carries the direction. |
| `subActions` | Modifiers *on this action* — an inflicted condition, a conditional bonus. On an `elementBonus`/`sufferDamageBonus`/`textBonus`/`bonus`, what taking it grants. Renders nested. |
| `small` | The card convention for a modifier riding on its parent. Renders smaller. |
| `text` | Literal prose. The only place prose lives — never a key. On a `textBonus`, the printed condition itself — required there. See Rule 9. |
| `elements` | `element`: what is infused. `elementBonus`: what is consumed. One or more of the six elements below. |
| `consumeMode` | `elementBonus`: `all` or `any`, which element(s) it consumes. `element`: same values, which it infuses — `any` needs 2+ `elements`. See Rule 3. |
| `enhancementTypes` | The enhancement-sticker slots printed on the action. Not applied by this app; kept because it's printed. One or more of the enhancement types below. |
| `multiTarget` | More than one target for this action: `true` for however many apply, or an integer ≥ 2 for a printed cap ("up to 2 enemies"). See Rule 5. |
| `selfOnly` | `heal`/`condition` only: applies to the acting hero instead of a picked target. No target selection is needed for it. The `sufferDamage` types are always the hero and must not carry it. |
| `targetAlly` | `condition` or `attack` only: a picked (not self-inflicted) effect lands on an ally/summon instead of an enemy — scoped to that one `attack` in a multi-attack half. Mutually exclusive with `selfOnly`. See below. |
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
| `attack` | Feeds the damage pipeline against the chosen target, via the modifier row. More than one `attack` in a half is resolved as independent strikes, one at a time — see Rule 4. `multiTarget: true` resolves one attack against several targets, one draw each — see Rule 5. |
| `heal` | Raises the target's HP, capped at `maxHp`. Targets allies. `selfOnly: true` heals the acting hero instead — no target picked for it. |
| `condition` | Applied to the target, skipping immunities. `selfOnly: true` applies it to the acting hero instead — no target picked for it. |
| `element` | Infuses every element in `elements` — or, with `consumeMode: "any"`, only whichever one the player picks. See Rule 3. |
| `elementBonus` | Offered when its elements are active; consumes them if the player takes it. See Rule 3. |
| `sufferDamage` | HP the acting hero loses for playing the half. Mandatory, charged once per half, reduced by nothing. See Rule 7. `"value": "X"` lets the player supply it — see Rule 8. |
| `sufferDamageBonus` | The same bargain as `elementBonus`, bought with `value` HP instead of elements. Offered only while the hero has more HP than it costs. See Rule 7. |
| `textBonus` | The same offer as `elementBonus`, gated on a printed condition this app can't compute instead of a cost it can. Always offered; the player's checkbox is their own judgment call. See Rule 9. |
| `bonus` | The same offer with nothing to check at all — no cost, no condition to judge. Always offered. See Rule 10. |
| `xp` | Experience for the acting hero. |
| `shield`, `retaliate` | Applied to the acting hero for the round. Either one nested under a bonus's `subActions` adds to (or, with `valueType: 'subtract'`, removes from) the half's printed value once the bonus is taken — shackles #317 "Reprisal" pays Air for `retaliate +1`. See the `valueType` row above. |
| `summon` | Brings a real figure onto the board, on the owner's initiative. See Rule 6. |
| `pierce` | Read to annotate the attack's armor penetration, not applied on its own. |
| `ignoreArmor` | `"ignoreArmor": true` on the `attack` (there is also an older subAction spelling). Skips the target's shield entirely for that strike — stronger than any amount of pierce, and combines freely with whatever else the attack does (wound, conditions, `multiTarget`, …). No `value`. |

**`pierce`** — nested under the `attack` it belongs to, same as `condition`. "Attack 3, Pierce 2":

```json
{
  "actions": [{
    "type": "attack", "value": 3,
    "subActions": [{ "type": "pierce", "value": 2 }]
  }]
}
```

**`ignoreArmor`** — unlike `pierce`, this one is a **flag on the attack**, not a nested
subAction. It carries no `value` and belongs to exactly one strike, so it is written the
way `multiTarget` and `targetAlly` are. "Attack 2, ignoring the target's shield
entirely":

```json
{
  "actions": [{ "type": "attack", "value": 2, "ignoreArmor": true }]
}
```

It is per-strike: in a multi-attack half (Rule 4) only the attack carrying the flag
ignores shields, and a sibling attack without it takes armor normally.

Two consequences worth knowing, both because this app treats an `ignoreArmor` attack as
**direct damage** rather than an ordinary strike:

- **no attack modifier is drawn for it** — Execute is not gated on a draw (see
  `needsModifier`);
- **poison's +1 does not apply to it**, since that raises the *attack value* the
  modifier deck would have multiplied.

An older spelling nests it as a subAction instead, and still works — the two are
equivalent, and `{ "type": "ignoreArmor" }` is what a handful of already-authored cards
use:

```json
{
  "actions": [{
    "type": "attack", "value": 2,
    "subActions": [{ "type": "ignoreArmor" }]
  }]
}
```

Prefer the flag in new data. Either way the validator rejects `ignoreArmor` anywhere
but on an `attack`, where nothing would read it.

Don't combine it with pierce on the same attack — `ignoreArmor` already beats any amount of
pierce, so a `pierce` alongside it would just be dead data. They combine freely with
`condition`, though — "Attack 3, Pierce 2, Poison" nests both under the one `attack`:

```json
{
  "actions": [{
    "type": "attack", "value": 3,
    "subActions": [
      { "type": "pierce", "value": 2 },
      { "type": "condition", "value": "poison", "small": true }
    ]
  }]
}
```

**`selfOnly`** — on a `heal` or `condition` action, always the acting hero, never the
picked target; no target selection is required for it. "Attack 3, Heal 2 self":

```json
{
  "actions": [
    { "type": "attack", "value": 3 },
    { "type": "heal", "value": 2, "selfOnly": true }
  ]
}
```

A self-inflicted condition works the same way — "Strengthen self":

```json
{
  "actions": [{ "type": "condition", "value": "strengthen", "selfOnly": true }]
}
```

Don't set `selfOnly` on a `heal`/`condition` meant for an ally or enemy — that's the
default (target-picked) behavior already; `selfOnly` is only for the acting hero. And
don't reach for it to take the hero's HP: that's `sufferDamage`, which is always the
hero and so carries no `selfOnly` at all — see Rule 7.

**`targetAlly`** — a `condition` still picked from the target strip (unlike
`selfOnly`), but aimed at an ally or summon instead of an enemy. This is for the rare
card that deliberately curses or wounds a teammate — "Target ally. That ally suffers
Wound":

```json
{
  "actions": [{ "type": "condition", "value": "wound", "targetAlly": true }]
}
```

A half whose only conditions are beneficial ones already offers allies (see the
target-picking rule two sections up); `targetAlly` extends that to a debuff without
needing every condition on the half to be a buff. Mixing a `targetAlly` condition with
an ordinary attack or an enemy-facing condition on the same half still resolves against
enemies — same as mixing a buff and a debuff does — so keep a `targetAlly` half free of
those if the card really means "hits an ally, nothing else." Never combine it with
`selfOnly` on the same action; the validator rejects that.

`targetAlly` also works on an `attack` — a strike deliberately aimed at an ally/summon
instead of a foe (a friendly-fire drawback, or a cost like "deal 2 damage to your
summon"):

```json
{
  "actions": [{ "type": "attack", "value": 2, "targetAlly": true }]
}
```

It's read off the specific `attack` action, so in a multi-attack half (Rule 4) it's
per-strike: only the flagged attack offers allies, and any other `attack` on the same
half without it still targets enemies as normal — "Attack 2 to your summon. Attack 3."
is one `targetAlly` attack followed by an ordinary one. It combines with everything an
attack already can (pierce, conditions nested under it, `multiTarget`); armor, shield
and retaliate are read off whatever creature is picked, ally or not, same as always.

Four things the panel does to a target on its own, with nothing to author for them:

- a **poisoned** target's `+1` is added to the attack value, so the modifier card
  multiplies it and shield is subtracted from the poisoned total — *except* against an
  `ignoreArmor` attack, which this app treats as direct damage that draws no modifier
  and so takes no attack-value bump either (Rule: see `ignoreArmor` above);
- **ward** and **brittle** modify the one instance of damage they meet and are then
  removed — both at once, and cancelling, if the target had both. A missed or fully
  blocked attack leaves them alone: no damage, nothing to modify;
- a target's **retaliate** is dealt back to the acting hero. It answers the attack, not
  the damage, so it lands on a miss too. The panel asks before applying it, since this
  app has no board to say whether the hero stood inside the retaliate range;
- a **healed** figure loses **wound** and the heal lands normally, while **poison**
  comes off *instead of* the heal — a poisoned figure's HP does not move, only the
  poison clears. A figure with both loses both, and poison's block still wins. This is
  a house rule, not the rulebook's (which removes both and heals regardless), and it
  applies to a `selfOnly` heal on the acting hero exactly as it does to a picked
  target — see `DamageService.computeHealResult`.

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
