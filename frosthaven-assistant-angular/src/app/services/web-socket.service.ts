import { Injectable } from '@angular/core';
import { AppContext } from '../app-context';
import { Subject } from 'rxjs';

import { NotificationService } from './notification.service';
import { LocalStorageService } from './local-storage.service';

export enum WebSocketRole {
  Host = 'host',
  Client = 'client'
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private enableHostClientStuff = false;
  private ws: WebSocket | null = null;
  private isConnected = false;
  public sessionId: number = 0;
  public lastPingedTime: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private clientId: string | null = null;
  private reconnecting = false;
  private role: WebSocketRole;
  roundUpdate$ = new Subject<number>();
  private updatingFromServer = false;


  constructor(private appContext: AppContext,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService) {

    // Broadcast round number changes
    // Only subscribe once, regardless of how many times connect() is called
    this.appContext.roundNumber$.subscribe((round: number) => {
      if (!this.updatingFromServer) {
        this.sendUpdateMessage('round-update', { roundNumber: round, originatingClientId: this.clientId });
      }
    });

  }

  private sendUpdateMessage(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data, originatingClientId: this.clientId }));
    }
  }


  sendCharactersUpdate() {
    this.sendUpdateMessage('characters-update', { characters: this.appContext.getCreatures() });
  }

  sendGraveyardUpdate() {
    this.sendUpdateMessage('graveyard-update', { graveyard: this.appContext.getGraveyard() });
  }

  sendRoundNumber(roundNumberValue: number) {
    this.sendUpdateMessage('round-update', { roundNumber: roundNumberValue });
  }

  sendElementState(elementId: string, elementState: any) {
    this.sendUpdateMessage('element-update', { elementId, elementState });
  }

  requestServerState(sessionId: string | number) {
    this.sendUpdateMessage('request-latest-state', { sessionId });
  }

  sendMonsterAdded(monster: any) {
    this.sendUpdateMessage('add-monster', { monster });
  }

  sendInitiativeReset(value = 0) {
    this.sendUpdateMessage('initiative-reset', { value });
  }

  // Event handlers emit to observables
  private handleSessionJoined(data: any) {
    this.sessionId = data.sessionId;
    this.localStorageService.setSessionId(data.sessionId);
    this.clientId = data.clientId;
    this.requestServerState(this.getSessionId());

    // Emit info message about the session join
    this.notificationService.emitInfoMessage(`Connected to session ${data.sessionId}.`);
  }

  public connect(role: WebSocketRole, sessionId: number = 1) {
    this.role = role;

    this.ws = new WebSocket(
      window.location.hostname.includes('github.io')
        ? 'wss://frosthaven-assistant.onrender.com'
        : 'ws://localhost:8080'
    );

    this.ws.onopen = () => {
      const joinSessionPayload: any = {
        type: 'join-session',
        sessionId: sessionId,
        // characters: this.role === WebSocketRole.Host ? this.appContext.getCreatures() : [],
        // graveyard: this.role === WebSocketRole.Host ? this.appContext.getGraveyard() : [],
        roundNumber: this.role === WebSocketRole.Host ? this.appContext.getRoundNumber() : 1,
        // elementStates: this.role === WebSocketRole.Host ? this.appContext.elementStates : {}
      };

      // Send initial join payload with the correct round number
      this.ws!.send(JSON.stringify(joinSessionPayload));

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notificationService.emitInfoMessage('Connected to server successfully');
    };


    this.ws.onerror = (error) => {
      this.isConnected = false;
      this.notificationService.emitErrorMessage('Unable to connect to the server. Retrying...');
      this.tryReconnect();
    };

    this.ws.onclose = () => {
      if (this.isConnected) {
        this.notificationService.emitInfoMessage("The connection was closed. Trying to reconnect.");
      }
      this.isConnected = false;
      this.tryReconnect();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'session-joined') {
        return this.handleSessionJoined(data);
      }

      if (this.enableHostClientStuff && this.role === 'host') {
        return;
      }
      if (data?.originatingClientId === this.clientId) {
        return;
      }
      // Optionally filter by clientId/role
      switch (data.type) {
        case 'characters-update':
          this.handleCharacterUpdate(data);
          break;
        case 'graveyard-update':
          this.handleGraveyardUpdate(data);
          break;
        case 'round-update':
          this.handleRoundUpdate(data);
          break;
        case 'element-update':
          this.handleElementUpdate(data);
          break;
        case 'add-monster':
          this.handleMonsterAdded(data);
          break;
        case 'initiative-reset':
          this.handleInitiativeReset(data);
          break;
        default:
          console.warn(`Unhandled message type: ${data.type}`);
          this.notificationService.emitErrorMessage(`Unhandled message type: ${data.type}`);
          break
      }
    };
  }

  private getSessionId() {
    return this.sessionId || this.localStorageService.loadSessionId();
  }

  private tryReconnect() {
    if (this.reconnecting) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnecting = true;
      this.reconnectAttempts++;

      const delay = Math.min(500 * Math.pow(2, this.reconnectAttempts - 1), 30000);

      setTimeout(() => {
        this.connect(this.role);
        this.reconnecting = false;
      }, delay);
    } else {
      // Maximum reconnection attempts reached
      this.notificationService.emitErrorMessage('Failed to reconnect after multiple attempts. Please refresh the page or check your connection.');
    }
  }

  private handleCharacterUpdate(data: any) {
    this.appContext.setCreatures(data.characters);
  }

  private handleGraveyardUpdate(data: any) {
    this.appContext.setGraveyard(data.graveyard);
  }

  private handleRoundUpdate(data: any) {
    if (data.originatingClientId === this.clientId) return;

    this.updatingFromServer = true;
    this.appContext.setRoundNumber(data.roundNumber);
    this.updatingFromServer = false;
  }

  private handleElementUpdate(data: any) {
    // this.appContext.elementStates = data.elementStates;
  }

  private handleMonsterAdded(data: any) {
    this.appContext.addCreature(data.monster);
  }

  private handleInitiativeReset(data: any) {
    this.appContext.getCreatures().forEach(creature => {
      creature.initiative = data.value;
    });
  }
}
