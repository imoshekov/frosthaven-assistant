import { Injectable } from '@angular/core';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from './types/game-types';
import { BehaviorSubject } from 'rxjs';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';
import { DbService } from './services/db.service';

@Injectable({ providedIn: 'root' })
export class AppContext {
    public defaultLevel: number = 1;
    public isGroupSelected: boolean = false;
    public selectedCreature: Creature = null;
    public addMonsterToggled: boolean = false;
    public addItemToggled: boolean = false;
    public shouldShowSetup: boolean = true;
    public shouldShowAudit: boolean = false;
    public scenarioCreatureList: Creature[] = [];

    private creaturesSubject = new BehaviorSubject<Creature[]>([]);
    creatures$ = this.creaturesSubject.asObservable();

    private graveyardSubject = new BehaviorSubject<Creature[]>([]);
    graveyard$ = this.graveyardSubject.asObservable();

    private roundNumberSubject = new BehaviorSubject<number>(1);
    roundNumber$ = this.roundNumberSubject.asObservable();

    private defaultLevelSubject = new BehaviorSubject<number>(1);
    defaultLevel$ = this.defaultLevelSubject.asObservable();

    private readonly _scenarioId$ = new BehaviorSubject<number | null>(null);
    public readonly scenarioId$ = this._scenarioId$.asObservable();

    // raw JSON of the most recently loaded scenario file (from storageService)
    private readonly _scenarioFile$ = new BehaviorSubject<any | null>(null);
    public readonly scenarioFile$ = this._scenarioFile$.asObservable();

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
        private readonly logService: LogService,
        private notificationService: NotificationService,
        private db: DbService
    ) {
        this.addDefaultCharacters();
        this.logService.init(this.creatures$);
    }

    getRoundNumber(): number { return this.roundNumberSubject.getValue(); }
    setRoundNumber(round: number) { this.roundNumberSubject.next(round); }

    /**
     * The default level used when adding creatures or loading scenarios.  Components
     * can both subscribe to `defaultLevel$` or call this method to update it.
     */
    setDefaultLevel(level: number): void {
        this.defaultLevel = level;
        this.defaultLevelSubject.next(level);
    }

    setScenarioId(id: number | null): void {
        this._scenarioId$.next(id);
    }

    /**
     * Store the raw scenario data returned by LocalStorageService.loadFile so
     * other components (loot, etc.) can inspect it without re-fetching.
     */
    setScenarioFile(file: any | null): void {
        this._scenarioFile$.next(file);
    }

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
        if (!creature.aggressive) {
            this.notificationService.emitErrorMessage(`haha, can't kill me`);
            return;
        }

        // 1) remove from live list
        const live = this.creaturesSubject.value.filter(c => c.id !== creatureId);
        this.creaturesSubject.next(live);

        // 2) add to graveyard (PRESERVE THE SAME ID!)
        const deadCopy = JSON.parse(JSON.stringify(creature));
        this.addGraveyard(deadCopy);

        // 3) audit + notify
        this.notificationService.emitInfoMessage(`${creature.name} has been killed!`);
    }

    reviveCreature(creatureId: string, hp?: number): void {
        const graveyard: Creature[] = this.getGraveyard
            ? this.getGraveyard()
            : (this.graveyardSubject?.value ?? []);

        const idx = graveyard.findIndex(g => g.id === creatureId);
        if (idx === -1) {
            // nothing to revive
            return;
        }

        //remove from graveyard (preserve ID)
        const revived = { ...graveyard[idx] };
        const newGrave = [...graveyard];
        newGrave.splice(idx, 1);

        //set HP + flags
        const lastHp = Number.isFinite(hp as number) ? Number(hp) : undefined;
        revived.hp = Math.max(1, Number(lastHp ?? revived.hp ?? 1));
        revived.aggressive = true;

        //add back to live list
        const live = [...this.creaturesSubject.value, revived];

        //emit + notify (and broadcast if you do WS syncing)
        this.creaturesSubject.next(live);
        if (this.graveyardSubject) this.graveyardSubject.next(newGrave);

        this.notificationService?.emitInfoMessage?.(`${revived.name} has been revived!`);
    }


    public findCreature(creatureId: string): Creature {
        const creatures = this.getCreatures();
        const creature = creatures.find(c => c.id === creatureId);
        if (!creature) throw Error("Creature not found");
        return creature;
    }

    private async addDefaultCharacters() {
        try {
            const selectedCharacters = await this.db.getCharacter();
            const levels = selectedCharacters.map(c => Number(c.level) || 1);
            const avg = levels.reduce((sum, n) => sum + n, 0) / levels.length;

            const defaultLevel = Math.max(1, Math.round(avg / 2));
            this.setDefaultLevel(defaultLevel);

            const defaultCharacters: Creature[] = selectedCharacters.map(({ name, type, level, total_xp }) => {
                const charData = this.dataLoader.getData().characters.find(c => c.name === type);
                const stats = charData?.stats?.find(s => s.level === Number(level));
                const hp = Number(stats?.health) || 10;
                const traits = charData?.traits ?? [];


                return this.creatureFactory.createCreature({
                    name,
                    type,
                    hp,
                    traits,
                    level: Number(level) || 1,
                    aggressive: false,
                    totalXp: Number(total_xp) || 0
                });
            });

            this.addCreatures(defaultCharacters);
        } catch (err) {
            console.error('addDefaultCharacters failed', err);
        }
    }
}
