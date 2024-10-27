import { Injectable } from '@angular/core';
import Konva from 'konva';

@Injectable({
  providedIn: 'root',
})
export class KonvaCanvasService {
  // Store the stage instance
  private stage: Konva.Stage | null = null;

  // Map to track objects and their events
  private objectEventMap: Map<Konva.Node, Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>> = new Map();

  // Default zoom and pan limits
  private readonly MIN_ZOOM = 1;
  private readonly MAX_ZOOM = 20;
  private readonly PAN_OFFSET = 10;
  private readonly SCALE_BY = 1.05;

  // Initialize the stage (canvas container)
  initializeStage(containerId: string, width: number = 640, height: number = 640) {
    this.stage = new Konva.Stage({
      container: containerId,
      width: width,
      height: height,
    });
  }

  // Get the stage instance
  getStage(): Konva.Stage | null {
    return this.stage;
  }

  // Load background image into the layer
  loadBackgroundImage(layer: Konva.Layer, imageUrl: string, onLoadCallback?: () => void) {
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
      layer.add(konvaImage); // Add the image to the layer
      layer.draw(); // Render the layer
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    };
  }

  // Adjust zoom level based on mouse wheel interaction
  adjustMouseWheelZoom(
    wheelEvent: WheelEvent,
    minZoom: number = this.MIN_ZOOM,
    maxZoom: number = this.MAX_ZOOM,
    scaleBy: number = this.SCALE_BY // smooths the zooming effect
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
    minZoom: number = this.MIN_ZOOM,
    maxZoom: number = this.MAX_ZOOM
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
    const offsetX = directionX * this.PAN_OFFSET;
    const offsetY = directionY * this.PAN_OFFSET;

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
}