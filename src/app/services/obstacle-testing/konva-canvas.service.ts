import { Injectable } from '@angular/core';
import Konva from 'konva';

@Injectable({
  providedIn: 'root',
})
export class KonvaCanvasService {
  // Map to track objects and their events
  private objectEventMap: Map<Konva.Node, Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>> = new Map();

  // Initialize the stage (canvas container)
  initializeStage(containerId: string, width: number = 640, height: number = 640): Konva.Stage {
    return new Konva.Stage({
      container: containerId,
      width: width,
      height: height,
    });
  }

  // Load background image into the layer
  loadBackgroundImage(layer: Konva.Layer, imageUrl: string, stage: Konva.Stage, onLoadCallback?: () => void): void {
    const image = new Image();
    // image.crossOrigin = 'anonymous'; // Handle cross-origin
    image.src = imageUrl;
    image.onload = () => {
      const konvaImage = new Konva.Image({
        image: image,
        width: stage.width(),
        height: stage.height(),
      });
      layer.add(konvaImage); // Add the image to the layer
      layer.draw(); // Render the layer
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    };
  }

  // Bind events to the object and track them
  bindObjectEvents(object: Konva.Node, events: { [key: string]: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void }): void {
    const eventMap = new Map<string, (event: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void>();
    Object.keys(events).forEach(eventType => {
      const handler = events[eventType];
      object.on(eventType, handler); // Bind the event to the object
      eventMap.set(eventType, handler); // Track the event
    });
    this.objectEventMap.set(object, eventMap); // Store the object and its event handlers in the map
  }

  // Remove all events from the object
  unbindObjectEvents(object: Konva.Node): void {
    const eventMap = this.objectEventMap.get(object);
    if (eventMap) {
      eventMap.forEach((handler, eventType) => {
        object.off(eventType, handler); // Unbind the event from the object
      });
      this.objectEventMap.delete(object); // Remove the object from the map
    }
  }

  // Clear all events bound to objects on the stage
  clearAllObjectEvents(): void {
    this.objectEventMap.forEach((_, object) => {
      this.unbindObjectEvents(object); // Unbind all events for each object
    });
  }
}