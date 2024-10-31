import { Injectable } from '@angular/core';
import { fabric } from 'fabric';

enum CanvasSettings {
  MinZoom = 0.2,
  MaxZoom = 20,
  PanOffset = 20,
  ScaleBy = 1.05,
}

@Injectable({
  providedIn: 'root',
})
export class FabricCanvasService {
  // Store the canvas and layer instance
  private canvas: fabric.Canvas | null = null;
  private heatmapLayer: fabric.Image | null = null;
  private gridLines: fabric.Line[] = [];
  private gridVisible = false;
  
  // Map to track objects and their events
  private objectEventMap: Map<fabric.Object, Map<string, (event: fabric.IEvent) => void>> = new Map();

  // Default constants
  private readonly DEFAULT_GRID_SIZE = 20;
  private readonly DEFAULT_WIDTH = 640;
  private readonly DEFAULT_HEIGHT = 640;

  // Initialize the canvas with optional grid size, width, and height
  initializeCanvas(
    canvasId: string,
    width: number = this.DEFAULT_WIDTH,
    height: number = this.DEFAULT_HEIGHT,
    gridSize: number = this.DEFAULT_GRID_SIZE
  ) {
    this.canvas = new fabric.Canvas(canvasId, { width, height });
    this.createGrid(gridSize);
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
      img.scaleToHeight(this.canvas.getHeight());
      
      this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas)); // Set background image and render canvas
      if (onLoadCallback) onLoadCallback(); // Execute callback when the image is loaded
    }
    // , { crossOrigin: 'anonymous' } // Handle cross-origin
    );
  }

  // Create grid lines based on grid size
  private createGrid(gridSize: number) {
    if (!this.canvas) return;
    
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();

    // Draw vertical and horizontal grid lines
    for (let i = 0; i < width / gridSize; i++) {
      const line = new fabric.Line([i * gridSize, 0, i * gridSize, height], {
        stroke: '#ddd',
        selectable: false,
        evented: false,
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    for (let j = 0; j < height / gridSize; j++) {
      const line = new fabric.Line([0, j * gridSize, width, j * gridSize], {
        stroke: '#ddd',
        selectable: false,
        evented: false,
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Initial setup to make grid invisible
    this.toggleObjectVisibility(this.gridLines, this.gridVisible);
  }

  // Toggle layer visibility
  toggleObjectVisibility(elements: fabric.Object[] | fabric.Object, isVisible: boolean) {
    if (Array.isArray(elements)) {
      elements.forEach(element => element.visible = isVisible);
    } else {
      elements.visible = isVisible;
    }
    this.canvas?.renderAll();
  }

  // Toggle grid visibility
  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.toggleObjectVisibility(this.gridLines, this.gridVisible);
  }
  
  // Adjust zoom level based on mouse wheel interaction
  adjustMouseWheelZoom(
    wheelEvent: WheelEvent,
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom,
    scaleBy: number = CanvasSettings.ScaleBy // smooths the zooming effect
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
    minZoom: number = CanvasSettings.MinZoom,
    maxZoom: number = CanvasSettings.MaxZoom
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
    const offsetX = directionX * CanvasSettings.PanOffset;
    const offsetY = directionY * CanvasSettings.PanOffset;

    this.canvas.relativePan({ x: offsetX, y: offsetY });
    this.canvas.renderAll();
  }

  // Add heatmap layer
  addHeatmapLayer(imageUrl: string) {
    if (!this.canvas) return;

    // Load the heatmap image from the provided URL
    fabric.Image.fromURL(imageUrl, (heatmapImage) => {
      // Scale the heatmap image to fit the entire canvas width and height
      heatmapImage.scaleToWidth(this.canvas.getWidth());
      heatmapImage.scaleToHeight(this.canvas.getHeight());

      // Set image properties
      heatmapImage.set({
        left: 0,
        top: 0,
        opacity: 0.8,
        selectable: false,
        evented: false,
      });
      
      // Remove the previous heatmap layer if it exists
      if (this.heatmapLayer) {
        this.canvas.remove(this.heatmapLayer);
      }
      // Insert the heatmap image at the second layer position
      // (above the background but below other elements)
      this.canvas.insertAt(heatmapImage, 1, true);
      this.heatmapLayer = heatmapImage;
      this.canvas.renderAll();
    });
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

  clearHeatmapLayer() {
    if (this.heatmapLayer) {
      this.canvas.remove(this.heatmapLayer);
      this.heatmapLayer = null;
      this.canvas.renderAll();
    }
  }

  // Clear listeners and canvas
  clearService() {
    if (this.canvas) {
      // Remove all event listeners
      this.canvas.off();
      this.clearAllObjectEvents(); // Clear all custom events
  
      if (this.heatmapLayer) {
        this.clearHeatmapLayer();
      }

      // Destroy the canvas
      this.canvas.clear();
      this.canvas.dispose();
      this.canvas = null;
    }

    // Reset grid and visibility flags
    this.gridVisible = false;
    this.gridLines = [];
  }
}