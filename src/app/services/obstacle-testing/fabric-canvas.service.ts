import { Injectable } from '@angular/core';
import { fabric } from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class FabricCanvasService {
  // Store the canvas instance
  private canvas: fabric.Canvas | null = null;

  // Map to track objects and their events
  private objectEventMap: Map<fabric.Object, Map<string, (event: fabric.IEvent) => void>> = new Map();

  // Default zoom and pan limits
  private readonly MIN_ZOOM = 1;
  private readonly MAX_ZOOM = 20;
  private readonly PAN_OFFSET = 10;
  private readonly SCALE_BY = 1.05;

  // Initialize the canvas
  initializeCanvas(canvasId: string, width: number = 640, height: number = 640) {
    this.canvas = new fabric.Canvas(canvasId);
    this.canvas.setWidth(width);
    this.canvas.setHeight(height);
    this.canvas.selection = true; // Enable object selection
  }

  // Get the canvas instance
  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  // Load background image into the canvas
  loadBackgroundImage(imageUrl: string, onLoadCallback?: () => void) {
    if (!this.canvas) {
      throw new Error('Canvas is not initialized. Please initialize the canvas first.');
    }

    fabric.Image.fromURL(imageUrl, (img) => {
      img.scaleToWidth(this.canvas.getWidth());
      this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas)); // Set background image and render canvas
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    }
    // , { crossOrigin: 'anonymous' } // Handle cross-origin
    );
  }

  // Adjust zoom level based on mouse wheel interaction
  adjustMouseWheelZoom(
    wheelEvent: WheelEvent,
    minZoom: number = this.MIN_ZOOM,
    maxZoom: number = this.MAX_ZOOM,
    scaleBy: number = this.SCALE_BY // smooths the zooming effect
  ) {
    if (!this.canvas) return;

    // Get the current zoom level of the canvas
    let currentZoom = this.canvas.getZoom();
    
    // Calculate the zoom factor and limit the new zoom level
    const zoomFactor = wheelEvent.deltaY > 0 ? 1 / scaleBy : scaleBy;
    let newZoom = currentZoom * zoomFactor;
    newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

    // Zoom in/out relative to the mouse pointer position
    this.canvas.zoomToPoint({ x: wheelEvent.offsetX, y: wheelEvent.offsetY }, newZoom);
    this.canvas.renderAll();
  }

  // Reset the zoom to the default level
  resetZoom() {
    if (!this.canvas) return;

    this.canvas.setZoom(1);
    this.canvas.absolutePan({ x: 0, y: 0 });
    this.canvas.renderAll();
  }

  // Adjust the zoom level
  adjustZoom(
    factor: number,
    minZoom: number = this.MIN_ZOOM,
    maxZoom: number = this.MAX_ZOOM
  ) {
    if (!this.canvas) return;

    let zoomLevel = this.canvas.getZoom();
    const newZoom = zoomLevel * factor;

    // Ensure new zoom is within the defined limits
    if (newZoom > maxZoom || newZoom < minZoom) return;
    this.canvas.setZoom(newZoom);
    this.canvas.renderAll();
  }

  // Move the canvas by panning
  moveCanvas(directionX: number = 1, directionY: number = 1) {
    if (!this.canvas) return;

    // Apply PAN_OFFSET based on direction
    const offsetX = directionX * this.PAN_OFFSET;
    const offsetY = directionY * this.PAN_OFFSET;

    this.canvas.relativePan({ x: offsetX, y: offsetY });
    this.canvas.renderAll();
  }

  // Bind events to the object and track them
  bindObjectEvents(object: fabric.Object, events: { [key: string]: (event: fabric.IEvent) => void }) {
    const eventMap = new Map<string, (event: fabric.IEvent) => void>();
    Object.keys(events).forEach(eventType => {
      const handler = events[eventType];
      object.on(eventType, handler); // Bind the event to the object
      eventMap.set(eventType, handler); // Track the event
    });
    this.objectEventMap.set(object, eventMap); // Store the object and its event handlers in the map
  }

  // Remove all events from the object
  unbindObjectEvents(object: fabric.Object) {
    const eventMap = this.objectEventMap.get(object);
    if (eventMap) {
      eventMap.forEach((handler, eventType) => {
        object.off(eventType, handler); // Unbind the event from the object
      });
      this.objectEventMap.delete(object); // Remove the object from the map
    };
  }

  // Clear all events bound to objects on the canvas
  clearAllObjectEvents() {
    this.objectEventMap.forEach((_, object) => {
      this.unbindObjectEvents(object); // Unbind all events for each object
    });
  }
}