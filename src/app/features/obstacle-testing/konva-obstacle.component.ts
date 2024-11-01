import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import Konva from 'konva';

import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';
import { CanvasState, CanvasStateManager } from 'src/app/services/obstacle-testing/canvas-state-manager';
import { KonvaCanvasService } from 'src/app/services/obstacle-testing/konva-canvas.service';
import { TooltipService } from 'src/app/services/obstacle-testing/tooltip.service';
import { Obstacle } from './obstacle.model';

@Component({
  selector: 'app-konva-obstacle',
  templateUrl: './konva-obstacle.component.html',
  styleUrls: ['./obstacle.component.scss']
})
export class KonvaObstacleComponent implements OnInit, OnDestroy {
  // Constants for canvas behavior
  private readonly DEFAULT_COLOR = '#00FFFF';
  private readonly OBSTACLE_COUNT = 20;
  private readonly MIN_DRAG_DISTANCE = 5;

  obstacleList: Obstacle[] = [];
  obstacleForm: FormGroup;
  showPopup = false;
  showDeleteIcon = false;
  deleteIconStyle = {};
  currentId: number | null = null;
  
  private stage: Konva.Stage;
  private obstacleLayer: Konva.Layer;
  private transformer: Konva.Transformer;
  private currentRect: Konva.Rect | null = null;
  private originalValues: Obstacle | null = null;
  private startX: number | null = null;
  private startY: number | null = null;
  private obstacleMap: Map<number, Konva.Rect> = new Map();
  private destroy$ = new Subject<void>();
  private canvasStateManager = new CanvasStateManager();

  constructor(
    private obstacleService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
    private konvaCanvasService: KonvaCanvasService,
    private tooltipService: TooltipService,
  ) {
    // Initialize the obstacle form
    this.obstacleForm = this.obstacleFormService.getForm();
  }

  ngOnInit() {
    this.initializeCanvas(); // Initialize canvas and layer
    this.loadBackgroundImage(); // Load the background image
    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToFormChanges(); // Subscribe to form changes
    this.subscribeToObstacles(); // Subscribe to obstacle data
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

    // Retrieve obstacle layer
    this.obstacleLayer = this.konvaCanvasService.getObstacleLayer();
    if (this.obstacleLayer) {
      // Initialize the transformer for the obstacle layer
      this.transformer = new Konva.Transformer({
        rotateEnabled: true,
        resizeEnabled: true,
        anchorSize: 15,
        opacity: 0.5,
      });
      this.obstacleLayer.add(this.transformer);
    }
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

  // Bind the canvas interaction events
  private bindCanvasEvents() {
    // Mouse events for drawing rectangles
    this.stage.on('mousedown', (event: Konva.KonvaEventObject<MouseEvent>) => this.handleMouseDown(event));
    this.stage.on('mousemove', () => this.handleMouseMove());
    this.stage.on('mouseup', () => this.handleMouseUp());

    // Handle zoom in/out using the mouse wheel
    this.stage.on('wheel', (event: Konva.KonvaEventObject<WheelEvent>) => this.handleMouseWheel(event));
  }

  // Handle the rectangle selection logic and update the delete icon
  private selectAndUpdateRect(rect: Konva.Rect) {
    rect.draggable(true);

    this.transformer.nodes([rect]);
    this.transformer.moveToTop();
    rect.moveToTop();

    this.currentRect = rect;
    this.currentId = this.getObstacleIdByRect(rect);

    this.updateDeleteIconPosition(rect);

    this.obstacleLayer.draw();
  }
  
  // Get the obstacle ID by comparing the selected rectangle
  private getObstacleIdByRect(rect: Konva.Rect): number {
    for (const [id, storedRect] of this.obstacleMap.entries()) {
      if (storedRect === rect) {
        console.log(`Found matching obstacle with ID: ${id}`);
        return id;
      }
    }
    console.warn('No matching obstacle found for this rectangle.');
    return -1;
  }

  // Update the position of the delete icon relative to the selected rectangle
  private updateDeleteIconPosition(rect: Konva.Rect) {
    const boundingRect = rect.getClientRect();
    const containerRect = this.stage.container().getBoundingClientRect();
    
    this.deleteIconStyle = {
      position: 'absolute',
      top: `${containerRect.top + boundingRect.y - 10}px`,
      left: `${containerRect.left + boundingRect.x + boundingRect.width + 10}px`,
    };

    this.showDeleteIcon = true;
  }

  // Deselect transformer and hide the delete icon
  private handleDeselection() {
    // console.log('Deselection triggered');
    this.hideDeleteIcon();

    this.transformer.nodes([]);
    this.obstacleLayer.batchDraw();
    
    this.currentRect = null;
    this.currentId = null;

    this.canvasStateManager.setState(CanvasState.Idle);
  }

  // Hide the delete icon
  private hideDeleteIcon() {
    this.showDeleteIcon = false;
    this.deleteIconStyle = {};
  }

  // Handle mouse down event for starting rectangle drawing or dragging
  private handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    // console.log('MouseDown triggered');
    if (this.canvasStateManager.isDragging() || this.canvasStateManager.isDrawing()) return;

    if (event.target instanceof Konva.Rect) {
      this.canvasStateManager.setState(CanvasState.Dragging);
      return;
    }

    // Deselect any previously selected object
    if (this.currentRect) {
      this.handleDeselection();
      return
    }

    // Start drawing a new rectangle
    this.initiateDrawing();
  }

