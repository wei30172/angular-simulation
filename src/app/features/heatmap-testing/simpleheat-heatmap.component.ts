import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

import { HeatmapDataService } from 'src/app/services/heatmap-testing/heatmap-data.service';
import { SimpleheatService } from 'src/app/services/heatmap-testing/simpleheat.service';

@Component({
  selector: 'app-fabric-obstacle',
  templateUrl: './simpleheat-heatmap.component.html',
  styleUrls: ['./simpleheat-heatmap.component.scss']
})
export class SimpleheatHeatmapComponent implements OnInit, OnDestroy {
  @ViewChild('simpleHeatCanvas', { static: true }) simpleHeatCanvas!: ElementRef<HTMLCanvasElement>;
  
  heatmapImageUrl: string = ''; 

  // Constants for canvas behavior
  private readonly HEATMAP_DATA_COUNT = 100;

  constructor(
    private heatmapDataService: HeatmapDataService,
    private simpleheatService: SimpleheatService,
  ) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.renderHeatmapWithSimpleheat(); // Render heatmap
  }
  
  ngOnDestroy() {}

  // Render heatmap using SimpleheatService
  private renderHeatmapWithSimpleheat() {
    const heatmapCanvas = this.simpleHeatCanvas.nativeElement;

    // Ensure the heatmap canvas matches the canvas dimensions
    heatmapCanvas.width = 640;
    heatmapCanvas.height = 640;

    // Generate heatmap data that covers the entire canvas area
    const heatmapData = this.heatmapDataService.generateHeatmapData(
      this.HEATMAP_DATA_COUNT,
      640,
      640
    );
    
    // Initialize heatmap instance
    this.simpleheatService.initializeHeatmap(heatmapCanvas);

    // Format data for Simpleheat
    const formattedData = heatmapData.map((point) => [point.x, point.y, point.value] as [number, number, number]);
    this.simpleheatService.setHeatmapData(formattedData);

    // Render the heatmap to the canvas
    this.simpleheatService.render();

    // Use requestAnimationFrame to wait for rendering completion
    requestAnimationFrame(() => {
      this.heatmapImageUrl = heatmapCanvas.toDataURL('image/png');
    });
  }
}
