import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import Konva from 'konva';

import { ObstacleService } from '../../services/obstacle.service';
import { Obstacle } from './obstacle.model';

@Component({
  selector: 'app-konva-obstacle',
  templateUrl: './konva-obstacle.component.html',
  styleUrls: ['./obstacle.component.scss']
})
export class KonvaObstacleComponent implements OnInit, OnDestroy {
  obstacleList: Obstacle[] = [];
  obstacleForm: FormGroup;
  showPopup = false;
  showDeleteIcon = false;
  deleteIconStyle = {};
  currentId: number | null = null;

  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private transformer: Konva.Transformer;
  private currentRect: Konva.Rect | null = null;
  private originalValues: Obstacle | null = null;
  private startX: number | null = null;
  private startY: number | null = null;
  private canvasWidth: number = 640;
  private canvasHeight: number = 640;
  private isDragging = false;
  private isDrawing = false;
  private obstacleMap: Map<number, Konva.Rect> = new Map();
  private destroy$ = new Subject<void>();
  
  // Constants for canvas behavior
  private readonly DEFAULT_COLOR = '#00FFFF';
  private readonly OBSTACLE_COUNT = 20;
  private readonly MIN_ZOOM = 1;
  private readonly MAX_ZOOM = 20;
  private readonly PAN_OFFSET = 10;
  private readonly MIN_DRAG_DISTANCE = 5;
  
  constructor(
    private obstacleService: ObstacleService,
    private formBuilder: FormBuilder
  ) {
    // Initialize the obstacle form
    this.obstacleForm = this.formBuilder.group({
      x: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      y: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
      width: ['', [Validators.required, Validators.min(1)]],
      height: ['', [Validators.required, Validators.min(1)]],
      color: [''],
    });
  }

  ngOnInit() {
    this.initializeCanvas(); // Initialize canvas and layer
    this.loadBackgroundImage(); // Load the background image
    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToFormChanges(); // Subscribe to form changes
    this.subscribeToObstacles(); // Subscribe to obstacle data
  }

