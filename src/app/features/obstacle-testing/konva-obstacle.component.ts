import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
  stage: Konva.Stage;
  layer: Konva.Layer;
  transformer: Konva.Transformer;
  isDragging = false;
  isDrawing = false;
  currentRect: Konva.Rect | null = null;
  currentId: number | null = null;
  originalValues: Obstacle | null = null;
  showPopup = false;
  showDeleteIcon = false;
  deleteIconStyle = {};
  private obstacleMap: Map<number, Konva.Rect> = new Map();
  private canvasWidth: number = 800;
  private canvasHeight: number = 800;

  private static readonly DEFAULT_COLOR = '#00FFFF';
  private static readonly OBSTACLE_COUNT = 100;

  private destroy$ = new Subject<void>();
  
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
    this.stage.off()
    // Destroy the Konva stage
    this.stage.destroy();

    // Unsubscribe
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

    // Initialize Konva transformer, allowing shape resizing
    this.transformer = new Konva.Transformer({
      rotateEnabled: false,
      resizeEnabled: true,
      ignoreStroke: true,
      anchorSize: 15,
      enabledAnchors: [
        'top-left', 'top-right', 'bottom-left', 'bottom-right',
        'middle-left', 'middle-right', 'top-center', 'bottom-center',
      ],
    });
    this.layer.add(this.transformer);
  }

   // Load background image
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

      // Enable drawing new obstacles
      this.enableDrawing();

       // Generate random obstacles (rectangles)
      this.obstacleService.generateRandomObstacles(
        KonvaObstacleComponent.OBSTACLE_COUNT,
        this.stage.width(),
        this.stage.height()
      );
    };
  }

  // Enable drawing new rectangles on the canvas
  private enableDrawing() {
    this.isDrawing = false;
    this.currentRect = null;
  }

  // Bind canvas events
  private bindCanvasEvents() {
    this.stage.on('mousedown', (event: Konva.KonvaEventObject<MouseEvent>) => this.handleMouseDown(event));
    this.stage.on('mousemove', () => this.handleMouseMove());
    this.stage.on('mouseup', () => this.handleMouseUp());

    this.stage.on('click', (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === this.stage) {
        this.deselectTransformer();
      } else if (e.target.getClassName() === 'Rect') {
        this.handleRectangleClick(e.target as Konva.Rect);
      }
    });

    this.stage.on('wheel', (e: Konva.KonvaEventObject<WheelEvent>) => this.handleMouseWheel(e));
  }

  // Start drawing a new rectangle
  private handleMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    if (this.isDrawing || this.isDragging) return;

    if (event.target.getClassName() === 'Rect') return;

    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    this.isDrawing = true;
    const rect = new Konva.Rect({
      x: pointer.x,
      y: pointer.y,
      width: 0,
      height: 0,
      fill: KonvaObstacleComponent.DEFAULT_COLOR,
      draggable: false,
    });

    this.layer.add(rect);
    this.currentRect = rect;
  }

  // Update the size of the rectangle as the mouse moves
  private handleMouseMove() {
    if (!this.isDrawing || !this.currentRect) return;

    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    const width = pointer.x - this.currentRect.x();
    const height = pointer.y - this.currentRect.y();
    this.currentRect.size({ width, height });
    this.layer.batchDraw();
  }

  // Finish drawing the rectangle
  private handleMouseUp() {
    if (this.isDrawing && this.currentRect) {
      this.isDrawing = false;
      this.currentRect.draggable(true);

      const newObstacleId = Date.now();
      this.obstacleService.addObstacle({
        id: newObstacleId,
        x: this.currentRect.x(),
        y: this.currentRect.y(),
        width: this.currentRect.width(),
        height: this.currentRect.height(),
        color: KonvaObstacleComponent.DEFAULT_COLOR,
      });

      this.obstacleMap.set(newObstacleId, this.currentRect);
      this.currentRect = null;
      this.layer.draw();
    }
  }

  // Deselect transformer and hide the delete icon
  private deselectTransformer() {
    if (this.currentRect) {
      this.currentRect.draggable(true);
      this.currentRect = null;
    }
    this.transformer.nodes([]);
    this.layer.batchDraw();
    this.hideDeleteIcon();
  }

  // Hide the delete icon
  private hideDeleteIcon() {
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
        x: this.currentRect.x(),
        y: this.currentRect.y(),
        width: this.currentRect.width(),
        height: this.currentRect.height(),
        color: this.currentRect.fill() as string,
      });
    }
  }

  // Set the rectangle properties
  private setRectangleProperties(rect: Konva.Rect, values: Partial<Obstacle>): void {
    rect.position({ x: values.x, y: values.y });
    rect.size({ width: values.width, height: values.height });
    rect.fill(values.color);

    this.layer.draw();
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

  // Update obstacles on the canvas
  private updateObstacles(newObstacles: Obstacle[]) {
    const currentObstacles = new Set(this.obstacleMap.keys());

    newObstacles.forEach(obstacle => {
      if (this.obstacleMap.has(obstacle.id)) {
        const rect = this.obstacleMap.get(obstacle.id)!;
        rect.position({ x: obstacle.x, y: obstacle.y });
        rect.size({ width: obstacle.width, height: obstacle.height });
        rect.fill(obstacle.color);
        currentObstacles.delete(obstacle.id);
      } else {
        // Create and add new obstacle to the canvas
        const rect = this.createRectangle(obstacle);
        this.obstacleMap.set(obstacle.id, rect);
        this.layer.add(rect);
      }
    });

    // Remove any obstacles that are no longer in the data
    currentObstacles.forEach(id => {
      const rect = this.obstacleMap.get(id);
      if (rect) {
        rect.destroy(); // Remove from canvas
        this.obstacleMap.delete(id);
      }
    });

    this.layer.draw();
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

  // Function to add event listeners to a rectangle
  private addRectangleEventListeners(rect: Konva.Rect, obstacleId: number): void {
    rect.on('dragstart', () => { this.isDragging = true; this.hideDeleteIcon(); });
    rect.on('dragend', () => { this.isDragging = false; });
    rect.on('dragmove', () => this.handleRectangleDrag(rect, obstacleId));
    rect.on('click', () => this.handleRectangleClick(rect));
    rect.on('transformend', () => this.handleRectangleTransform(rect, obstacleId));
    rect.on('dblclick', () => this.showEditForm(rect, obstacleId));
  }

  // Update position when rectangle is dragged
  private handleRectangleDrag(rect: Konva.Rect, obstacleId: number): void {
    this.obstacleService.updateObstacle(obstacleId, {
      x: rect.x(),
      y: rect.y(),
    });
    this.layer.batchDraw();
  }

  // Enable transformer when rectangle is clicked
  private handleRectangleClick(rect: Konva.Rect): void {
    if (this.isDragging) return;
    
    rect.draggable(true);

    this.transformer.nodes([rect]);
    this.transformer.moveToTop();
    rect.moveToTop();

    this.updateDeleteIconPosition(rect);
    this.layer.draw();
  }

  // Update the delete icon's position
  private updateDeleteIconPosition(rect: Konva.Rect): void {
    this.showDeleteIcon = true;

    const boundingRect = rect.getClientRect();
    const containerRect = this.stage.container().getBoundingClientRect();
    
    this.deleteIconStyle = {
      position: 'absolute',
      top: `${containerRect.top + boundingRect.y - 10}px`,
      left: `${containerRect.left + boundingRect.x + boundingRect.width + 10}px`,
    };
  }

  // Update size after the transformation (resizing)
  private handleRectangleTransform(rect: Konva.Rect, obstacleId: number): void {
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

    rect.draggable(true);
    this.layer.batchDraw();
  }
  
  // Show the form to edit rectangle properties
  private showEditForm(rect: Konva.Rect, obstacleId: number) {
    this.currentRect = rect;
    this.currentId = obstacleId;

    // Save the original rectangle values in case user cancels the edit
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

  // Mouse wheel event to handle zoom in/out
  private handleMouseWheel(e: Konva.KonvaEventObject<WheelEvent>): void {
    this.hideDeleteIcon();

    e.evt.preventDefault();
  
    const oldScale = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;
  
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  
    this.stage.scale({ x: newScale, y: newScale });
  
    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };
  
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
  
    this.stage.position(newPos);
    this.stage.batchDraw();
  }

  // Close the edit form and reset variables
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

  // Zoom in function
  zoomIn(): void {
    const zoomLevel = this.stage.scaleX();
    this.stage.scale({ x: zoomLevel * 1.1, y: zoomLevel * 1.1 });
    this.layer.batchDraw();
  }

  // Zoom out function
  zoomOut(): void {
    this.hideDeleteIcon();
    const zoomLevel = this.stage.scaleX();
    this.stage.scale({ x: zoomLevel / 1.1, y: zoomLevel / 1.1 });
    this.layer.batchDraw();
  }

  // Reset zoom function
  resetZoom(): void {
    this.hideDeleteIcon();
    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.layer.batchDraw();
  }

  // Move the stage up
  moveUp(): void {
    this.hideDeleteIcon();
    this.stage.position({ x: this.stage.x(), y: this.stage.y() - 10 });
    this.layer.batchDraw();
  }

  // Move the stage down
  moveDown(): void {
    this.hideDeleteIcon();
    this.stage.position({ x: this.stage.x(), y: this.stage.y() + 10 });
    this.layer.batchDraw();
  }

  // Move the stage left
  moveLeft(): void {
    this.hideDeleteIcon();
    this.stage.position({ x: this.stage.x() - 10, y: this.stage.y() });
    this.layer.batchDraw();
  }

  // Move the stage right
  moveRight(): void {
    this.hideDeleteIcon();
    this.stage.position({ x: this.stage.x() + 10, y: this.stage.y() });
    this.layer.batchDraw();
  }

  // Select obstacle
  selectObstacle(obstacleId: number) {
    const rect = this.obstacleMap.get(obstacleId);
    if (!rect) {
      console.warn('No obstacle found for this ID.');
      return;
    }

    if (this.currentRect && this.currentRect !== rect) {
      this.currentRect.draggable(true);
    }

    this.updateDeleteIconPosition(rect);
    rect.draggable(true);
    this.currentRect = rect;
    this.currentId = obstacleId

    this.transformer.nodes([rect]);
    this.layer.draw();
  }

  // Delete obstacle
  deleteObstacle(obstacleId?: number) {
    const confirmDelete = window.confirm('Are you sure you want to delete this obstacle?');
    if (!confirmDelete) return;
    
    let rect: Konva.Rect | null = null;
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
    rect.destroy();

    // Remove the corresponding rectangle from obstacleMap
    this.obstacleMap.delete(obstacleId);

    // Remove the obstacle from ObstacleService
    this.obstacleService.removeObstacle(obstacleId);

    this.currentRect = null;
    this.showDeleteIcon = false;

    this.transformer.nodes([]);
    this.layer.draw();
  }

  // Get obstacleId by rect
  getObstacleIdByRect(rect: Konva.Rect): number {
    for (const [id, storedRect] of this.obstacleMap.entries()) {
      if (storedRect === rect) {
        return id;
      }
    }
    console.warn('No matching obstacle found for this rectangle.');
    return -1;
  }
}
