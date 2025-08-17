import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class StringUtils {
  parseInt(input: string | number): number {
    return parseInt(input !== undefined ? String(input) : '0') || 0
  }
}
