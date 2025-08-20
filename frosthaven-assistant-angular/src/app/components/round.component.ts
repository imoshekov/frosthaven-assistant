import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from "@angular/core";
import { GlobalTelInputDirective } from "../directives/global-tel-input.directive";
import { AppContext } from "../app-context";
import { ElementComponent } from "./element.component";
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

    ngOnInit(): void {
        this.sub = this.wsService.roundUpdate$.subscribe((roundNum) => {
            this.roundNumber = roundNum;   // update the component state
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    nextRound(): void {
        this.resetCharacters();
        this.resetElements();
        // Advance round
        this.roundNumber++;
        this.appContext.roundNumber = this.roundNumber; // Update the app context
        this.roundAdvanced.emit(this.roundNumber);
        this.wsService.sendRoundNumber(this.roundNumber);
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