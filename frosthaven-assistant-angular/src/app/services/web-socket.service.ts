import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AppContext } from '../app-context';
import { NotificationService } from './notification.service';
import { LocalStorageService } from './local-storage.service';

export type WebSocketRole = 'host' | 'client';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private enableHostClientStuff = false;
  private ws: WebSocket | null = null;
  private isConnected = false;
  public sessionId: number = 0;
  public lastPingedTime: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pingServerInterval = 300000;
  private clientId: string | null = null;
  private role: WebSocketRole | null = null;
  private reconnecting = false;

  constructor(private appContext: AppContext,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService
  ) { }

  initialize(role: WebSocketRole) {
    this.sessionId = 1;
    this.role = role;
    this.connect();
  }

  keepServerAlive() {
    setInterval(() => {
      fetch('https://frosthaven-assistant.onrender.com/ping')
        .then(response => {
          if (!response.ok) {
            console.error('Server ping failed:', response.status);
          } else {
            this.lastPingedTime = new Date().toLocaleTimeString();
          }
        })
        .catch(error => console.error('Error pinging server:', error));
    }, this.pingServerInterval);
  }

  sendUpdateMessage(type: string, payload: any) {
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ type, ...payload }));
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
    this.localStorageService.setSessionId(this.sessionId);
    this.clientId = data.clientId;

    this.requestServerState(this.getSessionId());

    // Emit info message about the session join
    this.emitInfoMessage(`Connected to session: ${data.sessionId}.`);
  }

  private connect() {
    this.ws = new WebSocket(
      window.location.hostname.includes('github.io')
        ? 'wss://frosthaven-assistant.onrender.com'
        : 'ws://localhost:8080'
    );

    this.ws.onopen = () => {
      let sessionId = this.getSessionId();
      if (!sessionId) {
        if (this.role === 'client') {
          // Angular: get sessionId from component input
          // this.sessionId = ...
        } else if (this.role === 'host') {
          this.sessionId = 0;
        }
      }
      const joinSessionPayload: any = {
        type: 'join-session',
        sessionId: this.sessionId,
        characters: [],
        graveyard: [],
      };

      if (this.role === 'host') {
        joinSessionPayload.characters = this.appContext.getCreatures();
        joinSessionPayload.roundNumber = this.appContext.roundNumber;
        joinSessionPayload.graveyard = this.appContext.getGraveyard();
        joinSessionPayload.elementStates = this.appContext.elementStates;
      }

      this.ws!.send(JSON.stringify(joinSessionPayload));
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emitInfoMessage('Connected to server successfully');
    };

    this.ws.onerror = (error) => {
      this.isConnected = false;
      this.emitErrorMessage('Unable to connect to the server. Retrying...');
      this.tryReconnect();
    };

    this.ws.onclose = () => {
      if (this.isConnected) {
        this.emitInfoMessage("The connection was closed. Trying to reconnect.");
      }
      this.isConnected = false;
      this.tryReconnect();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'session-joined') {
        this.handleSessionJoined(data);
        return;
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
        this.connect();
        this.reconnecting = false;
      }, delay);
    } else {
      // Maximum reconnection attempts reached
      this.emitErrorMessage('Failed to reconnect after multiple attempts. Please refresh the page or check your connection.');
    }
  }

  private handleCharacterUpdate(data: any) {
    this.appContext.setCreatures(data.characters);
  }

  private handleGraveyardUpdate(data: any) {
    this.appContext.setGraveyard(data.graveyard);
  }

  private handleRoundUpdate(data: any) {
    this.appContext.roundNumber = data.roundNumber;
  }

  private handleElementUpdate(data: any) {
    this.appContext.elementStates = data.elementStates;
  }

  private handleMonsterAdded(data: any) {
    this.appContext.addCreature(data.monster);
  }

  private handleInitiativeReset(data: any) {
    this.appContext.getCreatures().forEach(creature => {
      creature.initiative = data.value;
    });
  }

  private emitErrorMessage(message: string): void {
    this.notificationService.emitErrorMessage(message);
  }

  private emitInfoMessage(message: string): void {
    this.notificationService.emitInfoMessage(message);
  }
}
