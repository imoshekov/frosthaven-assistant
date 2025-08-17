import { Injectable } from '@angular/core';
import { Creature, Element } from './types/game-types';
import { Scenario } from './types/data-file-types';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';

@Injectable({ providedIn: 'root' })
export class AppContext {
    public elementStates: Element[] = [];
    public roundNumber: number = 1;
    public scenario: Scenario | null = null;

    private creaturesSubject = new BehaviorSubject<Creature[]>([]);
    creatures$ = this.creaturesSubject.asObservable();

    private graveyardSubject = new BehaviorSubject<Creature[]>([]);
    graveyard$ = this.graveyardSubject.asObservable();

    constructor(
        private dataLoader: DataLoaderService,
        private creatureFactory: CreatureFactoryService) {
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
        this.creaturesSubject.next([...this.creaturesSubject.value, this.creatureFactory.createCreature(creature)]);
    }

    addCreatures(newCreatures: Creature[]) {
        this.creaturesSubject.next([
            ...this.creaturesSubject.value,
            ...this.creatureFactory.createCreatureList(newCreatures)
        ]);
    }

    removeCreature(id: string) {
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
        this.graveyardSubject.next([...this.graveyardSubject.value, this.creatureFactory.createCreature(creature)]);
    }


    removeGraveyard(id: string) {
        this.graveyardSubject.next(
            this.graveyardSubject.value.filter(c => c.id !== id)
        );
    }

    updateCreatureBaseStat(creatureId: string, stat: keyof Creature, value: any, applyToAllOfType?: boolean) {
        const creatures = this.getCreatures();
        const creatureToUpdate = creatures.find(c => c.id === creatureId);
        if (!creatureToUpdate) return;

        if (applyToAllOfType) {
            creatures
                .filter(c => c.type === creatureToUpdate.type)
                .forEach(c => {
                    this.updateCreatureBaseStat(c.id!, stat, value, false);
                });
        } else {
           creatureToUpdate[stat] = value;
        }

        this.creaturesSubject.next([...creatures]);
    }

    updateCreatureStat(
        creatureId: string,
        stat: keyof Creature,
        value: any,
        options?: { isCondition?: boolean; isTemporary?: boolean }
    ) {
        const creatures = this.creaturesSubject.value;
        const creature = creatures.find(c => c.id === creatureId);
        if (!creature) return;

        if (options?.isCondition) {
            creature.conditions = {
                ...creature.conditions,
                [stat]: value
            };
        } else if (options?.isTemporary) {
            creature.tempStats = {
                ...creature.tempStats,
                [stat]: value
            };
        } else {
            (creature as any)[stat] = value;
        }

        this.creaturesSubject.next([...creatures]);
        console.log(this.getCreatures());
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
            const charData = this.dataLoader.getData().characters.find(c => c.name === type);

            const stats = charData?.stats.find(s => s.level === level);
            const hp = stats?.health ?? 10;
            const traits = charData?.traits ?? [];

            return this.creatureFactory.createCreature({
                name,
                type,
                hp,
                traits,
                level,
                aggressive: false
            });
        });
        this.addCreatures(defaultCharacters);
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
