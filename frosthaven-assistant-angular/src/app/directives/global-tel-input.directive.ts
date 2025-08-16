// src/app/directives/global-tel.directive.ts
import { Directive, ElementRef, AfterViewInit } from '@angular/core';

@Directive({
  selector: 'input[type=tel]' // automatically matches all tel inputs
})
export class GlobalTelInputDirective implements AfterViewInit {
  private previousValue: string = '';

  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit() {
    const input = this.el.nativeElement;

    // Focus
    input.addEventListener('focus', () => {
      this.previousValue = input.value;
      input.value = '';
    });

    // Blur
    input.addEventListener('blur', () => {
      if (input.value === '') {
        input.value = this.previousValue;
      }
    });
  }
}
