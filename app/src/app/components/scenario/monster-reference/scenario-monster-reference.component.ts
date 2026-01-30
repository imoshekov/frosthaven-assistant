import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map, filter, tap, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppContext } from '../../../app-context';
import { DataLoaderService } from '../../../services/data-loader.service';
import { Creature } from '../../../types/game-types';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { MonsterAbilityCard } from '../../../types/data-file-types';

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-scenario-monster-reference',
    templateUrl: './scenario-monster-reference.component.html',
    styleUrls: ['./scenario-monster-reference.component.scss']
})
export class ScenarioMonsterReference {
    private appContext = inject(AppContext);
    public monsterList: Creature[] = [];
    public shouldExpand = true;

    vm$ = combineLatest([
        this.appContext.scenarioId$,
        this.appContext.defaultLevel$
    ]).pipe(
        map(([scenarioId, level]) => ({
            scenarioId,
            level,
            ready: scenarioId != null && level != null
        }))
    );

    private buildTrigger$ = combineLatest([
        this.appContext.scenarioId$,
        this.appContext.defaultLevel$
    ]).pipe(
        filter(([scenarioId, level]) => scenarioId != null && level != null),
        distinctUntilChanged(
            ([prevScenario, prevLevel], [currScenario, currLevel]) =>
                prevScenario === currScenario && prevLevel === currLevel
        ),
        tap(([scenarioId, level]) => this.buildMonsterList(scenarioId!, level!))
    );

    constructor(private dataLoader: DataLoaderService,
        private creatureFactory: CreatureFactoryService

    ) {
        this.buildTrigger$
            .pipe(takeUntilDestroyed())
            .subscribe();
    }

    private buildMonsterList(scenarioId: number, level: number): void {
        this.monsterList = [];

        const monsters = this.getAllScenarioMonsters(scenarioId);

        for (const type of monsters) {
            this.monsterList.push(
                this.creatureFactory.createCreature({
                    level,
                    aggressive: true,
                    isElite: false,
                    type
                }),
                this.creatureFactory.createCreature({
                    level,
                    aggressive: true,
                    isElite: true,
                    type
                })
            );
        }

        this.monsterList.sort((a, b) => {
            return a.type.localeCompare(b.type);
        });
        console.log('Built monster list:', this.monsterList);
    }

    get monsterRows() {
    const map = new Map<
        string,
        {
            type: string;
            normalAtk?: number;
            eliteAtk?: number;
            normalArmor?: number;
            eliteArmor?: number;
            normalHp?: number;
            eliteHp?: number;
            normalMovement?: number;
            eliteMovement?: number;
            normalRetaliate?: number;
            eliteRetaliate?: number;
            immunities: string[];
            abilityCards: MonsterAbilityCard[];
            minInitiative?: number;
            maxInitiative?: number;
            avgInitiative?: number;
        }
    >();

    for (const m of this.monsterList) {
        const row =
            map.get(m.type) ??
            {
                type: m.type,
                normalAtk: 0,
                eliteAtk: 0,
                normalArmor: 0,
                eliteArmor: 0,
                normalHp: 0,
                eliteHp: 0,
                normalMovement: 0,
                eliteMovement: 0,
                normalRetaliate: 0,
                eliteRetaliate: 0,
                immunities: [],
                abilityCards: [] as MonsterAbilityCard[]
            };

        // stats
        if (m.isElite) {
            row.eliteAtk = m.attack;
            row.eliteArmor = m.armor;
            row.eliteHp = m.hp;
            row.eliteMovement = m.movement;
            row.eliteRetaliate = m.retaliate;
        } else {
            row.normalAtk = m.attack;
            row.normalArmor = m.armor;
            row.normalHp = m.hp;
            row.normalMovement = m.movement;
            row.normalRetaliate = m.retaliate;
        }

        // ✅ merge immunities (union)
        {
            const merged = new Set<string>(row.immunities);
            for (const imm of (m.immunities ?? [])) {
                const val = (imm ?? '').trim();
                if (val) merged.add(val);
            }
            row.immunities = [...merged];
        }

        // ✅ merge ability cards from monsterList (dedupe by cardId)
        {
            const existingIds = new Set<number>(
                (row.abilityCards ?? [])
                    .map(c => c?.cardId)
                    .filter((id): id is number => typeof id === 'number')
            );

            for (const c of (m.abilityCards ?? []) as MonsterAbilityCard[]) {
                const id = c?.cardId;
                if (typeof id === 'number') {
                    if (!existingIds.has(id)) {
                        row.abilityCards.push(c);
                        existingIds.add(id);
                    }
                } else {
                    // if some cards lack cardId, still include them (optional)
                    row.abilityCards.push(c);
                }
            }
        }

        map.set(m.type, row);
    }

    const rows = [...map.values()];

    // keep immunities stable + pretty
    for (const r of rows) r.immunities.sort((a, b) => a.localeCompare(b));

    // initiative stats (from merged abilityCards)
    for (const r of rows) {
        const cards = r.abilityCards ?? [];

        if (!cards.length) {
            r.minInitiative = undefined;
            r.maxInitiative = undefined;
            r.avgInitiative = undefined;
            continue;
        }

        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let count = 0;

        for (const c of cards) {
            const init = c?.initiative;
            if (typeof init !== 'number') continue;

            min = Math.min(min, init);
            max = Math.max(max, init);
            sum += init;
            count++;
        }

        if (count > 0) {
            r.minInitiative = min;
            r.maxInitiative = max;
            r.avgInitiative = Math.round(sum / count);
        } else {
            r.minInitiative = undefined;
            r.maxInitiative = undefined;
            r.avgInitiative = undefined;
        }
    }

    return rows;
}

    private getAllScenarioMonsters(id: string | number): string[] {
        const scenarioMonsters =
            this.dataLoader.getData().scenarios?.filter(s => s.index === id).flatMap(s => s.monsters ?? []) ?? [];

        const sectionMonsters =
            this.dataLoader.getData().sections?.filter(s => s.parent === id).flatMap(s => s.monsters ?? []) ?? [];

        return Array.from(
            new Set(
                [...scenarioMonsters, ...sectionMonsters]
                    .map(m => (m ?? "").trim())
                    .filter(Boolean)
            )
        );
    }

    getCreaturePic(type): string {
        return `./images/monster/thumbnail/fh-${type}.png`
    }

    onImgError(event: Event) {
        const target = event.target as HTMLImageElement;
        target.src = './images/bb/daemon-skull.svg';
    }
}