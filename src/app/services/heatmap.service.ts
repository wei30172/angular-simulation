import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HeatmapService {
  getHeatmapData() {
    return [
      { x: 50, y: 50, intensity: 0.5 },
      { x: 100, y: 100, intensity: 0.8 }
    ];
  }
}