import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { fabric } from 'fabric';

import { ObstacleGenerationService } from 'src/app/services/obstacle-testing/obstacle-generation.service';
import { ObstacleFormService } from 'src/app/services/obstacle-testing//obstacle-form.service';
import { CanvasState, CanvasStateManager } from 'src/app/services/obstacle-testing/canvas-state-manager';
import { FabricCanvasService } from 'src/app/services/obstacle-testing/fabric-canvas.service';
import { TooltipService } from 'src/app/services/obstacle-testing/tooltip.service';
import { Obstacle } from './obstacle.model';

@Component({
  selector: 'app-fabric-obstacle',
  templateUrl: './fabric-obstacle.component.html',
  styleUrls: ['./obstacle.component.scss']
})
export class FabricObstacleComponent implements OnInit, OnDestroy {
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

  private canvas: fabric.Canvas;
  private currentRect: fabric.Rect | null = null;
  private originalValues: Obstacle | null = null;
  private startX: number | null = null;
  private startY: number | null = null;
  private obstacleMap: Map<number, fabric.Rect> = new Map();
  private destroy$ = new Subject<void>()
  private canvasStateManager = new CanvasStateManager();

  constructor(
    private obstacleService: ObstacleGenerationService,
    private obstacleFormService: ObstacleFormService,
    private fabricCanvasService: FabricCanvasService,
    private tooltipService: TooltipService,
  ) {
    // Initialize the obstacle form
    this.obstacleForm = this.obstacleFormService.getForm();
  }

