import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
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
  showPopup = false;
  showDeleteIcon = false;
  deleteIconStyle = {};
  currentId: number | null = null;

  private canvas: fabric.Canvas;
  private currentRect: fabric.Rect | null = null;
  private originalValues: Obstacle | null = null;
  private startX: number | null = null;
  private startY: number | null = null;
  private isDragging = false;
  private isDrawing = false;
  private obstacleMap: Map<number, fabric.Rect> = new Map();
  private destroy$ = new Subject<void>()

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
    this.initializeCanvas(); // Initialize the canvas
    this.loadBackgroundImage(); // Load the background image
    this.bindCanvasEvents(); // Bind necessary canvas events
    this.subscribeToFormChanges(); // Subscribe to form changes
    this.subscribeToObstacles(); // Subscribe to obstacle data
  }

  ngOnDestroy() {
    // Remove all event listeners
    this.canvas.off();

    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialize the canvas
  private initializeCanvas() {
    this.canvas = new fabric.Canvas('fabricCanvas');
    this.canvas.selection = true;
  }

  // Load the background image for the canvas
  private loadBackgroundImage() {
    const bgImage = new Image();
    bgImage.src = 'assets/images/floorplan.jpg';
    bgImage.onload = () => {
      fabric.Image.fromURL(bgImage.src, (img) => {
        img.scaleToWidth(this.canvas.width);
        this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
        
        // Generate the initial set of obstacles
        this.obstacleService.generateRandomObstacles(
          this.OBSTACLE_COUNT,
          this.canvas.width,
          this.canvas.height
        );
      });
    };
    bgImage.onerror = () => {
      console.error('Background image failed to load.');
    };
  }


  // Bind canvas events for interaction
  private bindCanvasEvents() {
    // A rectangle is selected/selection is cleared
    this.canvas.on('selection:created', this.handleSelection.bind(this));
    this.canvas.on('selection:updated', this.handleSelection.bind(this));
    this.canvas.on('selection:cleared', this.handleDeselection.bind(this));

    // Mouse events for drawing rectangles
    this.canvas.on('mouse:down', this.handleMouseDown.bind(this));
    this.canvas.on('mouse:move', this.handleMouseMove.bind(this));
    this.canvas.on('mouse:up', this.handleMouseUp.bind(this));

    // Handle moving and modifying objects
    this.canvas.on('object:moving', this.handleObjectMoving.bind(this));
    this.canvas.on('object:modified', this.handleObjectModified.bind(this));

    // Handle zoom in/out using the mouse wheel
    this.canvas.on('mouse:wheel', this.handleMouseWheel.bind(this));

    this.canvas.renderAll(); // Initial rendering
  }

  // Handle when an object is selected
  private handleSelection(event: fabric.IEvent) {
    console.log('Selection triggered');
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
    this.showDeleteIcon = true;

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
  }

  // Handle when an object is deselected (e.g., clicking outside any object)
  private handleDeselection() {
    console.log('Deselection triggered')
    this.hideDeleteIcon()

    this.currentRect = null;
    this.currentId = null;

    this.isDragging = false;
    this.isDrawing = false;
  }

  // Hide the delete icon
  private hideDeleteIcon(){
    this.showDeleteIcon = false;
    this.deleteIconStyle = {};
  }

  // Handle when an object is moved (e.g., dragging a rectangle)
  private handleObjectMoving(event: fabric.IEvent) {
    console.log('ObjectMoving triggered')
    this.hideDeleteIcon();

    this.isDragging = true;
    const rect = event.target as fabric.Rect;

    if (this.currentId !== null) {
      this.obstacleService.updateObstacle(this.currentId, {
        x: rect.left!,
        y: rect.top!,
      });
    }
  }

   // Handle when object movement is finished
  private handleObjectModified() {
    console.log('ObjectModified triggered')
    this.isDragging = false;

    if (this.currentRect) {
      // Update the coordinates of the current rectangle to refresh its clickable area
      this.currentRect.setCoords();

      // Re-select the current rectangle and show the delete icon
      this.selectAndUpdateRect(this.currentRect);
    }
  }

  // Handle mouse down event for starting rectangle drawing or dragging
  private handleMouseDown(event: fabric.IEvent) {
    console.log('MouseDown triggered')
    if (this.isDragging || this.isDrawing) return;

    const activeObject = this.canvas.getActiveObject();

    if (activeObject && this.isRectangle(activeObject)) {
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
  private initiateDrawing(event: fabric.IEvent) {
    // Disable selection while drawing
    this.toggleObjectSelectable(false);

    const pointer = this.canvas.getPointer(event.e);
    if (!pointer) return;

    this.isDrawing = true;
    this.startX = pointer.x;
    this.startY = pointer.y;
    this.currentRect = null;
  }

  // Update the size of the rectangle as the mouse moves
  private handleMouseMove(event: fabric.IEvent) {
    if (!this.isDrawing) return;

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
    if (!this.isDrawing || !this.currentRect) return;

    this.isDrawing = false;
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
    
    // Update the bounding box (coordinates) after the rectangle is finalized
    this.currentRect.setCoords();

    // Assign a unique ID for the new obstacle
    const newObstacleId = Date.now();

    // Add the mousedblclick event to allow double-click editing
    this.currentRect.on('mousedblclick', () => {
      console.log('New: Rectangle double-clicked');
      this.showEditForm(this.currentRect!, newObstacleId);
    });

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
    wheelEvent.stopPropagation();

    // Adjust zoom level: the value 0.999 ** delta smooths the zooming effect
    this.adjustMouseWheelZoom(0.999 ** wheelEvent.deltaY, wheelEvent);
  }

  // Adjust zoom level based on mouse wheel interaction
  private adjustMouseWheelZoom(factor: number, wheelEvent: WheelEvent) {
    let zoom = this.canvas.getZoom(); // Get the current zoom level of the canvas
    zoom *= factor; // Adjust the zoom level based on the scroll distance

    if (zoom < this.MIN_ZOOM) zoom = this.MIN_ZOOM;
    if (zoom > this.MAX_ZOOM) zoom = this.MAX_ZOOM;

    // Zoom in/out relative to the mouse pointer position
    this.canvas.zoomToPoint({ x: wheelEvent.offsetX, y: wheelEvent.offsetY }, zoom);
  }
  
  // Subscribe to changes in the obstacle form
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
      x: this.currentRect.left,
      y: this.currentRect.top,
      width: this.currentRect.width,
      height: this.currentRect.height,
      color: formValue.color,
    });
  }

  // Apply updated properties to the rectangle
  private setRectangleProperties(rect: fabric.Rect, values: Partial<Obstacle>): void {
    const updatedProperties: Partial<fabric.Rect> = {
      left: values.x !== undefined ? parseFloat(values.x.toString()) : rect.left,
      top: values.y !== undefined ? parseFloat(values.y.toString()) : rect.top,
      width: values.width !== undefined ? parseFloat(values.width.toString()) : rect.width,
      height: values.height !== undefined ? parseFloat(values.height.toString()) : rect.height,
      fill: values.color !== undefined ? values.color : rect.fill,
    };
  
    rect.set(updatedProperties); // Update all properties at once
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
  }

  // Update a rectangle with the new obstacle properties
  private updateRectangle(rect: fabric.Rect, obstacle: Obstacle) {
    rect.set({
      left: obstacle.x,
      top: obstacle.y,
      width: obstacle.width,
      height: obstacle.height,
      fill: obstacle.color,
    }).setCoords();
  }

  // Add a new obstacle to the canvas
  private addNewObstacleToCanvas(obstacle: Obstacle) {
    const rect = this.createRectangle(obstacle);
    rect.set({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
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
    });

    // Add the mousedblclick event to allow double-click editing
    rect.on('mousedblclick', () => {
      console.log('Data: Rectangle double-clicked');
      this.showEditForm(rect, obstacle.id);
    });

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

  // Close the edit form and reset relevant variables
  closeEditForm() {
    this.showPopup = false;
    this.currentRect = null;
    this.currentId = null;
    this.originalValues = null;
  }

  // Cancel editing and revert to the original values
  cancelEditForm() {
    if (this.currentRect && this.originalValues) {
      this.setRectangleProperties(this.currentRect, this.originalValues);

      // Reset the form values to the original ones
      this.obstacleForm.patchValue({
        x: this.originalValues.x.toString(),
        y: this.originalValues.y.toString(),
        width: this.originalValues.width.toString(),
        height: this.originalValues.height.toString(),
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
    this.canvas.setZoom(1); // Reset zoom to default level
    this.canvas.absolutePan({ x: 0, y: 0 }); // Reset pan to the default position
  }

  // Adjust the zoom level
  private adjustZoom(factor: number) {
    this.hideDeleteIcon();
    let zoomLevel = this.canvas.getZoom();
    const newZoom = zoomLevel * factor;

    if (newZoom > this.MAX_ZOOM || newZoom < this.MIN_ZOOM) return;
    this.canvas.setZoom(newZoom);
  }

  // Move the canvas up
  moveUp() {
    this.moveCanvas(0, -this.PAN_OFFSET);
  }

  // Move the canvas down
  moveDown() {
    this.moveCanvas(0, this.PAN_OFFSET);
  }

  // Move the canvas left
  moveLeft() {
    this.moveCanvas(-this.PAN_OFFSET, 0);
  }

  // Move the canvas right
  moveRight() {
    this.moveCanvas(this.PAN_OFFSET, 0);
  }

  // Adjust the canvas position by panning
  private moveCanvas(offsetX: number, offsetY: number) {
    this.hideDeleteIcon();
    this.canvas.relativePan({ x: offsetX, y: offsetY });
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
