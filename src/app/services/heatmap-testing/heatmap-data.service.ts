import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HeatmapDataService {
  generateHeatmapData(count: number, width: number, height: number): { x: number; y: number; value: number }[] {
    const heatmapData = [];
    // Generate a random point within the canvas dimensions
    for (let i = 0; i < count; i++) {
      heatmapData.push({
        x: Math.random() * width,
        y: Math.random() * height,
        value: Math.random(), // Random intensity value between 0 and 1
      });
    }
    return heatmapData;
  }
}