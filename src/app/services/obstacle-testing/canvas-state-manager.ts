// Enum to represent the different possible states of the canvas
export enum CanvasState {
  Idle = 'Idle',          // No current action
  Drawing = 'Drawing',    // Currently drawing a rectangle
  Dragging = 'Dragging',  // Currently dragging an object
  Selecting = 'Selecting' // Currently selecting an object
}

// Class to manage the current state of the canvas
export class CanvasStateManager {
  // Initialize the canvas state to 'Idle'
  private currentState: CanvasState = CanvasState.Idle;

  // Get the current state of the canvas
  getState(): CanvasState {
    return this.currentState;
  }

  // Set a new state for the canvas
  setState(newState: CanvasState): void {
    this.currentState = newState;
  }

  // Check if the canvas is currently in the 'Idle' state
  isIdle(): boolean {
    return this.currentState === CanvasState.Idle;
  }

  // Check if the canvas is currently in the 'Drawing' state
  isDrawing(): boolean {
    return this.currentState === CanvasState.Drawing;
  }

  // Check if the canvas is currently in the 'Dragging' state
  isDragging(): boolean {
    return this.currentState === CanvasState.Dragging;
  }

  // Check if the canvas is currently in the 'Selecting' state
  isSelecting(): boolean {
    return this.currentState === CanvasState.Selecting;
  }
}