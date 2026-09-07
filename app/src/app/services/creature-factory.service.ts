// src/app/services/creature-factory.service.ts
import { Injectable } from '@angular/core';
import { Creature, CreatureAction, CreatureConditions } from '../types/game-types';
import { CardSummon } from '../types/character-card-types';
import { DataFile, Monster, MonsterAbilityCard, MonsterAction, MonsterStat } from '../types/data-file-types';
import { DataLoaderService } from '../services/data-loader.service';
import { StringUtils } from './string-utils.service';


@Injectable({ providedIn: 'root' })
export class CreatureFactoryService {

  private creatureIdCounter = 0;
  private dataFile: DataFile;

  constructor(private dataLoader: DataLoaderService, private stringUtils: StringUtils) {
    this.dataFile = this.dataLoader.getData();
  }

  private generateCreatureId(): string {
    return Date.now() + '' + ++this.creatureIdCounter;
  }

  createCreature(creatureInput: Partial<Creature>): Creature {
    const monster: Monster = this.findMonsterStats(creatureInput);
    const monsterCards: MonsterAbilityCard[] = this.getMonsterCards(creatureInput, monster);

    const creature: Creature = {
      id: this.generateCreatureId(),
      name: creatureInput.aggressive ? this.createCreatureName(creatureInput) : creatureInput.name,
      namePronunciation: creatureInput.namePronunciation,
      type: creatureInput.type,
      standee: creatureInput.standee ?? '#',
      level: creatureInput.level ?? 1,
      hp: Math.max(
        this.stringUtils.parseInt(monster?.baseStat?.health ?? 0),
        this.stringUtils.parseInt(monster?.stats[0]?.health ?? 0),
        this.stringUtils.parseInt(creatureInput.hp ?? 0)
      ),
      attack: Math.max(
        this.stringUtils.parseInt(monster?.baseStat?.attack ?? 0),
        this.stringUtils.parseInt(monster?.stats[0]?.attack ?? 0)
      ),
      attackTarget: this.getTargetStat(monster),
      movement: Math.max(
        this.stringUtils.parseInt(monster?.baseStat?.movement ?? 0),
        this.stringUtils.parseInt(monster?.stats[0]?.movement ?? 0)
      ),
      initiative: creatureInput.initiative ?? 0,
      armor: this.stringUtils.parseInt(
        monster?.stats?.[0]?.actions?.find((x: MonsterAction) => x.type === 'shield')?.value ??
        monster?.stats?.[0]?.baseStat?.actions?.find((x: MonsterAction) => x.type === 'shield')?.value ??
        0
      ),
      retaliate: this.getRetaliateStat(monster, 'value'),
      retaliateRange: this.getRetaliateStat(monster, 'range'),
      aggressive: creatureInput.aggressive, // monsters default aggressive, characters not
      boss: monster?.boss ?? false,
      flying: monster?.flying ?? false,
      isElite: creatureInput.isElite ?? false,
      conditions: creatureInput.conditions ?? [],
      immunities: (monster?.stats?.[0]?.immunities
        ?? monster?.baseStat?.immunities
        ?? [])
        .map((c: string) => c as CreatureConditions),
      roundArmor: creatureInput.roundArmor ?? 0,
      roundRetaliate: creatureInput.roundRetaliate ?? 0,
      sessionExperience: creatureInput.sessionExperience ?? 0,
      actions:
        monster?.actions?.filter(a => a.type === 'condition')
        ?? monster?.baseStat?.actions?.filter(a => a.type === 'condition')
        ?? monster?.stats?.flatMap(s => s.actions ?? []).filter(a => a.type === 'condition')
        ?? [],
      log: creatureInput.log ?? [],
      traits: creatureInput.traits ?? [],
      abilityCards: monsterCards ?? [],
      totalXp: creatureInput.totalXp ?? 0
    };
    creature.maxHp = creature.hp === 0 ? 999 : creature.hp;
    return creature;
  }


