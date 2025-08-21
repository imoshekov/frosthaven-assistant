import { Injectable } from '@angular/core';
import { AppContext } from '../app-context';

import { NotificationService } from './notification.service';
import { LocalStorageService } from './local-storage.service';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

export enum WebSocketRole {
  Host = 'host',
  Client = 'client'
}

export enum WebSocketMessageType {
  JoinSession = 'join-session',
  ElementsUpdate = 'elements-update',
  RoundUpdate = 'round-update',
  GraveyardUpdate = 'graveyard-update',
  CharactersUpdate = 'characters-update'
}


@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  public sessionId: number = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnecting = false;
  private role: WebSocketRole;
  private updatingFromServer = false;
  private clientId: string | null = null;
  private clientIdSubject = new BehaviorSubject<string | null>(null);

  public clientId$ = this.clientIdSubject.asObservable();

  constructor(private appContext: AppContext,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService) {

    this.subscribeAndBroadcast(this.appContext.roundNumber$, WebSocketMessageType.RoundUpdate, (round) => ({ roundNumber: round }));
    this.subscribeAndBroadcast(this.appContext.creatures$, WebSocketMessageType.CharactersUpdate, (creatures) => ({ characters: creatures }));
    this.subscribeAndBroadcast(this.appContext.elements$, WebSocketMessageType.ElementsUpdate, (elements) => ({ elements }));
  }

  private subscribeAndBroadcast<T>(
    observable: Observable<T>,
    type: WebSocketMessageType,
    selector: (value: T) => any
  ) {
    observable.subscribe((value) => {
      if (!this.updatingFromServer) {
        this.sendUpdateMessage(type, { ...selector(value), originatingClientId: this.clientId });
      }
    });
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
        type: WebSocketMessageType.JoinSession,
        // Only send sessionId if joining as a guest
        ...(this.role !== WebSocketRole.Host && { sessionId: sessionId }),
        characters: this.role === WebSocketRole.Host ? this.appContext.getCreatures() : [],
        // graveyard: this.role === WebSocketRole.Host ? this.appContext.getGraveyard() : [],
        roundNumber: this.role === WebSocketRole.Host ? this.appContext.getRoundNumber() : 1,
        elementStates: this.role === WebSocketRole.Host ? this.appContext.getElements() : []
      };

      this.ws.send(JSON.stringify(joinSessionPayload));

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

      if (data.originatingClientId === this.clientId) return;
      this.updatingFromServer = true;
      switch (data.type) {
        case WebSocketMessageType.CharactersUpdate:
          this.appContext.setCreatures(data.characters);
          break;
        case WebSocketMessageType.GraveyardUpdate:
          this.appContext.setGraveyard(data.graveyard);
          break;
        case WebSocketMessageType.RoundUpdate:
          this.appContext.setRoundNumber(data.roundNumber);
          break;
        case WebSocketMessageType.ElementsUpdate:
          this.appContext.setElements(data.elements);
          break;
        default:
          this.notificationService.emitErrorMessage(`Unhandled message type: ${data.type}`);
          break;
      }
      this.updatingFromServer = false;
    };
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

  private sendUpdateMessage(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data, originatingClientId: this.clientId }));
    }
  }

   private handleSessionJoined(data: any) {
    this.clientId = data.clientId;
    this.clientIdSubject.next(this.clientId);
    this.sessionId = data.sessionId;
    this.localStorageService.setSessionId(data.sessionId);
    this.requestServerState(this.getSessionId());
    this.notificationService.emitInfoMessage(`Connected to session ${data.sessionId}.`);
  }

  private requestServerState(sessionId: string | number) {
    this.sendUpdateMessage('request-latest-state', { sessionId });
  }

  private getSessionId() {
    return this.sessionId || this.localStorageService.loadSessionId();
  }
}
