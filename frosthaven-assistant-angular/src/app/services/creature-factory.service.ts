// src/app/services/creature-factory.service.ts
import { Injectable } from '@angular/core';
import { Creature, CreatureConditions } from '../types/game-types';
import { DataFile, Monster, MonsterAction, MonsterStat } from '../types/data-file-types';
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

    const creature: Creature = {
      id: this.generateCreatureId(),
      name: creatureInput.aggressive ? this.createCreatureName(creatureInput) : creatureInput.name,
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
      actions:
        monster?.actions?.filter(a => a.type === 'condition')
        ?? monster?.baseStat?.actions?.filter(a => a.type === 'condition')
        ?? monster?.stats?.flatMap(s => s.actions ?? []).filter(a => a.type === 'condition')
        ?? [],
      log: creatureInput.log ?? [],
      traits: creatureInput.traits ?? []
    };
    return creature;
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


  private isCreatureElite(creature: Creature): boolean {
    return creature.type === 'elite' || creature.player4 === 'elite' || creature.isElite === true;
  }
}
