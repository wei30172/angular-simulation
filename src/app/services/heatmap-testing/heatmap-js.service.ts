import { Injectable } from '@angular/core';
import h337, { HeatmapConfiguration, HeatmapInstance } from 'heatmap.js';

@Injectable({
  providedIn: 'root',
})
export class HeatmapJsService {
  private heatmapInstance: HeatmapInstance | null = null;

  // Default configuration values for heatmap
  private readonly DEFAULT_RADIUS = 40; // Default radius size for heatmap points
  private readonly DEFAULT_MAX_OPACITY = 0.6; // Default maximum opacity for heatmap intensity
  private readonly DEFAULT_MIN_OPACITY = 0.1; // Default minimum opacity for heatmap intensity
  private readonly DEFAULT_BLUR = 0.85; // Default blur factor applied to point

  // Initialize the heatmap instance
  initializeHeatmap(container: HTMLElement, config: Partial<HeatmapConfiguration> = {}) {
    const fullConfig: HeatmapConfiguration = {
      container,
      radius: config.radius || this.DEFAULT_RADIUS,
      maxOpacity: config.maxOpacity || this.DEFAULT_MAX_OPACITY,
      minOpacity: config.minOpacity || this.DEFAULT_MIN_OPACITY,
      blur: config.blur || this.DEFAULT_BLUR,
      ...config,
    };
    this.heatmapInstance = h337.create(fullConfig);
  }

  // Set heatmap data
  setHeatmapData(data: { x: number; y: number; value: number }[]) {
    const max = Math.max(...data.map(d => d.value));
    this.heatmapInstance?.setData({data, max});
  }

  // Force re-rendering of the heatmap
  render() {
    this.heatmapInstance?.repaint();
  }

  // Clear the heatmap data
  clearHeatmap() {
    if (this.heatmapInstance) {
      this.heatmapInstance.setData({ max: 0, data: [] });
    }
  }
}