  // Start drawing a new rectangle
  private initiateDrawing() {
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    this.canvasStateManager.setState(CanvasState.Drawing);

    this.startX = pointer.x;
    this.startY = pointer.y;
    this.currentRect = null;
  }
  
 // Update the size of the rectangle as the mouse moves
  private handleMouseMove() {
    if (!this.canvasStateManager.isDrawing()) return;

    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    this.updateDrawing(pointer.x, pointer.y);
  }

  // Adjust the rectangle dimensions during drawing
  private updateDrawing(pointerX: number, pointerY: number) {
    const distanceX = Math.abs(pointerX - this.startX!);
    const distanceY = Math.abs(pointerY - this.startY!);

    // Check if the mouse moved enough to start drawing a rectangle
    if (
      !this.currentRect &&
      (
        distanceX > this.MIN_DRAG_DISTANCE || 
        distanceY > this.MIN_DRAG_DISTANCE
      )
    ) {
      this.createNewRectangle();
    }

    if (this.currentRect) {
      this.currentRect.size({ width: distanceX, height: distanceY });
      this.obstacleLayer.batchDraw(); // Update canvas with new dimensions
    }
  }

  // Create a new rectangle on the canvas
  private createNewRectangle() {
    const randomColor = this.obstacleService.getRandomColor();

    this.currentRect = new Konva.Rect({
      x: this.startX,
      y: this.startY,
      width: 0,
      height: 0,
      fill: randomColor,
      draggable: false,
    });

    this.obstacleLayer.add(this.currentRect); // Add the rectangle to the canvas
  }

  // Finalize drawing the rectangle on mouse up
  private handleMouseUp() {
    if (!this.canvasStateManager.isDrawing() || !this.currentRect) return;

    this.canvasStateManager.setState(CanvasState.Idle);
    const width = this.currentRect.width();
    const height = this.currentRect.height();

    if (width > 0 && height > 0) {
      this.finalizeNewObstacle(); // Finalize and save the new rectangle
    } else {
      this.currentRect.destroy();  // Remove invalid rectangles
    }

    this.startX = null;
    this.startY = null;
  }
  
  // Finalize a new rectangle as an obstacle
  private finalizeNewObstacle() {
    // Assign a unique ID for the new obstacle
    const newObstacleId = Date.now();

    this.addRectangleEventListeners(this.currentRect, newObstacleId);

    // Store the new obstacle in the map
    const obstacleColor = this.currentRect!.fill() as string;

    this.obstacleService.addObstacle({
      id: newObstacleId,
      x: this.currentRect.x(),
      y: this.currentRect.y(),
      width: this.currentRect.width(),
      height: this.currentRect.height(),
      color: obstacleColor,
    });

    this.obstacleMap.set(newObstacleId, this.currentRect);
    this.selectAndUpdateRect(this.currentRect);
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    this.hideDeleteIcon();

    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
  
    // Adjust zoom level
    this.konvaCanvasService.adjustMouseWheelZoom(wheelEvent);
  }
  
  // Subscribe to form changes
  private subscribeToFormChanges() {
    this.obstacleFormService.getFormChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(formValue => {
        if (this.currentRect && this.currentId !== null) {
          // Update rectangle properties based on form input
          this.updateRectangleFromForm(formValue);
        }
      });
  }

  // Update the rectangle based on form values
  private updateRectangleFromForm(formValue: Obstacle) {
    this.updateRectangleProperties(this.currentRect, formValue);

    // Updates the obstacle in the obstacle service
    this.obstacleService.updateObstacle(this.currentId, {
      x: this.currentRect.x(),
      y: this.currentRect.y(),
      width: this.currentRect.width(),
      height: this.currentRect.height(),
      color: this.currentRect.fill() as string,
    });
  }

