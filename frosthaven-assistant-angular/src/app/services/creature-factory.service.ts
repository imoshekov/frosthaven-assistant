// src/app/services/creature-factory.service.ts
import { Injectable } from '@angular/core';
import { Creature } from '../types/game-types';

@Injectable({ providedIn: 'root' })
export class CreatureFactoryService {

  private creatureIdCounter = 0;

  private generateCreatureId(): string {
    return Date.now() + '' + ++this.creatureIdCounter;
  }

  createCreature(creatureInput: Partial<Creature>): Creature {
    const creature: Creature = {
      id: this.generateCreatureId(),
      name: creatureInput.isElite ? `★ ${creatureInput.name}` : creatureInput.name,
      type: creatureInput.type,
      standee: creatureInput.standee ?? 0,
      level: creatureInput.level ?? 1,
      hp: creatureInput.hp ?? 0,
      attack: creatureInput.attack ?? 0,
      movement: creatureInput.movement ?? 0,
      initiative: creatureInput.initiative ?? 0,
      armor: creatureInput.armor ?? 0,
      retaliate: creatureInput.retaliate ?? 0,
      aggressive: creatureInput.aggressive, // monsters default aggressive, characters not
      isElite: creatureInput.isElite ?? false,
      conditions: creatureInput.conditions ?? {},
      tempStats: creatureInput.tempStats ?? {},
      log: creatureInput.log ?? [],
      traits: creatureInput.traits ?? []
    };

    return creature;
  }

  createCreatureList(creatureList: Creature[]) {
    const creatures: Creature[] = [];
    creatureList.forEach(creature => {
      creatures.push(this.createCreature(creature))
    });
    return creatures;
  }
}