  ngOnInit() {
    this.initializeCanvas(); // Initialize the canvas
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

    if (this.canvas) {
      this.fabricCanvasService.clearService();
    }
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

  // Bind canvas events for interaction
  private bindCanvasEvents() {
    // A rectangle is selected/selection is cleared
    this.canvas.on('selection:created', (event) => this.handleSelection(event));
    this.canvas.on('selection:updated', (event) => this.handleSelection(event));
    this.canvas.on('selection:cleared', () => this.handleDeselection());

    // Mouse events for drawing rectangles
    this.canvas.on('mouse:down', (event) => this.handleMouseDown(event));
    this.canvas.on('mouse:move', (event) => this.handleMouseMove(event));
    this.canvas.on('mouse:up', () => this.handleMouseUp());

    // Handle zoom in/out using the mouse wheel
    this.canvas.on('mouse:wheel', (event) => this.handleMouseWheel(event));
  }

  // Handle when an object is selected
  private handleSelection(event: fabric.IEvent) {
    // console.log('Selection triggered');
    const activeObject = event.target;

    if (this.isRectangle(activeObject)) {
      // Deselect any previously selected object
      this.handleDeselection();
      
      // Select and update the delete icon position
      this.selectAndUpdateRect(activeObject as fabric.Rect);
    }
  }

  // Check if the selected object is a rectangle
  private isRectangle(object: fabric.Object | undefined): boolean {
    return object instanceof fabric.Rect;
  }

  // Handle the rectangle selection logic and update the delete icon
  private selectAndUpdateRect(rect: fabric.Rect) {
    this.currentRect = rect;
    this.currentId = this.getObstacleIdByRect(rect);

    this.updateDeleteIconPosition(rect);

    this.canvas.renderAll();
  }

  // Get the obstacle ID by comparing the selected rectangle
  private getObstacleIdByRect(rect: fabric.Rect): number {
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
  private updateDeleteIconPosition(rect: fabric.Rect) {
    const boundingRect = rect.getBoundingRect();
    const canvasOffset = this.canvas.getElement().getBoundingClientRect();
    
    this.deleteIconStyle = {
      position: 'absolute',
      top: `${boundingRect.top + canvasOffset.top - 10}px`,
      left: `${boundingRect.left + boundingRect.width + canvasOffset.left - 10}px`,
    };

    this.showDeleteIcon = true;
  }

  // Handle when an object is deselected (e.g., clicking outside any object)
  private handleDeselection() {
    // console.log('Deselection triggered');
    this.hideDeleteIcon()

    this.currentRect = null;
    this.currentId = null;

    this.canvasStateManager.setState(CanvasState.Idle);
  }

  // Hide the delete icon
  private hideDeleteIcon(){
    this.showDeleteIcon = false;
    this.deleteIconStyle = {};
  }

  // Handle mouse down event for starting rectangle drawing or dragging
  private handleMouseDown(event: fabric.IEvent) {
    // console.log('MouseDown triggered');
    if (this.canvasStateManager.isDragging() || this.canvasStateManager.isDrawing()) {
      return;
    }

    const activeObject = this.canvas.getActiveObject();

    if (activeObject && this.isRectangle(activeObject)) {
      this.canvasStateManager.setState(CanvasState.Dragging);
      return;
    }

    // Deselect any previously selected object
    if (this.currentRect) {
      this.handleDeselection();
      return
    }
    
    // Start drawing a new rectangle
    this.initiateDrawing(event);
  }

  // Start drawing a new rectangle
  private initiateDrawing(event: fabric.IEvent) {
    // Disable selection while drawing
    this.toggleObjectSelectable(false);

    const pointer = this.canvas.getPointer(event.e);
    if (!pointer) return;

    this.canvasStateManager.setState(CanvasState.Drawing);

    this.startX = pointer.x;
    this.startY = pointer.y;
    this.currentRect = null;
  }

  // Update the size of the rectangle as the mouse moves
  private handleMouseMove(event: fabric.IEvent) {
    if (!this.canvasStateManager.isDrawing()) return;

    const pointer = this.canvas.getPointer(event.e);
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
      this.currentRect.set({ width: distanceX, height: distanceY });
      this.canvas.requestRenderAll(); // Update canvas with new dimensions
    }
  }

  // Create a new rectangle on the canvas
  private createNewRectangle() {
    const randomColor = this.obstacleService.getRandomColor();

    this.currentRect = new fabric.Rect({
      left: this.startX,
      top: this.startY,
      width: 0,
      height: 0,
      fill: randomColor,
      selectable: false,
      hasControls: false,
      hasBorders: false,
      evented: false,
    });

    this.canvas.add(this.currentRect); // Add the rectangle to the canvas
  }

  // Finalize drawing the rectangle on mouse up
  private handleMouseUp() {
    if (!this.canvasStateManager.isDrawing() || !this.currentRect) return;

    this.canvasStateManager.setState(CanvasState.Idle);
    this.toggleObjectSelectable(true); // Re-enable selection after drawing

    if (this.currentRect.width > 0 && this.currentRect.height > 0) {
      this.finalizeNewObstacle(); // Finalize and save the new rectangle
    } else {
      this.canvas.remove(this.currentRect);  // Remove invalid rectangles
    }
    
    this.startX = null;
    this.startY = null;
  }

  // Finalize a new rectangle as an obstacle
  private finalizeNewObstacle() {
    this.currentRect.set({
      selectable: true,
      hasControls: true,
      hasBorders: true,
      evented: true,
    });
    
    // Update the coordinates of the current rectangle
    this.currentRect.setCoords();

    // Assign a unique ID for the new obstacle
    const newObstacleId = Date.now();

    this.addRectangleEventListeners(this.currentRect, newObstacleId);

    // Store the new obstacle in the map
    this.obstacleService.addObstacle({
      id: newObstacleId,
      x: this.currentRect.left,
      y: this.currentRect.top,
      width: this.currentRect.width,
      height: this.currentRect.height,
      color: typeof this.currentRect.fill === 'string' ? this.currentRect.fill : this.obstacleService.getRandomColor(),
    });

    this.obstacleMap.set(newObstacleId, this.currentRect);
    this.selectAndUpdateRect(this.currentRect);
  }

  // Toggle the selectable state of canvas objects
  private toggleObjectSelectable(isSelectable: boolean) {
    this.canvas.selection = isSelectable;
    this.canvas.forEachObject((obj) => obj.selectable = isSelectable);
  }

  // Handle zooming with the mouse wheel
  private handleMouseWheel(event: fabric.IEvent) {
    this.hideDeleteIcon();
    
    const wheelEvent = event.e as WheelEvent;
    wheelEvent.preventDefault();
    wheelEvent.stopPropagation();

    // Adjust zoom level
    this.fabricCanvasService.adjustMouseWheelZoom(wheelEvent);
  }

  // Subscribe to changes in the obstacle form
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
      x: this.currentRect.left,
      y: this.currentRect.top,
      width: this.currentRect.width,
      height: this.currentRect.height,
      color: formValue.color,
    });
  }

  // Apply updated properties to the rectangle
  private updateRectangleProperties(rect: fabric.Rect, values: Partial<Obstacle>) {
    const updatedProperties: Partial<fabric.Rect> = {
      left: values.x !== undefined ? parseFloat(values.x.toString()) : rect.left,
      top: values.y !== undefined ? parseFloat(values.y.toString()) : rect.top,
      width: values.width !== undefined ? parseFloat(values.width.toString()) : rect.width,
      height: values.height !== undefined ? parseFloat(values.height.toString()) : rect.height,
      fill: values.color !== undefined ? values.color : rect.fill,
    };
  
    rect.set(updatedProperties); // Update all properties at once
    rect.setCoords();  // Update the coordinates of the current rectangle
    this.canvas.renderAll(); // Re-draw the layer
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

  // Update the list of obstacles on the canvas
  private updateObstacles(newObstacles: Obstacle[]) {
    this.obstacleList = newObstacles;
    const currentObstacles = new Set(this.obstacleMap.keys());
    
    newObstacles.forEach((obstacle) => {
      if (this.obstacleMap.has(obstacle.id)) {
        const rect = this.obstacleMap.get(obstacle.id)!;
        this.updateRectangle(rect, obstacle); // Update existing rectangles
        currentObstacles.delete(obstacle.id);
      } else {
        this.addNewObstacleToCanvas(obstacle); // Add new obstacle to the canvas
      }
    });

    this.removeOldObstacles(currentObstacles); // Remove old obstacles not in the new data
    this.canvas.requestRenderAll();
  }

  // Update a rectangle with the new obstacle properties
  private updateRectangle(rect: fabric.Rect, obstacle: Obstacle) {
    this.updateRectangleProperties(rect, obstacle);
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
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });

    this.addRectangleEventListeners(rect, obstacle.id);
    return rect;
  }

  // Remove old obstacles no longer present in the data
  private removeOldObstacles(currentObstacles: Set<number>) {
    currentObstacles.forEach((id) => {
      const rect = this.obstacleMap.get(id);
      if (rect) {
        this.canvas.remove(rect);
        this.obstacleMap.delete(id);
      }
    });
  }

  // Function to add event listeners to a rectangle
  private addRectangleEventListeners(rect: fabric.Rect, obstacleId: number) {
    this.fabricCanvasService.bindObjectEvents(rect, {
      'moving': () => this.handleRectangleMoving(rect, obstacleId),
      'modified': () => this.handleRectangleModified(rect, obstacleId),
      'mouseover': () => this.handleRectangleMouseOver(rect),
      'mouseout': () => this.handleRectangleMouseOut(rect),
      'mousedblclick': () => this.handleRectangleDoubleClick(rect, obstacleId),
    });
  }

  // Handle when dragging a rectangle
  private handleRectangleMoving(rect: fabric.Rect, obstacleId: number) {
    // console.log('ObjectMoving triggered');
    this.hideDeleteIcon();
    this.tooltipService.hideTooltip();

    this.canvasStateManager.setState(CanvasState.Dragging);

    this.obstacleService.updateObstacle(obstacleId, {
      x: rect.left,
      y: rect.top,
    });
  }

  // Handle when rectangle movement is finished
  private handleRectangleModified(rect: fabric.Rect, obstacleId: number) {
    // console.log('ObjectModified triggered');
    this.canvasStateManager.setState(CanvasState.Idle);

    // Update the coordinates of the current rectangle
    rect.setCoords();

    this.obstacleService.updateObstacle(obstacleId, {
      x: rect.left,
      y: rect.top
    })

    this.updateTooltip(
      { x: rect.left!, y: rect.top!, width: rect.width!, height: rect.height! },
    );

    // Re-select the current rectangle and show the delete icon
    this.selectAndUpdateRect(rect);
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

  private handleRectangleDoubleClick(rect: fabric.Rect, obstacleId: number) {
    this.showEditForm(rect, obstacleId);
  }
  
  // Show the edit form for a selected rectangle
  showEditForm(rect: fabric.Rect, obstacleId: number) {
    this.currentRect = rect;
    this.currentId = obstacleId;

    const rectColor = typeof rect.fill === 'string' ? rect.fill : this.DEFAULT_COLOR;

    // Save the original values to allow canceling edits
    this.originalValues = {
      id: obstacleId,
      x: rect.left!,
      y: rect.top!,
      width: rect.width!,
      height: rect.height!,
      color: rectColor,
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

  // Close the edit form and reset relevant variables
  closeEditForm() {
    this.showPopup = false;
    this.currentRect = null;
    this.currentId = null;
    this.originalValues = null;

    // Reset the form
    this.obstacleFormService.resetForm();
  }

  // Cancel editing and revert to the original values
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
    this.fabricCanvasService.resetZoom();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.hideDeleteIcon();
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
    this.hideDeleteIcon();
    this.fabricCanvasService.moveCanvas(directionX, directionY);
  }
  
  // Toggle grid visibility
  toggleGrid() {
    this.fabricCanvasService.toggleGrid();
  }

  // Select an obstacle from the list and set it as active on the canvas
  selectObstacle(obstacleId: number) {
    const rect = this.obstacleMap.get(obstacleId) || null;
    
    if (!rect) {
      console.warn('No obstacle found for this ID.');
      return;
    }

    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(rect);
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
  private getRectToDelete(obstacleId?: number): fabric.Rect | null {
    if (obstacleId) {
      return this.obstacleMap.get(obstacleId) || null;
    } else if (this.currentRect) {
      return this.currentRect;
    }
    return null;
  }

  // Remove the rectangle from the canvas and obstacle map
  private removeRectAndObstacle(rect: fabric.Rect, obstacleId: number) {
    // Remove the rectangle from the canvas
    this.canvas.remove(rect);
    this.canvas.renderAll();

    // Remove the obstacle from the map and service
    this.obstacleMap.delete(obstacleId);
    this.obstacleService.removeObstacle(obstacleId);

    this.canvas.selection = true;
    
    this.handleDeselection()
  }
}
