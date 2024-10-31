import { Injectable } from '@angular/core';
import simpleheat from 'simpleheat';

@Injectable({
  providedIn: 'root',
})
export class SimpleheatService {
  private heatmapInstance: simpleheat | null = null;
  
   // Default configuration values for heatmap
  private readonly DEFAULT_RADIUS = 50; // Default radius size for heatmap points
  private readonly DEFAULT_BLUR_FACTOR = 0.8; // Default blur factor applied to point
  private readonly DEFAULT_MAX_VALUE = 1; // Default maximum value for heat intensity scaling

  // Initialize the heatmap instance
  initializeHeatmap(canvas: HTMLCanvasElement, radius: number = this.DEFAULT_RADIUS, max: number = this.DEFAULT_MAX_VALUE) {
    this.heatmapInstance = simpleheat(canvas);
    this.heatmapInstance.radius(radius, radius * this.DEFAULT_BLUR_FACTOR);
    this.heatmapInstance.max(max);

     // Set gradient colors for heatmap based on intensity values
    this.heatmapInstance.gradient({
      0.0: 'navy',
      0.2: 'blue',
      0.4: 'cyan',
      0.6: 'lime',
      0.8: 'yellow',
      1.0: 'red',
    });
  }

  // Set the data points for the heatmap
  setHeatmapData(points: [number, number, number][]) {
    this.heatmapInstance?.data(points);
  }

  // Render the heatmap on the canvas
  render() {
    this.heatmapInstance?.draw();
  }
  
  // Clear the heatmap and redraw
  clearHeatmap() {
    if (this.heatmapInstance) {
      this.heatmapInstance.clear();
      this.heatmapInstance.draw();
    }
  }
}
