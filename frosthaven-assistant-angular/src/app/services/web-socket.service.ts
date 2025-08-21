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
  private ws: WebSocket | null = null;
  private isConnected = false;
  public sessionId: number = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private clientId: string | null = null;
  private reconnecting = false;
  private role: WebSocketRole;
  private updatingFromServer = false;


  constructor(private appContext: AppContext,
    private notificationService: NotificationService,
    private localStorageService: LocalStorageService) {

    // Only subscribe once, regardless of how many times connect() is called
    // Broadcast round number changes
    this.appContext.roundNumber$.subscribe((round: number) => {
      if (!this.updatingFromServer) {
        this.sendUpdateMessage('round-update', { roundNumber: round, originatingClientId: this.clientId });
      }
    });
    this.appContext.creatures$.subscribe((creatures) => {
      if (!this.updatingFromServer) {
        this.sendUpdateMessage('characters-update', {
          characters: creatures,
          originatingClientId: this.clientId
        });
      }
    });
    this.appContext.elements$.subscribe((elements) => {
      if (!this.updatingFromServer) {
        this.sendUpdateMessage('elements-update', {
          elements,
          originatingClientId: this.clientId
        });
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
        type: 'join-session',
        // Only send sessionId if joining as a guest
        ...(this.role !== WebSocketRole.Host && { sessionId: sessionId }),
        characters: this.role === WebSocketRole.Host ? this.appContext.getCreatures() : [],
        // graveyard: this.role === WebSocketRole.Host ? this.appContext.getGraveyard() : [],
        roundNumber: this.role === WebSocketRole.Host ? this.appContext.getRoundNumber() : 1,
        elementStates: this.role === WebSocketRole.Host ? this.appContext.getElements() : []
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

      if (data.originatingClientId === this.clientId) return;
      this.updatingFromServer = true;
      switch (data.type) {
        case 'characters-update':
           this.appContext.setCreatures(data.characters);
          break;
        case 'graveyard-update':
           this.appContext.setGraveyard(data.graveyard);
          break;
        case 'round-update':
          this.appContext.setRoundNumber(data.roundNumber);
          break;
        case 'elements-update':
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
    this.sessionId = data.sessionId;
    this.localStorageService.setSessionId(data.sessionId);
    this.clientId = data.clientId;
    this.requestServerState(this.getSessionId());

    // Emit info message about the session join
    this.notificationService.emitInfoMessage(`Connected to session ${data.sessionId}.`);
  }

  private requestServerState(sessionId: string | number) {
    this.sendUpdateMessage('request-latest-state', { sessionId });
  }
  
  private getSessionId() {
    return this.sessionId || this.localStorageService.loadSessionId();
  }
}
