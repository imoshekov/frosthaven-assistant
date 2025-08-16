import { Injectable } from '@angular/core';
import { Creature, Element } from './types/game-types';
import { Scenario} from './types/data-file-types';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataLoaderService } from './services/data-loader.service';


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

    private creatureId = 0;
    generateCreatureId(){
        return this.creatureId++;
    }

    private addDefaultCharacters() {
        const selectedCharacters: { name: string, type: string; level: number }[] = [
            {
                "name": "Аньемонье",
                "type": "coral",
                "level": 3
            },
            {
                "name": "Arrabbiatus",
                "type": "blinkblade",
                "level": 7
            },
            {
                "name": "Калин",
                "type": "meteor",
                "level": 3
            },
            {
                "name": "Stef4o",
                "type": "fist",
                "level": 5
            }
        ];
        const defaultCharacters: Creature[] = selectedCharacters.map(({ name, type, level }) => {
            const charData = new DataLoaderService().getData().characters.find(c => c.name === type);
            if (!charData) {
                return this.createCharacter(name, type, 10, []); // fallback
            }

            const statForLevel = charData.stats.find(s => s.level === level);
            const hp = statForLevel?.health ?? 10;

            const traits = charData.traits ?? [];

            return this.createCharacter(name, charData.name, hp, traits);
        });

        this.addCreatures(defaultCharacters);
    }

    private createCharacter(name: string, type: string, hp: number, traits: string[]): Creature {
        return {
            id: this.generateCreatureId(),
            name,
            type,
            aggressive: false,
            hp,
            log: [],
            traits: traits
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