  /**
   * Builds a board figure from a card's printed summon.
   *
   * Deliberately *not* routed through `createCreature`, which derives its stats from
   * the monster tables by type — a summon's stats come from the card that summons it
   * and exist nowhere else. Friendly (`aggressive: false`) but flagged `isSummon`, so
   * hero-only rules skip it while the monster-style stat rendering applies.
   */
  createSummon(summon: CardSummon, owner: Creature, standee: number): Creature {
    const hp = Math.max(this.stringUtils.parseInt(summon.health ?? 0), 1);

    // Conditions the summon inflicts render as icons on its row, the same way a
    // monster's own condition actions do.
    const conditionActions: CreatureAction[] = (summon.abilities ?? [])
      .filter(a => a.type === 'condition' && a.value !== undefined)
      .map(a => ({ type: 'condition', value: String(a.value) }));

    // A pierce printed among the summon's abilities always applies to its own
    // attack, so it rides along as a fixed stat rather than a card-side action.
    const pierceAbility = (summon.abilities ?? []).find(a => a.type === 'pierce');
    const pierce = pierceAbility ? this.stringUtils.parseInt(pierceAbility.value ?? 0) : 0;

    return {
      id: this.generateCreatureId(),
      name: summon.name,
      type: this.summonTypeSlug(summon.name),
      standee,
      level: owner.level ?? 1,
      hp,
      maxHp: hp,
      attack: this.stringUtils.parseInt(summon.attack ?? 0),
      pierce,
      attackTarget: this.stringUtils.parseInt(summon.attackTarget ?? 1) || 1,
      movement: this.stringUtils.parseInt(summon.movement ?? 0),
      range: this.stringUtils.parseInt(summon.range ?? 0),
      armor: this.stringUtils.parseInt(summon.armor ?? 0),
      retaliate: this.stringUtils.parseInt(summon.retaliate ?? 0),
      retaliateRange: this.stringUtils.parseInt(summon.retaliateRange ?? 0),
      flying: summon.flying ?? false,
      immunities: (summon.immunities ?? []).map(c => c as unknown as CreatureConditions),

      aggressive: false,
      isSummon: true,
      summonOwnerId: owner.id,
      summonImage: summon.image,
      summonNotes: summon.notes ?? [],

      // A summon never has its own initiative: ordering borrows the owner's.
      initiative: 0,
      hiddenInitiative: null,

      isElite: false,
      boss: false,
      conditions: [],
      conditionRounds: {},
      roundArmor: 0,
      roundRetaliate: 0,
      actions: conditionActions,
      abilityCards: [],
      traits: [],
      log: [],
    };
  }

  /** 'Snow Fox' -> 'snow-fox', for CSS classes, grouping and image lookups. */
  private summonTypeSlug(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  createCreatureName(creatureInput: Partial<Creature>): string {
    let baseName: string = `${creatureInput.type} ${creatureInput.standee ?? ''}`;
    return creatureInput.isElite ? `★ ${baseName}` : baseName;
  }

  private getRetaliateStat(
    monster: Monster,
    stat: 'value' | 'range'
  ): number {
    const retaliateAction =
      monster?.stats?.[0]?.actions?.find((x: MonsterAction) => x.type === 'retaliate') ??
      monster?.baseStat?.actions?.find((x: MonsterAction) => x.type === 'retaliate');

    if (!retaliateAction) {
      return 0;
    }

    if (stat === 'value') {
      return this.stringUtils.parseInt(retaliateAction.value ?? 0);
    }

    if (stat === 'range') {
      return this.stringUtils.parseInt(
        retaliateAction.range ??
        retaliateAction.subActions?.find((sa: any) => sa.type === 'range')?.value ??
        0
      );
    }

    return 0;
  }

  private getTargetStat(monster: Monster): number {
    const targetAction =
      monster?.stats?.[0]?.actions?.find((x: MonsterAction) => x.type === 'target') ??
      monster?.baseStat?.actions?.find((x: MonsterAction) => x.type === 'target');

    if (!targetAction) {
      return 1;
    }

    return this.stringUtils.parseInt(targetAction.value ?? 1);
  }

  createCreatureList(creatureList: Creature[]) {
    const creatures: Creature[] = [];
    creatureList.forEach(creature => {
      creatures.push(this.createCreature(creature))
    });
    return creatures;
  }

  private findMonsterStats(creature: Partial<Creature>): Monster | undefined {
    const monster = this.dataFile.monsters.find(
      m => m.name === creature.name || m.name === creature.type
    );
    if (!monster) return undefined;

    const isElite = this.isCreatureElite(creature);

    const stat = monster.stats.find(
      s => (isElite ? s.type === 'elite' : s.type === 'normal' || !s.type) &&
        s.level === creature.level
    );

    if (!stat) return undefined;

    // return monster with the correct stat isolated
    return {
      ...monster,
      stats: [stat]
    };
  }

  private getMonsterCards(creature: Partial<Creature>, monster?: Monster): MonsterAbilityCard[] {
    const typeKey =
      typeof creature.type === 'string' && creature.type.trim().length > 0
        ? creature.type.trim()
        : undefined;

    const monsterKey = monster?.name?.trim();

    // If monster.deck is a string reference, prefer it
    const deckKey =
      (typeof monster?.deck === 'string' && monster.deck.trim().length > 0 ? monster.deck.trim() : undefined) ??
      typeKey ??
      monsterKey;

    if (!deckKey || !this.dataFile.decks?.length) return [];

    const deck = this.dataFile.decks.find(d => d.name === deckKey);
    if (!deck) return [];

    return ((deck as any).abilities ?? (deck as any).cards ?? []) as MonsterAbilityCard[];
  }

  private isCreatureElite(creature: Creature): boolean {
    return creature.type === 'elite' || creature.player4 === 'elite' || creature.isElite === true;
  }
}
