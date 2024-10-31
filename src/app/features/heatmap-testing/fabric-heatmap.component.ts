import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { fabric } from 'fabric';

import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { FabricCanvasService } from 'src/app/services/obstacle-testing/fabric-canvas.service';
import { TooltipService } from 'src/app/services/obstacle-testing/tooltip.service';
import { HeatmapDataService } from 'src/app/services/heatmap-testing/heatmap-data.service';
import { SimpleheatService } from 'src/app/services/heatmap-testing/simpleheat.service';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Component({
  selector: 'app-fabric-obstacle',
  templateUrl: './fabric-heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class FabricHeatmapComponent implements OnInit, OnDestroy {
  @ViewChild('simpleHeatCanvas', { static: true }) simpleHeatCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Constants for canvas behavior
  private readonly DEFAULT_COLOR = '#00FFFF';
  private readonly HEATMAP_DATA_COUNT = 100;
  private readonly OBSTACLE_COUNT = 20;
  
  obstacleList: Obstacle[] = [];
  obstacleVisible = true;

  private canvas: fabric.Canvas;
  private obstacleMap: Map<number, fabric.Rect> = new Map();
  private destroy$ = new Subject<void>()

  constructor(
    private obstacleService: ObstacleGenerationService,
    private fabricCanvasService: FabricCanvasService,
    private tooltipService: TooltipService,
    private heatmapDataService: HeatmapDataService,
    private simpleheatService: SimpleheatService,
  ) {}

  ngOnInit() {
    this.initializeCanvas(); // Initialize the canvas
    this.loadBackgroundImage(); // Load the background image
    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToObstacles(); // Subscribe to obstacle data
  }

  ngAfterViewInit() {
    this.renderHeatmapWithSimpleheat(); // Render heatmap
  }

  ngOnDestroy() {
    if (this.canvas) {
      this.fabricCanvasService.clearService();
    }
    
    // Unsubscribe from all observables
    this.obstacleService.clearObstacles();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialize the canvas
  private initializeCanvas() {
    this.fabricCanvasService.initializeCanvas('fabricCanvas');
    this.canvas = this.fabricCanvasService.getCanvas();
  }

  // Load the background image for the canvas
  private loadBackgroundImage() {
    this.fabricCanvasService.loadBackgroundImage(
      'assets/images/floorplan.jpg',
      this.onBackgroundImageLoaded
    );
  }

  // Generate default obstacles
  private onBackgroundImageLoaded = () => {
    this.obstacleService.generateRandomObstacles(
      this.OBSTACLE_COUNT,
      this.canvas.width,
      this.canvas.height
    );
  }
  
  // Render heatmap using SimpleheatService
  private renderHeatmapWithSimpleheat() {
    const heatmapCanvas = this.simpleHeatCanvas.nativeElement;

    // Ensure the heatmap canvas matches the canvas dimensions
    heatmapCanvas.width = this.canvas.width;
    heatmapCanvas.height = this.canvas.height;

    // Generate heatmap data that covers the entire canvas area
    const heatmapData = this.heatmapDataService.generateHeatmapData(
      this.HEATMAP_DATA_COUNT,
      this.canvas.width,
      this.canvas.height
    );
    
    // Initialize heatmap instance
    this.simpleheatService.initializeHeatmap(heatmapCanvas);

    // Format data for Simpleheat
    const formattedData = heatmapData.map((point) => [point.x, point.y, point.value] as [number, number, number]);
    this.simpleheatService.setHeatmapData(formattedData);

    // Render the heatmap to the canvas
    this.simpleheatService.render();

    // Convert the heatmap canvas to a PNG image URL
    const heatmapImageUrl = heatmapCanvas.toDataURL('image/png');

    // Add the generated heatmap as a fabric.Image to the Fabric canvas
    this.fabricCanvasService.addHeatmapLayer(heatmapImageUrl);
  }

  // Bind canvas events for interaction
  private bindCanvasEvents() {
    this.canvas.on('mouse:wheel', (event) => this.handleMouseWheel(event));
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: fabric.IEvent) {
    const wheelEvent = event.e as WheelEvent;
    wheelEvent.preventDefault();
    wheelEvent.stopPropagation();

    // Adjust zoom level
    this.fabricCanvasService.adjustMouseWheelZoom(wheelEvent);
  }

  // Subscribe to obstacle updates from the service
  private subscribeToObstacles() {
    this.obstacleService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe((newObstacles) => {
        this.updateObstacles(newObstacles); // Update obstacle list
        this.obstacleList = newObstacles;
      });
  }

  // Update the list of obstacles on the canvas
  private updateObstacles(newObstacles: Obstacle[]) {
    this.obstacleList = newObstacles;

    newObstacles.forEach((obstacle) => {
      this.addNewObstacleToCanvas(obstacle);
    });
    
    this.canvas.requestRenderAll();
  }

  // Add a new obstacle to the canvas
  private addNewObstacleToCanvas(obstacle: Obstacle) {
    const rect = this.createRectangle(obstacle);
    this.obstacleMap.set(obstacle.id, rect);
    this.canvas.add(rect);
  }

  // Create a rectangle for a new obstacle
  private createRectangle(obstacle: Obstacle): fabric.Rect {
    const rect = new fabric.Rect({
      left: obstacle.x,
      top: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color || this.DEFAULT_COLOR,
      selectable: false,
      evented: true,
      hasControls: false,
      hasBorders: false,
    });

    this.addRectangleEventListeners(rect);
    return rect;
  }

  // Function to add event listeners to a rectangle
  private addRectangleEventListeners(rect: fabric.Rect) {
    this.fabricCanvasService.bindObjectEvents(rect, {
      'mouseover': () => this.handleRectangleMouseOver(rect),
      'mouseout': () => this.handleRectangleMouseOut(rect),
    });
  }

  // Mouse hovers over a rectangle, displaying the tooltip
  private handleRectangleMouseOver(rect: fabric.Rect) {
    // Update target stroke style
    rect.set({
      stroke: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 1,
    });

    // Retrieve object position and dimensions
    const { left, top, width, height } = rect.getBoundingRect();
    const obstacleData = { x: left, y: top, width, height };
    this.updateTooltip(obstacleData);

    // Render updated styles and tooltip
    this.canvas.requestRenderAll();
  }

  // Mouse leaves a Rectangle, hiding the tooltip
  private handleRectangleMouseOut(rect: fabric.Rect) {
    // Reset stroke style
    rect.set({ stroke: '', strokeWidth: 0 });

    // Hide tooltip and render changes
    this.tooltipService.hideTooltip();
    this.canvas.requestRenderAll();
  }

  // Update Tooltip position and content
  private updateTooltip(
    obstacleData: Partial<Obstacle>,
  ) {
    const { x = 0, y = 0 } = obstacleData;
    const description = `Obstacle at (${Math.round(x)}, ${Math.round(y)})`;

    // Show the tooltip with calculated position and content
    this.tooltipService.showTooltip({
      description,
      targetData: obstacleData,
      container: this.canvas.getElement(),
    });
  }
  
  // Zoom in by increasing the zoom factor by 10%
  zoomIn() {
    this.adjustZoom(1.1);
  }
  
  // Zoom out by decreasing the zoom factor by 10%
  zoomOut() {
    this.adjustZoom(1 / 1.1);
  }

  // Reset the zoom to the default level
  resetZoom() {
    this.fabricCanvasService.resetZoom();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.fabricCanvasService.adjustZoom(factor);
  }

  // Move the canvas up
  moveUp() {
    this.moveCanvas(0, -1);
  }

  // Move the canvas down
  moveDown() {
    this.moveCanvas(0, 1);
  }

  // Move the canvas left
  moveLeft() {
    this.moveCanvas(-1, 0);
  }

  // Move the canvas right
  moveRight() {
    this.moveCanvas(1, 0);
  }

  // Adjust the canvas position by panning
  private moveCanvas(directionX: number, directionY: number) {
    this.fabricCanvasService.moveCanvas(directionX, directionY);
  }
  
  // Toggle grid visibility
  toggleGrid() {
    this.fabricCanvasService.toggleGrid();
  }

  // Toggle Obstacles visibility
  toggleObstaclesVisibility(isVisible: boolean) {
    this.obstacleVisible = isVisible;
    this.fabricCanvasService.toggleObjectVisibility(
      Array.from(this.obstacleMap.values()), isVisible
    );
  }
}
