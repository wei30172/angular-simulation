import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Obstacle } from 'src/app/features/obstacle-testing/obstacle.model';

interface TooltipConfig {
  title?: string;
  description?: string;
  targetData: Partial<Obstacle>;
  container: HTMLElement | HTMLCanvasElement;
  offset?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  tooltipHeight?: number;
  tooltipWidth?: number;
  throttleDelay?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TooltipService {
  // BehaviorSubject to manage tooltip data
  private tooltipSubject = new BehaviorSubject<{
    title?: string;
    description?: string;
    style: { top: string; left: string };
    targetData: Partial<Obstacle>
  } | null>(null);

  // Observable for tooltip updates
  tooltip$ = this.tooltipSubject.asObservable();
  tooltipHeight: number = 36;
  tooltipWidth: number = 160;

  // Throttle flag to control frequency of showTooltip execution
  private isThrottling = false;

  // Display the tooltip
  showTooltip(config: TooltipConfig) {
    const {
      title,
      description,
      targetData,
      container,
      offset = 10,
      position = 'bottom',
      tooltipHeight = this.tooltipHeight,
      tooltipWidth = this.tooltipWidth,
      throttleDelay = 100,
    } = config;
    
    // Skip execution if throttling is active
    if (this.isThrottling) return;

    // Set throttle flag and clear it after the delay
    this.isThrottling = true;
    setTimeout(() => (this.isThrottling = false), throttleDelay);
    
    const tooltipPosition = this.calculatePosition(
      targetData,
      container,
      offset,
      position,
      tooltipHeight,
      tooltipWidth
    );
    
    this.tooltipSubject.next({ title, description, style: tooltipPosition, targetData });
  }

  // Hide the tooltip
  hideTooltip() {
    this.tooltipSubject.next(null);
  }

  // Calculate tooltip position
  private calculatePosition(
    targetData: Partial<Obstacle>,
    container: HTMLElement | HTMLCanvasElement,
    offset: number,
    position: 'top' | 'bottom' | 'left' | 'right',
    tooltipHeight: number,
    tooltipWidth: number
  ) {
    // Get container boundaries to calculate tooltip placement
    const containerRect = container.getBoundingClientRect();
    const { x = 0, y = 0, width = 0, height = 0 } = targetData;
  
    // Calculate obstacle's absolute position on the container
    const obstacleTop = y + containerRect.top;
    const obstacleLeft = x + containerRect.left;
  
    // Define tooltip positions for each direction with fallback options
    const positions = {
      top: { top: obstacleTop - tooltipHeight - offset, left: obstacleLeft, alternate: 'bottom' },
      bottom: { top: obstacleTop + height + offset, left: obstacleLeft, alternate: 'top' },
      left: { top: obstacleTop + height / 2 - tooltipHeight / 2, left: obstacleLeft - tooltipWidth - offset, alternate: 'right' },
      right: { top: obstacleTop + height / 2 - tooltipHeight / 2, left: obstacleLeft + width + offset, alternate: 'left' }
    };
  
    // Check if the position is out of container bounds
    const isOutOfBounds = (pos: 'top' | 'bottom' | 'left' | 'right') => {
      const { top, left } = positions[pos];
      return (pos === 'top' && top < containerRect.top) ||
             (pos === 'bottom' && top + tooltipHeight > containerRect.bottom) ||
             (pos === 'left' && left < containerRect.left) ||
             (pos === 'right' && left + tooltipWidth > containerRect.right);
    };
  
    // Determine the best position by checking boundaries
    const finalPosition = isOutOfBounds(position) ? positions[position].alternate : position;
    const chosenPosition = positions[finalPosition];
  
    // Adjust top and left values to stay within container bounds
    const adjustedLeft = Math.max(
      containerRect.left, 
      Math.min(chosenPosition.left, containerRect.right - tooltipWidth)
    ) + 'px';
  
    const adjustedTop = Math.max(
      containerRect.top, 
      Math.min(chosenPosition.top, containerRect.bottom - tooltipHeight)
    ) + 'px';
  
    // Return final tooltip position style
    return { top: adjustedTop, left: adjustedLeft };
  }
}