  ngOnDestroy() {
    // Remove all event listeners
    this.stage.off();

    // Destroy the Konva stage
    this.stage.destroy();

    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialize canvas and layer
  private initializeCanvas() {
    this.stage = new Konva.Stage({
      container: 'konvaCanvas',
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
    // Add a layer for drawing shapes
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // Initialize the transformer, enabling rotation and resizing
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      resizeEnabled: true,
      anchorSize: 15
    });
    this.layer.add(this.transformer);
  }

   // Load the background image for the canvas
  private loadBackgroundImage() {
    const bgImage = new Image();
    bgImage.src = 'assets/images/floorplan.jpg';
    bgImage.onload = () => {
      const konvaImage = new Konva.Image({
        image: bgImage,
        width: this.stage.width(),
        height: this.stage.height(),
      });
      this.layer.add(konvaImage);
      this.layer.draw();

       // Generate random obstacles (rectangles)
      this.obstacleService.generateRandomObstacles(
        this.OBSTACLE_COUNT,
        this.stage.width(),
        this.stage.height()
      );
    };
    bgImage.onerror = () => {
      console.error('Background image failed to load.');
    };
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
    this.showDeleteIcon = true;

    this.layer.draw();
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
  private updateDeleteIconPosition(rect: Konva.Rect): void {
    const boundingRect = rect.getClientRect();
    const containerRect = this.stage.container().getBoundingClientRect();
    
    this.deleteIconStyle = {
      position: 'absolute',
      top: `${containerRect.top + boundingRect.y - 10}px`,
      left: `${containerRect.left + boundingRect.x + boundingRect.width + 10}px`,
    };
  }

  // Deselect transformer and hide the delete icon
  private handleDeselection() {
    console.log('Deselection triggered')
    
    this.hideDeleteIcon();

    this.transformer.nodes([]);
    this.layer.batchDraw();
    
    this.currentRect = null;
    this.currentId = null;

    this.isDragging = false;
    this.isDrawing = false;
  }

  // Hide the delete icon
  private hideDeleteIcon() {
    this.showDeleteIcon = false;
    this.deleteIconStyle = {};
  }

  // Handle mouse down event for starting rectangle drawing or dragging
  private handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    console.log('MouseDown triggered')
    if (this.isDragging || this.isDrawing) return;

    if (event.target instanceof Konva.Rect) {
      this.isDragging = true;
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
  private initiateDrawing(event: Konva.KonvaEventObject<MouseEvent>) {
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    this.isDrawing = true;
    this.startX = pointer.x;
    this.startY = pointer.y;
    this.currentRect = null;
  }
  
 // Update the size of the rectangle as the mouse moves
  private handleMouseMove() {
    if (!this.isDrawing) return;

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
      this.layer.batchDraw(); // Update canvas with new dimensions
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

    this.layer.add(this.currentRect); // Add the rectangle to the canvas
  }

  // Finalize drawing the rectangle on mouse up
  private handleMouseUp() {
    if (!this.isDrawing || !this.currentRect) return;

    this.isDrawing = false;
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

  // Mouse wheel event to handle zoom in/out
  private handleMouseWheel(event: Konva.KonvaEventObject<WheelEvent>): void {
    this.hideDeleteIcon();

    const wheelEvent = event.evt as WheelEvent;
    wheelEvent.preventDefault();
  
    // Adjust zoom level
    this.adjustMouseWheelZoom(wheelEvent);
  }

  // Adjust zoom level based on mouse wheel interaction
  private adjustMouseWheelZoom(wheelEvent: WheelEvent) {
    const oldScale = this.stage.scaleX(); // Get the current zoom level of the canvas
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;
  
    const scaleBy = 1.05; // smooths the zooming effect
    const newScale = wheelEvent.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Ensure new scale is within the defined limits
    const limitedScale = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newScale));

    this.stage.scale({ x: limitedScale, y: limitedScale });
  
    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };
  
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
  
    // Zoom in/out relative to the mouse pointer position
    this.stage.position(newPos);
    this.stage.batchDraw();
  }

  // Subscribe to form changes
  private subscribeToFormChanges() {
    this.obstacleForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((formValue) => {
        if (this.currentRect && this.currentId !== null) {
          // Update rectangle properties based on form input
          this.updateRectangleFromForm(formValue); 
        }
      });
  }

  // Update the rectangle based on form values
  private updateRectangleFromForm(formValue: Obstacle) {
    this.setRectangleProperties(this.currentRect, formValue);

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
  private setRectangleProperties(rect: Konva.Rect, values: Partial<Obstacle>): void {
    const updatedProperties = {
      x: values.x !== undefined ? parseFloat(values.x.toString()) : rect.x(),
      y: values.y !== undefined ? parseFloat(values.y.toString()) : rect.y(),
      width: values.width !== undefined ? parseFloat(values.width.toString()) : rect.width(),
      height: values.height !== undefined ? parseFloat(values.height.toString()) : rect.height(),
      fill: values.color !== undefined ? values.color : rect.fill(),
    };

    rect.setAttrs(updatedProperties); // Update all properties at once
    this.layer.draw(); // Re-draw the layer
  }

  // Subscribe to obstacle updates from the service
  private subscribeToObstacles() {
    this.obstacleService.obstacles$
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
    this.layer.batchDraw();
  }

  // Update a rectangle with the new obstacle properties
  private updateRectangle(rect: Konva.Rect, obstacle: Obstacle) {
    rect.position({ x: obstacle.x, y: obstacle.y });
    rect.size({ width: obstacle.width, height: obstacle.height });
    rect.fill(obstacle.color);
  }

  // Add a new obstacle to the canvas
  private addNewObstacleToCanvas(obstacle: Obstacle) {
    const rect = this.createRectangle(obstacle);
    this.obstacleMap.set(obstacle.id, rect);
    this.layer.add(rect);
  }

  // Create a new rectangle and add event handlers
  private createRectangle(obstacle: Obstacle): Konva.Rect {
    const rect = new Konva.Rect({
      x: obstacle.x,
      y: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color,
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
  private addRectangleEventListeners(rect: Konva.Rect, obstacleId: number): void {
    rect.on('dragstart', () => this.handleRectangleDragStart());
    rect.on('dragmove', () => this.handleRectangleDraging(rect, obstacleId));
    rect.on('dragend', () => this.handleRectangleDragEnd(rect));
    rect.on('click', () => this.handleRectangleClick(rect));
    rect.on('transformend', () => this.handleRectangleTransform(rect, obstacleId));
    rect.on('dblclick', () => this.showEditForm(rect, obstacleId));
  }

  // Update position when rectangle is dragged
  private handleRectangleDragStart() {
    console.log('DragStart triggered')
    this.hideDeleteIcon();
    this.isDragging = true;
  }

  // Update position when rectangle is dragged
  private handleRectangleDraging(rect: Konva.Rect, obstacleId: number): void {
    this.obstacleService.updateObstacle(obstacleId, {
      x: rect.x(),
      y: rect.y(),
    });
    this.layer.batchDraw();
  }

  // Update position when rectangle is dragged
  private handleRectangleDragEnd(rect: Konva.Rect): void {
    console.log('DragEnd triggered')
    this.isDragging = false;

    // Re-select the current rectangle and show the delete icon
    this.selectAndUpdateRect(rect);
  }

  // Enable transformer when rectangle is clicked
  private handleRectangleClick(rect: Konva.Rect): void {
    console.log('RectangleClick triggered');
    
    // Deselect any previously selected object
    this.handleDeselection();
    
    // Select and update the delete icon position
    this.selectAndUpdateRect(rect as Konva.Rect);
  }

  // Update size after the transformation (resizing)
  private handleRectangleTransform(rect: Konva.Rect, obstacleId: number): void {
    console.log('RectangleTransform triggered')
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

    // Re-select the current rectangle and show the delete icon
    this.selectAndUpdateRect(rect);
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
    this.populateFormWithValues(this.originalValues);

    // Show the popup form for editing
    this.showPopup = true;
  }

  private populateFormWithValues(values: Obstacle) {
    this.obstacleForm.setValue({
      x: values.x.toString(),
      y: values.y.toString(),
      width: values.width.toString(),
      height: values.height.toString(),
      color: values.color,
    });
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
  }

  // Cancel the form and revert to original values
  cancelEditForm() {
    if (this.currentRect && this.originalValues) {
      this.setRectangleProperties(this.currentRect, this.originalValues);

      // Reset the form values to the original values
      this.obstacleForm.patchValue({
        x: this.originalValues.x,
        y: this.originalValues.y,
        width: this.originalValues.width,
        height: this.originalValues.height,
        color: this.originalValues.color,
      });
    }
  }

  // Zoom in by increasing the zoom factor by 10%
  zoomIn(): void {
    this.adjustZoom(1.1);
  }

  // Zoom out by decreasing the zoom factor by 10%
  zoomOut(): void {
    this.adjustZoom(1 / 1.1);
  }

  // Reset the zoom to the default level
  resetZoom(): void {
    this.hideDeleteIcon();
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.layer.batchDraw();
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.hideDeleteIcon();
    let zoomLevel = this.stage.scaleX();
    const newZoom = zoomLevel * factor;

    if (newZoom > this.MAX_ZOOM || newZoom < this.MIN_ZOOM) return;
    this.stage.scale({ x: newZoom, y: newZoom });
    this.layer.batchDraw();
  }
  
  // Move the stage up
  moveUp(): void {
    this.moveCanvas(0, -this.PAN_OFFSET);
  }

  // Move the stage down
  moveDown(): void {
    this.moveCanvas(0, this.PAN_OFFSET);
  }

  // Move the stage left
  moveLeft(): void {
    this.moveCanvas(-this.PAN_OFFSET, 0);
  }

  // Move the stage right
  moveRight(): void {
    this.moveCanvas(this.PAN_OFFSET, 0);
  }

    // Adjust the canvas position by panning
  private moveCanvas(offsetX: number, offsetY: number) {
    this.hideDeleteIcon();
    this.stage.position({ x: this.stage.x() + offsetX, y: this.stage.y() + offsetY });
    this.layer.batchDraw();
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
