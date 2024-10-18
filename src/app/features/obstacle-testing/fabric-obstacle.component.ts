import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fabric } from 'fabric';

import { ObstacleService } from '../../services/obstacle.service';
import { Obstacle } from './obstacle.model';

@Component({
  selector: 'app-fabric-obstacle',
  templateUrl: './fabric-obstacle.component.html',
  styleUrls: ['./obstacle.component.scss']
})
export class FabricObstacleComponent implements OnInit, OnDestroy {
  obstacleList: Obstacle[] = [];
  obstacleForm: FormGroup;
  canvas: fabric.Canvas;
  isDragging = false;
  isDrawing = false;
  currentRect: fabric.Rect | null = null;
  currentId: number | null = null;
  originalValues: Obstacle | null = null;
  showPopup = false;
  showDeleteIcon = false;
  deleteIconStyle = {};
  private obstacleMap: Map<number, fabric.Rect> = new Map();
  private canvasWidth: number;
  private canvasHeight: number;
  private minZoom: number;

  private static readonly DEFAULT_COLOR = '#00FFFF';
  private static readonly OBSTACLE_COUNT = 100;

  private destroy$ = new Subject<void>()
  
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
    this.initializeCanvas(); // Initialize canvas
    this.loadBackgroundImage(); // Load background image
    this.bindCanvasEvents(); // Bind canvas events
    this.subscribeToFormChanges(); // Subscribe to form changes
    this.subscribeToObstacles(); // Subscribe to obstacle data
  }

  ngOnDestroy() {
    // Remove event listeners
    this.canvas.off();

    // Unsubscribe
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialize canvas
  private initializeCanvas() {
    this.canvas = new fabric.Canvas('fabricCanvas');
    this.canvasWidth = this.canvas.width || 800;
    this.canvasHeight = this.canvas.height || 800;
    this.minZoom = 1;
    this.canvas.selection = true;
  }

  // Load background image
  private loadBackgroundImage() {
    const bgImage = new Image();
    bgImage.src = 'assets/images/floorplan.jpg';

    bgImage.onload = () => {
      
      fabric.Image.fromURL(bgImage.src, (img) => {
        img.scaleToWidth(this.canvas.width);
        this.canvas.setBackgroundImage(
          img,
          this.canvas.renderAll.bind(this.canvas)
        );

        // Enable drawing after background is loaded
        this.enableDrawing();
        
        // Generate initial obstacles
        this.obstacleService.generateRandomObstacles(
          FabricObstacleComponent.OBSTACLE_COUNT,
          this.canvas.width,
          this.canvas.height
        );
      });
    };

    bgImage.onerror = () => {
      console.error('Background image failed to load.');
    };
  }

  // Enable drawing new rectangles on the canvas
  private enableDrawing() {
    this.isDrawing = false;
    this.currentRect = null;
    this.canvas.selection = true;
  }

  // Bind canvas events
  private bindCanvasEvents() {
    // Disable drawing when an object is being moved
    this.canvas.on('object:moving', (event) => this.handleObjectMoving(event));

    // Re-enable drawing after object modification
    this.canvas.on('object:modified', () => (this.isDragging = false));

    // Mouse events for drawing rectangles
    this.canvas.on('mouse:down', (event) => this.handleMouseDown(event));
    this.canvas.on('mouse:move', (event) => this.handleMouseMove(event));
    this.canvas.on('mouse:up', () => this.handleMouseUp());

    // Mouse wheel event to handle zoom in/out
    this.canvas.on('mouse:wheel', (opt) => this.handleMouseWheel(opt));

    // Listen for when a rectangle is selected
    this.canvas.on('selection:created', (event) => this.handleSelection(event));

    // Listen for when the selection is cleared
    this.canvas.on('selection:cleared', () => this.handleDeselection());

    this.canvas.renderAll();
  }

  // Start moving a rectangle
  private handleObjectMoving(event: fabric.IEvent) {
    this.hideDeleteIcon();
    this.isDragging = true;
  }

  // Start drawing a new rectangle
  private handleMouseDown(event: fabric.IEvent) {
    if (this.isDragging || this.isDrawing) return;

    this.toggleObjectSelectable(false);

    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject instanceof fabric.Rect) {
      this.isDragging = true;
      return;
    }

    const pointer = this.canvas.getPointer(event.e);

    this.isDrawing = true;
    
    const startX = pointer.x;
    const startY = pointer.y;

    const randomColor = this.obstacleService.getRandomColor();

    const rect = new fabric.Rect({
      left: startX,
      top: startY,
      width: 0,
      height: 0,
      fill: randomColor,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      evented: true,
    });

    this.canvas.add(rect);
    this.currentRect = rect;
  }

  // Update the size of the rectangle as the mouse moves
  private handleMouseMove(event: fabric.IEvent) {
    if (!this.isDrawing || !this.currentRect) return;

    const pointer = this.canvas.getPointer(event.e);
    this.currentRect.set({
      width: Math.abs(pointer.x - this.currentRect.left!),
      height: Math.abs(pointer.y - this.currentRect.top!)
    });
    this.canvas.renderAll();
  }

  // Finish drawing the rectangle
  private handleMouseUp() {
    if (this.isDrawing && this.currentRect) {
      this.isDrawing = false;

      this.toggleObjectSelectable(true);

      const newObstacleId = Date.now();

      // Adds a new obstacle to the obstacle service
      this.obstacleService.addObstacle({
        id: newObstacleId,
        x: this.currentRect.left!,
        y: this.currentRect.top!,
        width: this.currentRect.width!,
        height: this.currentRect.height!,
        color: typeof this.currentRect.fill === 'string' ? this.currentRect.fill : this.obstacleService.getRandomColor(),
      });

      this.obstacleMap.set(newObstacleId, this.currentRect);
      this.currentRect = null;
      this.canvas.renderAll();
    }
  }

  // Toggle oject selectable
  private toggleObjectSelectable(isSelectable: boolean) {
    if (this.canvas.selection !== isSelectable) {
      this.canvas.selection = isSelectable;
    }
    this.canvas.forEachObject((obj) => {
      if (obj.selectable !== isSelectable) {
        obj.selectable = isSelectable;
      }
    });
  }

  // Mouse wheel event to handle zoom in/out
  private handleMouseWheel(opt) {
    this.hideDeleteIcon();

    opt.e.preventDefault();
    opt.e.stopPropagation();

    const delta = opt.e.deltaY;
    let zoom = this.canvas.getZoom();
    zoom *= 0.999 ** delta;
    // Ensure zoom does not go below the minimum zoom level
    if (zoom < this.minZoom) zoom = this.minZoom;
    // Ensure maximum zoom level
    if (zoom > 20) zoom = 20;
    // Zoom to the point where the mouse is located
    this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  }

  // Show the delete icon
  private handleSelection(event: fabric.IEvent) {
    const activeObject = event.target;

    if (this.isRectangle(activeObject)) {
      if (this.isDragging) return
      this.currentRect = activeObject as fabric.Rect;
      this.updateDeleteIconPosition(this.currentRect);
    }
  }

  // Check if the selected object is a rectangle
  private isRectangle(object: fabric.Object | undefined): boolean {
    return object instanceof fabric.Rect;
  }

  // Update the delete icon's position
  private updateDeleteIconPosition(rect: fabric.Rect) {
    this.showDeleteIcon = true;

    const boundingRect = rect.getBoundingRect();
    const canvasOffset = this.canvas.getElement().getBoundingClientRect();
    
    this.deleteIconStyle = {
      position: 'absolute',
      top: `${boundingRect.top + canvasOffset.top - 10}px`,
      left: `${boundingRect.left + boundingRect.width + canvasOffset.left - 10}px`,
    };
  }

  // Hide the delete icon
  private handleDeselection() {
    this.hideDeleteIcon()
    this.currentRect = null;
  }

  private hideDeleteIcon(){
    this.showDeleteIcon = false;
    this.deleteIconStyle = {};
  }

  // Subscribe to form changes
  private subscribeToFormChanges() {
    this.obstacleForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((formValue) => {
        if (this.currentRect && this.currentId !== null) {
          // Update rectangle properties based on form
          this.updateRectangleFromForm(formValue); 
        }
      });
  }

  // Update the rectangle based on form values
  private updateRectangleFromForm(formValue: Obstacle) {
    if (this.currentRect && this.currentId !== null) {
      this.setRectangleProperties(this.currentRect, formValue);

      // Updates the obstacle in the obstacle service
      this.obstacleService.updateObstacle(this.currentId, {
        x: this.currentRect.left!,
        y: this.currentRect.top!,
        width: this.currentRect.width!,
        height: this.currentRect.height!,
        color: formValue.color,
      });
    }
  }

  // Set the rectangle properties
  private setRectangleProperties(rect: fabric.Rect, values: Partial<Obstacle>): void {
    const updatedProperties: Partial<fabric.Rect> = {};
  
    if (values.x !== undefined && rect.left !== values.x) {
      updatedProperties.left = parseFloat(values.x.toString());
    }
    if (values.y !== undefined && rect.top !== values.y) {
      updatedProperties.top = parseFloat(values.y.toString());
    }
    if (values.width !== undefined && rect.width !== values.width) {
      updatedProperties.width = parseFloat(values.width.toString());
    }
    if (values.height !== undefined && rect.height !== values.height) {
      updatedProperties.height = parseFloat(values.height.toString());
    }
    if (values.color !== undefined && rect.fill !== values.color) {
      updatedProperties.fill = values.color;
    }
  
    rect.set(updatedProperties);
    rect.setCoords();
    this.canvas.renderAll();
  }

  // Subscribe to obstacle data
  private subscribeToObstacles() {
    this.obstacleService.obstacles$
      .pipe(takeUntil(this.destroy$))
      .subscribe((newObstacles) => {
        this.updateObstacles(newObstacles);
        this.obstacleList = newObstacles;
      });
  }

  // Update obstacles without clearing the canvas
  private updateObstacles(newObstacles: Obstacle[]) {
    this.obstacleList = newObstacles;

    const currentObstacles = new Set(this.obstacleMap.keys());
    newObstacles.forEach((obstacle) => {
      // If the obstacle already exists, update its properties
      if (this.obstacleMap.has(obstacle.id)) {
        const rect = this.obstacleMap.get(obstacle.id)!;
        this.updateRectangle(rect, obstacle);
        currentObstacles.delete(obstacle.id);
      } else {
        // If the obstacle is new, create and add it to the canvas
        const rect = this.createRectangle(obstacle);
        this.obstacleMap.set(obstacle.id, rect);
        this.canvas.add(rect);
      }
    });

    // Remove obstacles that are no longer present in the new data
    currentObstacles.forEach((id) => {
      const rect = this.obstacleMap.get(id);
      if (rect) {
        this.canvas.remove(rect);
        this.obstacleMap.delete(id);
      }
    });

    this.canvas.renderAll();
  }

  // Helper function to update a rectangle
  private updateRectangle(rect: fabric.Rect, obstacle: Obstacle) {
    rect.set({
      left: obstacle.x,
      top: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color,
    }).setCoords();
  }

  // Helper function to create a rectangle and set up event handlers
  private createRectangle(obstacle: Obstacle): fabric.Rect {
    const rect = new fabric.Rect({
      left: obstacle.x,
      top: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color || FabricObstacleComponent.DEFAULT_COLOR,
      selectable: true,
    });

    // Disable drawing when dragging the rectangle
    rect.on('mousedown', () => {
      this.isDragging = true;
    });

    // Update obstacle position when moving
    rect.on('moving', () => {
      this.isDragging = true;

      // Updates the obstacle in the obstacle service
      this.obstacleService.updateObstacle(obstacle.id, {
        x: rect.left!,
        y: rect.top!,
      });
    });

    // Re-enable drawing after dragging
    rect.on('mouseup', () => {
      this.isDragging = false;
    });

    // Show edit form on double-click
    rect.on('mousedblclick', () => {
      this.showEditForm(rect, obstacle.id);
    });

    return rect;
  }

  // Show the edit form for a selected rectangle
  showEditForm(rect: fabric.Rect, obstacleId: number) {
    this.currentRect = rect;
    this.currentId = obstacleId;

    const rectColor = typeof rect.fill === 'string' ? rect.fill : FabricObstacleComponent.DEFAULT_COLOR;

    // Save the original values to allow cancellation
    this.originalValues = {
      id: obstacleId,
      x: rect.left!,
      y: rect.top!,
      width: rect.width!,
      height: rect.height!,
      color: rectColor,
    };

    // Populate the form with the rectangle's current values
    this.populateFormWithValues(this.originalValues);

    // Display the popup form
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

   // Close the edit form and reset variables
  submitEditForm() {
    this.closeEditForm();
  }

  // Cancel editing and revert to original values
  cancelEditForm() {
    if (this.currentRect && this.originalValues) {
      this.setRectangleProperties(this.currentRect, this.originalValues);

      // Reset the form values to the original values
      this.obstacleForm.patchValue({
        x: this.originalValues.x.toString(),
        y: this.originalValues.y.toString(),
        width: this.originalValues.width.toString(),
        height: this.originalValues.height.toString(),
        color: this.originalValues.color,
      });
    }
  }

  // Close the edit form and reset variables
  closeEditForm() {
    this.showPopup = false;
    this.currentRect = null;
    this.currentId = null;
    this.originalValues = null;
  }

  // Zoom in function
  zoomIn() {
    this.hideDeleteIcon();
    const zoomLevel = this.canvas.getZoom();
    const newZoom = zoomLevel * 1.1; // Increase zoom by 10%

    // Ensure zoom does not exceed 20x or go below the minimum zoom level
    if (newZoom > 20) return;
    this.canvas.setZoom(newZoom);
  }
  
  // Zoom out function
  zoomOut() {
    this.hideDeleteIcon();
    const zoomLevel = this.canvas.getZoom();
    const newZoom = zoomLevel / 1.1; // Decrease zoom by 10%

    // Ensure zoom does not go below the minimum zoom level
    if (newZoom < this.minZoom) return;
    this.canvas.setZoom(newZoom);
  }

  // Reset zoom function
  resetZoom() {
    this.hideDeleteIcon();
    this.canvas.setZoom(1);
    this.canvas.absolutePan({ x: 0, y: 0 });
  }

  // Move the canvas up
  moveUp() {
    this.hideDeleteIcon();
    this.canvas.relativePan({ x: 0, y: -10 });
  }

  // Move the canvas down
  moveDown() {
    this.hideDeleteIcon();
    this.canvas.relativePan({ x: 0, y: 10 });
  }

  // Move the canvas left
  moveLeft() {
    this.hideDeleteIcon();
    this.canvas.relativePan({ x: -10, y: 0 });
  }

  // Move the canvas right
  moveRight() {
    this.hideDeleteIcon();
    this.canvas.relativePan({ x: 10, y: 0 });
  }

  // Select obstacle
  selectObstacle(obstacleId: number) {
    const rect = this.obstacleMap.get(obstacleId);
    if (!rect) {
      console.warn('No obstacle found for this ID.');
      return;
    }

    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(rect);

    this.updateDeleteIconPosition(rect);
    this.currentRect = rect;
    this.currentId = obstacleId

    this.canvas.renderAll();
  }

  // Delete obstacle
  deleteObstacle(obstacleId?: number) {
    const confirmDelete = window.confirm('Are you sure you want to delete this obstacle?');
    if (!confirmDelete) return;
  
    let rect: fabric.Rect | null = null;
    if (obstacleId) {
      rect = this.obstacleMap.get(obstacleId);
    } else if (this.currentRect) {
      rect = this.currentRect;
      obstacleId = this.getObstacleIdByRect(this.currentRect);
    }
  
    if (!rect || obstacleId === -1) {
      console.warn('No obstacle found for this rectangle.');
      return;
    }
  
    // Remove the currently selected rectangle from the canvas
    this.canvas.remove(rect);

    // Remove the corresponding rectangle from obstacleMap
    this.obstacleMap.delete(obstacleId);

    // Remove the obstacle from ObstacleService
    this.obstacleService.removeObstacle(obstacleId);
  
    this.currentRect = null;
    this.showDeleteIcon = false;
    this.canvas.renderAll();
  }

  // Get obstacleId by rect
  getObstacleIdByRect(rect: fabric.Rect): number {
    for (const [id, storedRect] of this.obstacleMap.entries()) {
      if (storedRect === rect) {
        console.log(`Found matching obstacle with ID: ${id}`);
        return id;
      }
    }
    console.warn('No matching obstacle found for this rectangle.');
    return -1;
  }
}
