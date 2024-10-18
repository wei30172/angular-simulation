import { Injectable } from '@angular/core';
import { Obstacle } from '../features/obstacle-testing/obstacle.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ObstacleService {
  private obstaclesSubject = new BehaviorSubject<Obstacle[]>([]);
  public obstacles$ = this.obstaclesSubject.asObservable();

  // Generate random obstacles
  generateRandomObstacles(
    count: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const obstacles: Obstacle[] = new Array(count)

    for (let i = 0; i < count; i++) {
      // Randomly generate the width and height between 20 and 120
      const randomWidth = Math.random() * 100 + 20;
      const randomHeight = Math.random() * 100 + 20;

      // Ensure x and y positions keep the rectangle within canvas bounds
      const randomX = Math.random() * (canvasWidth - randomWidth);
      const randomY = Math.random() * (canvasHeight - randomHeight);

      // Use Date.now() for unique id generation
      // Ensure a unique id even if called in quick succession
      const id = Date.now() + i;

      // Add the obstacle data into the list
      obstacles[i] = {
        id: id,
        x: randomX,
        y: randomY,
        width: randomWidth,
        height: randomHeight,
        color: this.getRandomColor(),
      };

      this.obstaclesSubject.next(obstacles);
    }
  }

  // Generate a random color in hexadecimal format
  getRandomColor(): string {
    // Generate a random number between 0x000000 and 0xFFFFFF and convert to hex
    return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  }

  // Return the list of obstacles
  getCurrentObstacles(): Obstacle[] {
    return this.obstaclesSubject.getValue();
  }

  // Add a new obstacle to the list
  addObstacle(obstacle: Obstacle): void {
    const currentObstacles = this.obstaclesSubject.getValue();
    this.obstaclesSubject.next([...currentObstacles, obstacle]);
  }

  // Update an obstacle's properties
  updateObstacle(id: number, updatedProps: Partial<Obstacle>): void {
    const obstacles = this.obstaclesSubject.getValue();
    const obstacleIndex = obstacles.findIndex(obstacle => obstacle.id === id);
    if (obstacleIndex >= 0) {
      // Merge the updated properties into the existing obstacle
      obstacles[obstacleIndex] = { ...obstacles[obstacleIndex], ...updatedProps };
      this.obstaclesSubject.next([...obstacles]);
    }
  }

  // Remove an obstacle from the list
  removeObstacle(id: number): void {
    let obstacles = this.obstaclesSubject.getValue();
    obstacles = obstacles.filter(obstacle => obstacle.id !== id);
    this.obstaclesSubject.next([...obstacles]);
  }
}