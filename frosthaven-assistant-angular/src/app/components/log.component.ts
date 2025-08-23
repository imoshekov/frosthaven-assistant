import { Component, OnInit } from '@angular/core';
import { map, Observable } from 'rxjs';
import { LogService} from '../services/log.service';
import { LogEntry } from '../types/game-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-log',
  standalone: true,
  imports: [CommonModule, FormsModule],   // ✅ async and ngModel pipes
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})

export class LogComponent implements OnInit {
  logs$!: Observable<LogEntry[]>;
  characters$!: Observable<{ text: string; value: string }[]>;
  filteredLogs$!: Observable<LogEntry[]>;

  selected: string[] = [];

  constructor(private logService: LogService) {}

  ngOnInit() {
    this.logs$ = this.logService.logs$;
    this.characters$ = this.logService.characters$;
    this.filteredLogs$ = this.logs$; // default: show all logs
  }

  onFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selected = Array.from(target.selectedOptions).map(o => o.value);

    this.filteredLogs$ = this.logs$.pipe(
      map((logs: LogEntry[]) =>
        this.selected.length === 0
          ? logs
          : logs.filter(l => this.selected.includes(l.creature))
      )
    );
  }
}
