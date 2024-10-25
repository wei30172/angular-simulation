import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Component({
  selector: 'app-obstacle-list',
  templateUrl: './obstacle-list.component.html',
  styleUrls: ['./obstacle-list.component.scss']
})
export class ObstacleListComponent {
  @Input() obstacleList: Obstacle[] = [];
  @Output() selectObstacle = new EventEmitter<number>();
  @Output() deleteObstacle = new EventEmitter<number>();

  onSelectObstacle(id: number) {
    this.selectObstacle.emit(id);
  }

  onDeleteObstacle(id: number) {
    this.deleteObstacle.emit(id);
  }
}