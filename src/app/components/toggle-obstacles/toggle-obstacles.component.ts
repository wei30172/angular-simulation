import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle-obstacles',
  templateUrl: './toggle-obstacles.component.html',
  styleUrls: ['./toggle-obstacles.component.scss']
})
export class ToggleObstaclesComponent {
  @Input() obstacleVisible = true;
  @Output() visibilityChange = new EventEmitter<boolean>();
  
  toggleObstaclesVisibility() {
    this.obstacleVisible = !this.obstacleVisible;
    this.visibilityChange.emit(this.obstacleVisible);
  }
}
