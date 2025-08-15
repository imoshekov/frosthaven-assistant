import { Injectable } from '@angular/core';
import { Creature, Element } from './types/game-types';
import { Scenario } from './types/data-file-types';
import { LocalStorageService } from './services/local-storage.service';

@Injectable({ providedIn: 'root' })
export class AppContext {
    public elementStates: Element[] = [];
    public roundNumber: number = 1;
    public creatures: Creature[] = [];
    public graveyard: Creature[] = [];
    public scenario: Scenario | null = null;

    constructor() {
        this.addDefaultCharacters();
        this.addElements();
    }

    setCreatures(creatures: Creature[]) {
        this.creatures = creatures;
    }

    setGraveyard(graveyard: Creature[]) {
        this.graveyard = graveyard;
    }

    private addDefaultCharacters() {
        console.log('loading characters')
        const defaultCharacters: Creature[] = [
            this.createCharacter("Bonera Bonerchick", "boneshaper", 14),
            this.createCharacter("Arrabbiatus", "blinkblade", 14),
            this.createCharacter("Калин", "meteor", 17),
            this.createCharacter("Stef4o", "fist", 10)
        ];
        this.creatures.push(...defaultCharacters);
    }

    private createCharacter(name: string, type: string, hp: number): Creature {
        return {
            name,
            type,
            aggressive: false,
            hp,
            attack: 0,
            movement: 0,
            initiative: 0,
            armor: 0,
            retaliate: 0,
            conditions: {
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
            },
            tempStats: {},
            log: []
        };
    }

    private addElements() {
        this.elementStates = [
            { type: 'Fire', state: 'none' },
            { type: 'Ice', state: 'none' },
            { type: 'Earth', state: 'none' },
            { type: 'Wind', state: 'none' },
            { type: 'Light', state: 'none' },
            { type: 'Darkness', state: 'none' }
        ];
    }
}
