import { Injectable } from '@angular/core';
import { Creature, Element } from './types/game-types';
import { Scenario } from './types/data-file-types';
import { LocalStorageService } from './services/local-storage.service';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppContext {
    public elementStates: Element[] = [];
    public roundNumber: number = 1;
    public scenario: Scenario | null = null;


    private creaturesSubject = new BehaviorSubject<Creature[]>([]);
    creatures$ = this.creaturesSubject.asObservable();
    
    private graveyardSubject = new BehaviorSubject<Creature[]>([]);
    graveyard$ = this.graveyardSubject.asObservable();

    constructor() {
        this.addDefaultCharacters();
        this.addElements();
    }

    getCreatures(): Creature[] {
        return this.creaturesSubject.value;
    }

    setCreatures(creatures: Creature[]) {
        this.creaturesSubject.next(creatures);
    }

    addCreature(creature: Creature) {
        this.creaturesSubject.next([...this.creaturesSubject.value, creature]);
    }

    addCreatures(newCreatures: Creature[]) {
        this.creaturesSubject.next([
            ...this.creaturesSubject.value,
            ...newCreatures
        ]);
    }

    removeCreature(id: number) {
        this.creaturesSubject.next(
            this.creaturesSubject.value.filter(c => c.id !== id)
        );
    }

    getGraveyard(): Creature[] {
        return this.graveyardSubject.value;
    }


    setGraveyard(creatures: Creature[]) {
        this.graveyardSubject.next(creatures);
    }

    addGraveyard(creature: Creature) {
        this.graveyardSubject.next([...this.graveyardSubject.value, creature]);
    }


    removeGraveyard(id: number) {
        this.graveyardSubject.next(
            this.graveyardSubject.value.filter(c => c.id !== id)
        );
    }

    private addDefaultCharacters() {
        console.log('loading characters')
        const defaultCharacters: Creature[] = [
            this.createCharacter("Bonera Bonerchick", "boneshaper", 14),
            this.createCharacter("Arrabbiatus", "blinkblade", 14),
            this.createCharacter("Калин", "meteor", 17),
            this.createCharacter("Stef4o", "fist", 10)
        ];
        this.addCreatures(defaultCharacters);
    }

    private creatureId = 0;

    private createCharacter(name: string, type: string, hp: number): Creature {
        return {
            id: this.creatureId++,
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
