import { Injectable } from '@angular/core';
import Konva from 'konva';

enum CanvasSettings {
  MinZoom = 0.2,
  MaxZoom = 20,
  PanOffset = 20,
  ScaleBy = 1.05,
}

@Injectable({
  providedIn: 'root',
})
export class KonvaCanvasService {
  // Store the stage and layer instance
  private stage: Konva.Stage | null = null;
  private backgroundLayer: Konva.Layer | null = null;
  private obstacleLayer: Konva.Layer | null = null;
  private gridLayer: Konva.Layer | null = null;
  private gridVisible = false;
  
  // Map to track objects and their events
  private objectEventMap: Map<Konva.Node, Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>> = new Map();

  // Default constants
  private readonly DEFAULT_GRID_SIZE = 20;
  private readonly DEFAULT_WIDTH = 640;
  private readonly DEFAULT_HEIGHT = 640;

  // Initialize the stage with optional grid size, width, and height
  initializeStage(
    containerId: string,
    width: number = this.DEFAULT_WIDTH,
    height: number = this.DEFAULT_HEIGHT,
    gridSize: number = this.DEFAULT_GRID_SIZE
  ) {
    this.stage = new Konva.Stage({ container: containerId, width, height });

    // Initialize background, grid, and obstacle layers
    this.backgroundLayer = new Konva.Layer();
    this.gridLayer = new Konva.Layer();
    this.obstacleLayer = new Konva.Layer();

    this.stage.add(this.backgroundLayer);
    this.createGridLayer(gridSize);
    this.stage.add(this.gridLayer);
    this.stage.add(this.obstacleLayer);

    // Ensure grid layer is just above background
    this.gridLayer.moveToBottom();
    this.backgroundLayer.moveToBottom();
  }

  // Get the stage instance
  getStage(): Konva.Stage | null {
    return this.stage;
  }

  // Get the obstacle layer
  getObstacleLayer(): Konva.Layer | null {
    return this.obstacleLayer;
  }
  
  // Load background image into background layer
  loadBackgroundImage(imageUrl: string, onLoadCallback?: () => void) {
    if (!this.stage) {
      throw new Error('Stage is not initialized. Please initialize the stage first.');
    }

    const image = new Image();
    // image.crossOrigin = 'anonymous'; // Handle cross-origin
    image.src = imageUrl;
    image.onload = () => {
      const konvaImage = new Konva.Image({
        image: image,
        width: this.stage!.width(),
        height: this.stage!.height(),
      });
      this.backgroundLayer!.add(konvaImage);
      this.backgroundLayer!.draw();
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    };
  }

  // Create grid layer based on grid size
  private createGridLayer(gridSize: number) {
    if (!this.stage) return;
    
    const width = this.stage.width();
    const height = this.stage.height();

    // Draw vertical and horizontal grid lines
    for (let i = 0; i < width / gridSize; i++) {
      this.gridLayer.add(new Konva.Line({
        points: [i * gridSize, 0, i * gridSize, height],
        stroke: '#ddd',
        strokeWidth: 1,
      }));
    }

    for (let j = 0; j < height / gridSize; j++) {
      this.gridLayer.add(new Konva.Line({
        points: [0, j * gridSize, width, j * gridSize],
        stroke: '#ddd',
        strokeWidth: 1,
      }));
    }

    this.gridLayer.visible(this.gridVisible);
  }

  // Toggle layer visibility
  toggleLayerVisibility(layer: Konva.Layer) {
    layer.visible(!layer.visible());
    layer.draw();
    this.stage!.batchDraw();
  }

  // Toggle grid visibility
  toggleGrid() {
    if (this.gridLayer) this.toggleLayerVisibility(this.gridLayer);
  }

  // Toggle obstacle visibility
  toggleObstacle() {
    if (this.obstacleLayer) this.toggleLayerVisibility(this.obstacleLayer);
  }

  // Adjust zoom level based on mouse wheel interaction
  adjustMouseWheelZoom(
    wheelEvent: WheelEvent,
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom,
    scaleBy: number = CanvasSettings.ScaleBy // smooths the zooming effect
  ) {
    if (!this.stage) return;

    // Get the current zoom level of the stage
    let currentZoom = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    // Calculate the zoom factor and limit the new zoom level
    const zoomFactor = wheelEvent.deltaY > 0 ? 1 / scaleBy : scaleBy;
    let newZoom = currentZoom * zoomFactor;
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

    this.stage.scale({ x: newZoom, y: newZoom });

    // Calculate new position relative to the pointer
    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / currentZoom,
      y: (pointer.y - this.stage.y()) / currentZoom,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    };

    // Zoom in/out relative to the mouse pointer position
    this.stage.position(newPos);
    this.stage.batchDraw();
  }

  // Reset the zoom to the default level
  resetZoom() {
    if (!this.stage) return;

    this.stage.scale({ x: 1, y: 1 });
    this.stage.position({ x: 0, y: 0 });
    this.stage.batchDraw();
  }

  // Adjust the zoom level
  adjustZoom(
    factor: number,
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom
  ) {
    if (!this.stage) return;

    let zoomLevel = this.stage.scaleX();
    const newZoom = zoomLevel * factor;

    // Ensure new zoom is within the defined limits
    if (newZoom > maxZoom || newZoom < minZoom) return;
    this.stage.scale({ x: newZoom, y: newZoom });
    this.stage.batchDraw();
  }

  // Move the canvas by panning
  moveCanvas(directionX: number = 1, directionY: number = 1) {
    if (!this.stage) return;

    // Apply PAN_OFFSET based on direction
    const offsetX = directionX * CanvasSettings.PanOffset;
    const offsetY = directionY * CanvasSettings.PanOffset;

    this.stage.position({ x: this.stage.x() + offsetX, y: this.stage.y() + offsetY });
    this.stage.batchDraw();
  }

  // Bind events to the object and track them
  bindObjectEvents(
    object: Konva.Node,
    events: { [key: string]: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void }
  ) {
    const eventMap = new Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>();
    Object.keys(events).forEach(eventType => {
      const handler = events[eventType];
      object.on(eventType, handler); // Bind the event to the object
      eventMap.set(eventType, handler); // Track the event
    });
    this.objectEventMap.set(object, eventMap); // Store the object and its event handlers in the map
  }

  // Remove all events from the object
  unbindObjectEvents(object: Konva.Node) {
    const eventMap = this.objectEventMap.get(object);
    if (eventMap) {
      eventMap.forEach((handler, eventType) => {
        object.off(eventType, handler); // Unbind the event from the object
      });
      this.objectEventMap.delete(object); // Remove the object from the map
    }
  }

  // Clear all events bound to objects on the stage
  clearAllObjectEvents() {
    this.objectEventMap.forEach((_, object) => {
      this.unbindObjectEvents(object); // Unbind all events for each object
    });
  }

  // Clear listeners and stage
  clearService() {
    if (this.stage) {
      // Remove all event listeners
      this.stage.off();
      this.clearAllObjectEvents(); // Clear all custom events
      
      // Destroy all layers and destroy the stage
      this.stage.getLayers().forEach(layer => layer.destroy());
      this.stage.destroy();
      this.stage = null;
    }
    
    // Reset layers and visibility flags
    this.gridLayer = null;
    this.backgroundLayer = null;
    this.obstacleLayer = null;
    this.gridVisible = false;
  }
}