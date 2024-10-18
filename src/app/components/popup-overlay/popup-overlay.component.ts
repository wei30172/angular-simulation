import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-popup-overlay',
  template: `
    <div class="popup-overlay" (click)="onClose()"></div>
  `,
  styleUrls: ['./popup-overlay.component.scss']
})
export class PopupOverlayComponent {
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit(); // Emit close event to parent
  }
}