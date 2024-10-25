import { Injectable } from '@angular/core';
import { fabric } from 'fabric';

@Injectable({
  providedIn: 'root',
})
export class FabricCanvasService {
  // Map to track objects and their events
  private objectEventMap: Map<fabric.Object, Map<string, (event: fabric.IEvent) => void>> = new Map();

  // Initialize the canvas
  initializeCanvas(canvasId: string, width: number = 640, height: number = 640): fabric.Canvas {
    const canvas = new fabric.Canvas(canvasId);
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.selection = true; // Enable object selection
    return canvas;
  }

  // Load background image into the canvas
  loadBackgroundImage(canvas: fabric.Canvas, imageUrl: string, onLoadCallback?: () => void): void {
    fabric.Image.fromURL(imageUrl, (img) => {
      img.scaleToWidth(canvas.getWidth());
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas)); // Set background image and render canvas
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    }
    // , { crossOrigin: 'anonymous' } // Handle cross-origin
    );
  }

  // Bind events to the object and track them
  bindObjectEvents(object: fabric.Object, events: { [key: string]: (event: fabric.IEvent) => void }): void {
    const eventMap = new Map<string, (event: fabric.IEvent) => void>();
    Object.keys(events).forEach(eventType => {
      const handler = events[eventType];
      object.on(eventType, handler); // Bind the event to the object
      eventMap.set(eventType, handler); // Track the event
    });
    this.objectEventMap.set(object, eventMap); // Store the object and its event handlers in the map
  }

  // Remove all events from the object
  unbindObjectEvents(object: fabric.Object): void {
    const eventMap = this.objectEventMap.get(object);
    if (eventMap) {
      eventMap.forEach((handler, eventType) => {
        object.off(eventType, handler); // Unbind the event from the object
      });
      this.objectEventMap.delete(object); // Remove the object from the map
    };
  }

  // Clear all events bound to objects on the canvas
  clearAllObjectEvents(): void {
    this.objectEventMap.forEach((_, object) => {
      this.unbindObjectEvents(object); // Unbind all events for each object
    });
  }
}