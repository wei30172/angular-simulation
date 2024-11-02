import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import Konva from 'konva';

import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { KonvaCanvasService } from 'src/app/services/obstacle-testing/konva-canvas.service';
import { TooltipService } from 'src/app/services/obstacle-testing/tooltip.service';
import { HeatmapDataService } from 'src/app/services/heatmap-testing/heatmap-data.service';
import { SimpleheatService } from 'src/app/services/heatmap-testing/simpleheat.service';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

@Component({
  selector: 'app-konva-heatmap>',
  templateUrl: './konva-heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class KonvaHeatmapComponent implements OnInit, OnDestroy {
  @ViewChild('simpleHeatCanvas', { static: true }) simpleHeatCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Constants for canvas behavior
  private readonly DEFAULT_COLOR = '#00FFFF';
  private readonly HEATMAP_DATA_COUNT = 100;
  private readonly OBSTACLE_COUNT = 20;

  obstacleList: Obstacle[] = []; // Stores obstacle objects
  obstacleVisible = true; // Controls the visibility of obstacles
  
  private stage: Konva.Stage;
  private obstacleLayer: Konva.Layer;
  private destroy$ = new Subject<void>();

  constructor(
    private obstacleService: ObstacleGenerationService,
    private konvaCanvasService: KonvaCanvasService,
    private tooltipService: TooltipService,
    private heatmapDataService: HeatmapDataService,
    private simpleheatService: SimpleheatService
  ) {}

  ngOnInit() {
    this.initializeCanvas(); // Initialize canvas and layer
    this.loadBackgroundImage(); // Load the background image
    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToObstacles(); // Subscribe to obstacle data
  }

  ngAfterViewInit() {
    this.renderHeatmapWithSimpleheat(); // Render heatmap
  }

  ngOnDestroy() {
    // Unsubscribe from all observables
    this.obstacleService.clearObstacles();
    this.destroy$.next();
    this.destroy$.complete();

    if (this.stage) {
      this.konvaCanvasService.clearService();
    }
  }

  // Initialize canvas and layer
  private initializeCanvas() {
    this.konvaCanvasService.initializeStage('konvaCanvas');
    this.stage = this.konvaCanvasService.getStage();
    this.obstacleLayer = this.konvaCanvasService.getObstacleLayer();
  }

  // Load the background image for the canvas
  private loadBackgroundImage() {
    this.konvaCanvasService.loadBackgroundImage(
      'assets/images/floorplan.jpg',
      this.onBackgroundImageLoaded
    );
  }

  // Generate default obstacles
  private onBackgroundImageLoaded = () => {
    this.obstacleService.generateRandomObstacles(
      this.OBSTACLE_COUNT,
      this.stage.width(),
      this.stage.height()
    );
  }

  // Render heatmap using SimpleheatService
  private renderHeatmapWithSimpleheat() {
    const heatmapCanvas = this.simpleHeatCanvas.nativeElement;

    // Ensure the heatmap canvas matches the stage dimensions
    heatmapCanvas.width = this.stage.width();
    heatmapCanvas.height = this.stage.height();

    // Generate heatmap data that covers the entire stage area
    const heatmapData = this.heatmapDataService.generateHeatmapData(
      this.HEATMAP_DATA_COUNT,
      this.stage.width(),
      this.stage.height()
    );
    
    // Initialize Simpleheat on the heatmap canvas
    this.simpleheatService.initializeHeatmap(heatmapCanvas);

    // Format data for Simpleheat
    const formattedData = heatmapData.map((point) => [point.x, point.y, point.value] as [number, number, number]);
    
    // Render the heatmap to the canvas
    this.simpleheatService.setHeatmapData(formattedData);
    this.simpleheatService.render();

    // Convert the heatmap canvas to a PNG image URL
    const heatmapImageUrl = this.simpleHeatCanvas.nativeElement.toDataURL('image/png');
    
    // Add the generated heatmap as a layer to the Konva stage
    this.konvaCanvasService.addHeatmapLayer(heatmapImageUrl);
  }
  
  // Bind the canvas interaction events
  private bindCanvasEvents() {
    this.stage.on('wheel', (event: Konva.KonvaEventObject<WheelEvent>) => this.handleMouseWheel(event));
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
  
    // Adjust zoom level
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
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
  
  // Update obstacles on the canvas
  private updateObstacles(newObstacles: Obstacle[]) {
    this.obstacleList = newObstacles;

    newObstacles.forEach(obstacle => {
      this.addNewObstacleToCanvas(obstacle); // Add new obstacle to the canvas
    });

    this.obstacleLayer.batchDraw();
  }

  // Add a new obstacle to the canvas
  private addNewObstacleToCanvas(obstacle: Obstacle) {
    const rect = this.createRectangle(obstacle);
    this.obstacleLayer.add(rect);
  }

  // Create a new rectangle and add event handlers
  private createRectangle(obstacle: Obstacle): Konva.Rect {
    const rect = new Konva.Rect({
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color || this.DEFAULT_COLOR,
      draggable: false,
    });

    this.addRectangleEventListeners(rect, obstacle.id);
    return rect;
  }

  // Function to add event listeners to a rectangle
  private addRectangleEventListeners(rect: Konva.Rect, obstacleId: number) {
    this.konvaCanvasService.bindObjectEvents(rect, {
      'mouseover': () => this.handleRectangleMouseOver(rect),
      'mouseout': () => this.handleRectangleMouseOut(rect),
    });
  }

  // Mouse hovers over a rectangle, displaying the tooltip
  private handleRectangleMouseOver(rect: Konva.Rect) {
    // Update target stroke style
    rect.setAttrs({
      stroke: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 1,
    });

    // Retrieve object position and dimensions
    const { x, y, width, height } = rect.getClientRect();
    const obstacleData = { x, y, width, height };
    this.updateTooltip(obstacleData);

    // Render updated styles and tooltip
    this.obstacleLayer.batchDraw();
  }

  // Mouse leaves a Rectangle, hiding the tooltip
  private handleRectangleMouseOut(rect: Konva.Rect) {
    // Reset stroke style
    rect.setAttrs({
      stroke: null,
      strokeWidth: 0,
    });

    // Hide tooltip and render changes
    this.tooltipService.hideTooltip();
    this.obstacleLayer.batchDraw();
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
      container: this.stage.container(),
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
    this.konvaCanvasService.resetZoom();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.konvaCanvasService.adjustZoom(factor);
  }
  
  // Move the stage up
  moveUp() {
    this.moveCanvas(0, -1);
  }

  // Move the stage down
  moveDown() {
    this.moveCanvas(0, 1);
  }

  // Move the stage left
  moveLeft() {
    this.moveCanvas(-1, 0);
  }

  // Move the stage right
  moveRight() {
    this.moveCanvas(1, 0);
  }

  // Adjust the canvas position by panning
  private moveCanvas(directionX: number, directionY: number) {
    this.konvaCanvasService.moveCanvas(directionX, directionY);
  }

  // Toggle grid visibility
  toggleGrid() {
    this.konvaCanvasService.toggleGrid();
  }

  // Toggle Obstacles visibility
  toggleObstaclesVisibility(visible: boolean) {
    this.obstacleVisible = visible;
    this.konvaCanvasService.toggleObstacle();
  }
}
