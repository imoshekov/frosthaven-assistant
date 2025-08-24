import { Injectable } from '@angular/core';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from './types/game-types';
import { BehaviorSubject } from 'rxjs';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';

@Injectable({ providedIn: 'root' })
export class AppContext {
    public defaultLevel: number = 1;
    public isGroupSelected: boolean = false;
    public selectedCreature: Creature = null;
    public addMonsterToggled: boolean = false;

    private creaturesSubject = new BehaviorSubject<Creature[]>([]);
    creatures$ = this.creaturesSubject.asObservable();

    private graveyardSubject = new BehaviorSubject<Creature[]>([]);
    graveyard$ = this.graveyardSubject.asObservable();

    private roundNumberSubject = new BehaviorSubject<number>(1);
    roundNumber$ = this.roundNumberSubject.asObservable();

    private elementsSubject = new BehaviorSubject<Element[]>([
        { type: ElementType.Fire, state: ElementState.None },
        { type: ElementType.Ice, state: ElementState.None },
        { type: ElementType.Earth, state: ElementState.None },
        { type: ElementType.Air, state: ElementState.None },
        { type: ElementType.Light, state: ElementState.None },
        { type: ElementType.Dark, state: ElementState.None }
    ]);

    elements$ = this.elementsSubject.asObservable();

    constructor(
        private dataLoader: DataLoaderService,
        private creatureFactory: CreatureFactoryService,
        private logService: LogService,
        private notificationService: NotificationService
    ) {
        this.addDefaultCharacters();
    }

    getRoundNumber(): number { return this.roundNumberSubject.getValue(); }
    setRoundNumber(round: number) { this.roundNumberSubject.next(round); }

    getElements(): Element[] {
        return this.elementsSubject.getValue();
    }

    setElements(elements: Element[]): void {
        this.elementsSubject.next([...elements]);
    }

    setElementState(type: ElementType, newState: ElementState): void {
        const updated = this.getElements().map(el =>
            el.type === type ? { ...el, state: newState } : el
        );
        this.setElements(updated);
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

    //DO NOT use it for deaths — call killCreature instead.
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
        this.graveyardSubject.next([
            ...this.graveyardSubject.value,
            JSON.parse(JSON.stringify(creature))
        ]);
    }

    removeGraveyard(id: string) {
        this.graveyardSubject.next(
            this.graveyardSubject.value.filter(c => c.id !== id)
        );
    }

    updateCreatureBaseStat(creatureId: string, stat: keyof Creature, value: any, applyToAllOfType?: boolean) {
        const creatures = this.getCreatures();
        const creatureToUpdate = this.findCreature(creatureId);
        const currentValue: any = creatureToUpdate[stat];
        if (stat === 'name') {
            value = this.creatureFactory.createCreatureName(creatureToUpdate);
        }

        if (applyToAllOfType) {
            creatures
                .filter(c => c.type === creatureToUpdate!.type)
                .forEach(c => {
                    this.updateCreatureBaseStat(c.id!, stat, value, false);
                });
        } else {
            (creatureToUpdate as any)[stat] = value;
        }
        this.logService.addLog(creatureToUpdate.id, creatureToUpdate.name, stat, value, currentValue);

        this.creaturesSubject.next([...creatures]);
    }

    toggleCreatureConditions(creatureId: string, condition: CreatureConditions) {
        const creatureToUpdate = this.findCreature(creatureId);
        if (!creatureToUpdate) return;

        const conditions = creatureToUpdate.conditions || [];

        const index = conditions.indexOf(condition);
        if (index > -1) {
            creatureToUpdate.conditions = conditions.filter(c => c !== condition);
        } else {
            creatureToUpdate.conditions = [...conditions, condition];
        }
        this.creaturesSubject.next([...this.getCreatures()]);
    }

    killCreature(creatureId: string) {
        const creature = this.findCreature(creatureId);
        if (!creature) return;

        // 1) remove from live list
        const live = this.creaturesSubject.value.filter(c => c.id !== creatureId);
        this.creaturesSubject.next(live);

        // 2) add to graveyard (PRESERVE THE SAME ID!)
        // deep clone to decouple references; do NOT regenerate id
        const deadCopy = JSON.parse(JSON.stringify(creature));
        this.addGraveyard(deadCopy);

        // 3) audit + notify
        this.logService.addLog(creature.id, creature.name, 'killed', true, false);
        this.notificationService.emitInfoMessage(`${creature.name} has been killed!`);
    }

    reviveCreature(creatureId: string): boolean {
        const gy = this.getGraveyard();
        const idx = gy.findIndex(c => c.id === creatureId);
        if (idx === -1) return false;

        const revived = JSON.parse(JSON.stringify(gy[idx]));

        //look up the last HP from logs
        const lastHp = this.logService.getLastHpForCreature(creatureId);
        if (typeof lastHp === 'number') {
            revived.hp = lastHp;
        } else {
            revived.hp = 1; // fallback
        }

        revived.aggressive = true;

        //remove from graveyard
        const nextGY = [...gy];
        nextGY.splice(idx, 1);
        this.setGraveyard(nextGY);

        //add back to live
        this.creaturesSubject.next([...this.creaturesSubject.value, revived]);

        this.logService.addLog(revived.id, revived.name, 'revived', revived.hp, 0);
        this.notificationService.emitInfoMessage(`${revived.name} has been revived!`);
        return true;
    }

    private findCreature(creatureId: string): Creature {
        const creatures = this.getCreatures();
        const creature = creatures.find(c => c.id === creatureId);
        if (!creature) throw Error("Creature not found");
        return creature;
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
        this.defaultLevel = Math.round((selectedCharacters.reduce((sum, c) => sum + c.level, 0) / selectedCharacters.length) / 2);

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
}
