// src/app/services/creature-factory.service.ts
import { Injectable } from '@angular/core';
import { Creature, DefaultCondition } from '../types/game-types';

@Injectable({ providedIn: 'root' })
export class CreatureFactoryService {
  private defaultConditions: DefaultCondition = {
    poison: false,
    wound: false,
    brittle: false,
    ward: false,
    immobilize: false,
    bane: false,
    muddle: false,
    stun: false,
    impair: false,
    disarm: false
  };

  private creatureIdCounter = 0;

  private generateCreatureId(): number {
    return this.creatureIdCounter++;
  }

  createCreature(creatureInput: Partial<Creature>, isCharacter: boolean = false): Creature {
    const creature: Creature = {
      id: this.generateCreatureId(),
      name: creatureInput.isElite ? `★ ${creatureInput.name}` : creatureInput.name,
      type: creatureInput.type,
      standee: creatureInput.standee ?? 1,
      level: creatureInput.level ?? 1,
      hp: creatureInput.hp ?? 0,
      attack: creatureInput.attack ?? 0,
      movement: creatureInput.movement ?? 0,
      initiative: creatureInput.initiative ?? 0,
      armor: creatureInput.armor ?? 0,
      retaliate: creatureInput.retaliate ?? 0,
      aggressive: creatureInput.aggressive ?? !isCharacter, // monsters default aggressive, characters not
      isElite: creatureInput.isElite,
      conditions: creatureInput.conditions ?? { ...this.defaultConditions },
      tempStats: creatureInput.tempStats ?? {},
      log: creatureInput.log ?? [],
      traits: creatureInput.traits ?? []
    };

    return creature;
  }
}