  // Set the rectangle properties
  private updateRectangleProperties(rect: Konva.Rect, values: Partial<Obstacle>) {
    const updatedProperties = {
      x: values.x !== undefined ? parseFloat(values.x.toString()) : rect.x(),
      y: values.y !== undefined ? parseFloat(values.y.toString()) : rect.y(),
      width: values.width !== undefined ? parseFloat(values.width.toString()) : rect.width(),
      height: values.height !== undefined ? parseFloat(values.height.toString()) : rect.height(),
      fill: values.color !== undefined ? values.color : rect.fill(),
    };

    rect.setAttrs(updatedProperties); // Update all properties at once
    this.obstacleLayer.draw(); // Re-draw the layer
  }

  // Subscribe to obstacle updates from the service
  private subscribeToObstacles() {
    this.obstacleService.obstacles$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100), // Debounce to avoid too frequent updates
        distinctUntilChanged() // Ensure updates only when data changes
      )
      .subscribe((newObstacles) => {
        this.updateObstacles(newObstacles); // Update obstacle list
        this.obstacleList = newObstacles;
      });
  }

  // Update obstacles on the canvas
  private updateObstacles(newObstacles: Obstacle[]) {
    this.obstacleList = newObstacles;
    const currentObstacles = new Set(this.obstacleMap.keys());

    newObstacles.forEach(obstacle => {
      if (this.obstacleMap.has(obstacle.id)) {
        const rect = this.obstacleMap.get(obstacle.id)!;
        this.updateRectangle(rect, obstacle); // Update existing rectangles
        currentObstacles.delete(obstacle.id);
      } else {
        this.addNewObstacleToCanvas(obstacle); // Add new obstacle to the canvas
      }
    });

    this.removeOldObstacles(currentObstacles); // Remove old obstacles not in the new data
    this.obstacleLayer.batchDraw();
  }

  // Update a rectangle with the new obstacle properties
  private updateRectangle(rect: Konva.Rect, obstacle: Obstacle) {
    this.updateRectangleProperties(rect, obstacle);
  }

  // Add a new obstacle to the canvas
  private addNewObstacleToCanvas(obstacle: Obstacle) {
    const rect = this.createRectangle(obstacle);
    this.obstacleMap.set(obstacle.id, rect);
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
      draggable: true, // Allow dragging the rectangle
    });

    this.addRectangleEventListeners(rect, obstacle.id);
    return rect;
  }

  // Remove old obstacles no longer present in the data
  private removeOldObstacles(currentObstacles: Set<number>) {
    currentObstacles.forEach((id) => {
      const rect = this.obstacleMap.get(id);
      if (rect) {
        rect.destroy(); // Remove from canvas
        this.obstacleMap.delete(id);
      }
    });
  }

  // Function to add event listeners to a rectangle
  private addRectangleEventListeners(rect: Konva.Rect, obstacleId: number) {
    this.konvaCanvasService.bindObjectEvents(rect, {
      'dragstart': () => this.handleRectangleDragStart(),
      'dragmove': () => this.handleRectangleDraging(rect, obstacleId),
      'dragend': () => this.handleRectangleDragEnd(rect),
      'click': () => this.handleRectangleClick(rect),
      'transformend': () => this.handleRectangleTransform(rect, obstacleId),
      'mouseover': () => this.handleRectangleMouseOver(rect),
      'mouseout': () => this.handleRectangleMouseOut(rect),
      'dblclick': () => this.handleRectangleDoubleClick(rect, obstacleId),
    });
  }

  // Update position when rectangle is dragged
  private handleRectangleDragStart() {
    // console.log('DragStart triggered');
    this.hideDeleteIcon();
    this.tooltipService.hideTooltip();

    this.canvasStateManager.setState(CanvasState.Dragging);
  }

  // Update position when rectangle is dragged
  private handleRectangleDraging(rect: Konva.Rect, obstacleId: number) {
    this.obstacleService.updateObstacle(obstacleId, {
      x: rect.x(),
      y: rect.y(),
    });
  }

  // Update position when rectangle is dragged
  private handleRectangleDragEnd(rect: Konva.Rect) {
    // console.log('DragEnd triggered');
    this.canvasStateManager.setState(CanvasState.Idle);

    this.updateTooltip(
      { x: rect.x()!, y: rect.y()!, width: rect.width()!, height: rect.height()! },
    );

    // Re-select the current rectangle and show the delete icon
    this.selectAndUpdateRect(rect);
  }

  // Enable transformer when rectangle is clicked
  private handleRectangleClick(rect: Konva.Rect) {
    // console.log('RectangleClick triggered');
    
    // Deselect any previously selected object
    this.handleDeselection();
    
    // Select and update the delete icon position
    this.selectAndUpdateRect(rect as Konva.Rect);
  }

  // Update size after the transformation (resizing)
  private handleRectangleTransform(rect: Konva.Rect, obstacleId: number) {
    // console.log('RectangleTransform triggered');
    const newAttrs = {
      x: rect.x(),
      y: rect.y(),
      width: rect.width() * rect.scaleX(),
      height: rect.height() * rect.scaleY(),
    };

    rect.setAttrs({
      x: newAttrs.x,
      y: newAttrs.y,
      width: newAttrs.width,
      height: newAttrs.height,
      scaleX: 1,
      scaleY: 1,
    });

    this.obstacleService.updateObstacle(obstacleId, {
      x: newAttrs.x,
      y: newAttrs.y,
      width: newAttrs.width,
      height: newAttrs.height,
      color: rect.fill() as string,
    });

    this.canvasStateManager.setState(CanvasState.Idle);
    
    // Re-select the current rectangle and show the delete icon
    this.selectAndUpdateRect(rect);
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

  private handleRectangleDoubleClick(rect: Konva.Rect, obstacleId: number) {
    this.showEditForm(rect, obstacleId);
  }

  // Show the edit form for a selected rectangle
  private showEditForm(rect: Konva.Rect, obstacleId: number) {
    this.currentRect = rect;
    this.currentId = obstacleId;

    // Save the original values to allow canceling edits
    this.originalValues = {
      id: obstacleId,
      x: rect.x(),
      y: rect.y(),
      width: rect.width(),
      height: rect.height(),
      color: rect.fill() as string,
    };

    // Populate the form with the rectangle's current values
    this.obstacleFormService.populateForm(this.originalValues);

    // Show the popup form for editing
    this.showPopup = true;
  }
  
  // Submit the edit form
  submitEditForm() {
    this.closeEditForm();
  }

  // Close the popup form
  closeEditForm() {
    this.showPopup = false;
    this.currentRect = null;
    this.currentId = null;
    this.originalValues = null;

    // Reset the form
    this.obstacleFormService.resetForm();
  }

  // Cancel the form and revert to original values
  cancelEditForm() {
    if (this.currentRect && this.originalValues) {
      this.updateRectangleProperties(this.currentRect, this.originalValues);

      // Reset the form values to the original values
      this.obstacleFormService.patchFormValue({
        x: this.originalValues.x,
        y: this.originalValues.y,
        width: this.originalValues.width,
        height: this.originalValues.height,
        color: this.originalValues.color,
      });
    }
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
    this.hideDeleteIcon();
    this.konvaCanvasService.resetZoom();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.hideDeleteIcon();
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
    this.hideDeleteIcon();
    this.konvaCanvasService.moveCanvas(directionX, directionY);
  }

  // Toggle grid visibility
  toggleGrid() {
    this.konvaCanvasService.toggleGrid();
  }

   // Select an obstacle from the list and set it as active on the canvas
  selectObstacle(obstacleId: number) {
    const rect = this.obstacleMap.get(obstacleId) || null;
    
    if (!rect) {
      console.warn('No obstacle found for this ID.');
      return;
    }

    // Select and update the delete icon position
    this.selectAndUpdateRect(rect as Konva.Rect);
  }

  // Delete an obstacle from the canvas and the obstacle list
  deleteObstacle(obstacleId: number) {
    const confirmDelete = window.confirm('Are you sure you want to delete this obstacle?');
    if (!confirmDelete) return;
    
    const rect = this.getRectToDelete(obstacleId);

    if (!rect || obstacleId === -1) {
      console.warn('No obstacle found for this rectangle.');
      return;
    }

    this.removeRectAndObstacle(rect, obstacleId);
  }

  // Get the rectangle to delete, either by ID or current selection
  private getRectToDelete(obstacleId?: number): Konva.Rect | null {
    if (obstacleId) {
      return this.obstacleMap.get(obstacleId) || null;
    } else if (this.currentRect) {
      return this.currentRect;
    }
    return null;
  }

  // Remove the rectangle from the canvas and obstacle map
  private removeRectAndObstacle(rect: Konva.Rect, obstacleId: number) {
    // Remove the rectangle from the canvas
    rect.destroy();
    
    // Remove the obstacle from the map and service
    this.obstacleMap.delete(obstacleId);
    this.obstacleService.removeObstacle(obstacleId);

    this.handleDeselection()
  }
}
