import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-zoom-controls',
  templateUrl: './zoom-controls.component.html',
  styleUrls: ['./zoom-controls.component.scss']
})
export class ZoomControlsComponent {
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveLeft = new EventEmitter<void>();
  @Output() moveRight = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() resetZoom = new EventEmitter<void>();
  @Output() toggleGrid = new EventEmitter<void>();
}