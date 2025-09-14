import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'input[type=tel]'
})
export class GlobalTelInputDirective {
  private previousValue: string = '';

  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('focus')
  onFocus() {
    this.previousValue = this.el.nativeElement.value;
    this.el.nativeElement.value = '';
  }

  @HostListener('blur')
  onBlur() {
    if (this.el.nativeElement.value === '') {
      this.el.nativeElement.value = this.previousValue;
      this.el.nativeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
