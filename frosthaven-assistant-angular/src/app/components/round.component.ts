import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from "@angular/core";
import { AppContext } from "../app-context";
import { Element, ElementState } from '../types/game-types';
import { Subscription } from "rxjs";
import { WebSocketService } from "../services/web-socket.service";


@Component({
    selector: 'app-round',
    templateUrl: './round.component.html',
    styleUrls: ['./round.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class RoundComponent implements OnInit, OnDestroy {
    roundNumber: number = 1;

    @Output() roundAdvanced = new EventEmitter<number>();
    @Input() elements: Element[] = [];

    private sub?: Subscription;

    constructor(public appContext: AppContext, private wsService: WebSocketService) { }

    ngOnInit() {
        // Listen to changes from AppContext
        this.appContext.roundNumber$.subscribe((round: number) => {
            this.roundNumber = round;
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    nextRound(): void {
        this.resetCharacters();
        this.resetElements();

        const newRound = this.roundNumber + 1;
        this.roundNumber = newRound;

        // Update AppContext
        this.appContext.setRoundNumber(newRound);

        // Emit local event for UI
        this.roundAdvanced.emit(newRound);
    }

    private resetCharacters(): void {
        this.appContext.getCreatures().forEach(creature => {
            this.appContext.updateCreatureBaseStat(creature.id!, 'initiative', 0);
            this.appContext.updateCreatureBaseStat(creature.id!, 'roundArmor', 0);
            this.appContext.updateCreatureBaseStat(creature.id!, 'roundRetaliate', 0);
        });
    }

    private resetElements(): void {
        this.elements.forEach(el => {
            if (el.state === ElementState.Half) {
                el.state = ElementState.None;
            }
            else if (el.state === ElementState.Full) {
                el.state = ElementState.Half;
            }
        });
    }
}