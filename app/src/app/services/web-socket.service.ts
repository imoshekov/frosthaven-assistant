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
  CharactersUpdate = 'characters-update',
  ScenarioUpdate = 'scenario-update'
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Failed = 'failed'
}


@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnecting = false;
  private role: WebSocketRole;
  private updatingFromServer = false;
  private clientId: string | null = null;
  private clientIdSubject = new BehaviorSubject<string | null>(null);
  private sessionId: number = 0;
  private sessionIdSubject = new BehaviorSubject<number>(null);
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Disconnected);

  public clientId$ = this.clientIdSubject.asObservable();
  public sessionId$ = this.sessionIdSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();


  constructor(private appContext: AppContext,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService) {

    this.subscribeAndBroadcast(this.appContext.roundNumber$, WebSocketMessageType.RoundUpdate, (round) => ({ roundNumber: round }));
    this.subscribeAndBroadcast(this.appContext.creatures$, WebSocketMessageType.CharactersUpdate, (creatures) => ({ characters: creatures }));
    this.subscribeAndBroadcast(this.appContext.elements$, WebSocketMessageType.ElementsUpdate, (elements) => ({ elements }));
    this.subscribeAndBroadcast(this.appContext.scenarioId$, WebSocketMessageType.ScenarioUpdate, (scenarioId) => ({ scenarioId }));

    // Proactively reconnect when the user returns to the tab/app after locking phone
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected && this.getSessionId()) {
        this.reconnectAttempts = 0;
        this.connect(this.role);
      }
    });
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

  public connect(role: WebSocketRole, sessionId?: number) {
    this.role = role;

    if (sessionId != null) {
      this.sessionId = sessionId;
      this.localStorageService.setSessionId(sessionId);
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Switching session or reconnecting');
    }

    this.connectionStatusSubject.next(
      this.reconnecting ? ConnectionStatus.Reconnecting : ConnectionStatus.Connecting
    );

    this.ws = new WebSocket(
      window.location.hostname.includes('github.io')
        ? 'wss://frosthaven-assistant.onrender.com'
        : 'ws://localhost:8080'
    );

    this.ws.onopen = () => {
      const sessionToJoin = this.getSessionId();
      const joinSessionPayload: any = {
        type: WebSocketMessageType.JoinSession,
        ...(sessionToJoin != null && { sessionId: sessionToJoin }),
        characters: this.role === WebSocketRole.Host ? this.appContext.getCreatures() : [],
        roundNumber: this.role === WebSocketRole.Host ? this.appContext.getRoundNumber() : 1,
        elementStates: this.role === WebSocketRole.Host ? this.appContext.getElements() : []
      };

      this.ws.send(JSON.stringify(joinSessionPayload));

      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Status moves to Connected only after session-joined is confirmed (see handleSessionJoined)
    };

    this.ws.onerror = (error) => {
      this.isConnected = false;
      this.tryReconnect();
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      // Only notify the user if we're not already trying to reconnect silently
      if (!this.reconnecting) {
        this.connectionStatusSubject.next(ConnectionStatus.Disconnected);
      }
      this.tryReconnect();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'session-joined') {
        return this.handleSessionJoined(data);
      }

      // Server tells us our command was a duplicate of another player's recent action.
      // Roll back local state by syncing from the server.
      if (data.type === 'command-rejected') {
        this.notificationService.emitErrorMessage(`Action blocked — another player just did the same thing`);
        this.requestServerState(this.getSessionId());
        return;
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
        case WebSocketMessageType.ScenarioUpdate:
          this.appContext.setScenarioId(data.scenarioId);
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
    if (!this.getSessionId()) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnecting = true;
      this.reconnectAttempts++;
      this.connectionStatusSubject.next(ConnectionStatus.Reconnecting);

      const delay = Math.min(500 * Math.pow(2, this.reconnectAttempts - 1), 30000);
      setTimeout(() => {
        this.connect(this.role, this.getSessionId());
        this.reconnecting = false;
      }, delay);
    } else {
      this.reconnecting = false;
      this.connectionStatusSubject.next(ConnectionStatus.Failed);
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
    this.sessionIdSubject.next(data.sessionId);

    this.connectionStatusSubject.next(ConnectionStatus.Connected);
    this.requestServerState(this.getSessionId());
  }

  private requestServerState(sessionId: string | number) {
    this.sendUpdateMessage('request-latest-state', { sessionId });
  }

  private getSessionId(): number | undefined {
    return this.sessionId || this.localStorageService.loadSessionId();
  }
}