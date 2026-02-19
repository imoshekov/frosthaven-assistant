import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConnectionStatus, WebSocketService } from '../../../services/web-socket.service';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss']
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {
  status: string = ConnectionStatus.Disconnected;
  sessionId: number | null = null;
  private sub: Subscription;

  private readonly labels: Record<ConnectionStatus, string> = {
    [ConnectionStatus.Connected]:    'Connected',
    [ConnectionStatus.Connecting]:   'Connecting',
    [ConnectionStatus.Reconnecting]: 'Reconnecting',
    [ConnectionStatus.Disconnected]: 'Offline',
    [ConnectionStatus.Failed]:       'Connection lost',
  };

  get label(): string {
    return this.labels[this.status as ConnectionStatus] ?? 'Unknown';
  }

  constructor(private wsService: WebSocketService) {}

  ngOnInit() {
    this.sub = new Subscription();
    this.sub.add(this.wsService.connectionStatus$.subscribe(s => this.status = s));
    this.sub.add(this.wsService.sessionId$.subscribe(id => this.sessionId = id));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}