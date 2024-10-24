import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-edit-form',
  templateUrl: './edit-form.component.html',
  styleUrls: ['./edit-form.component.scss']
})
export class EditFormComponent {
  @Input() formGroup: FormGroup;
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    this.submit.emit();
  }

  onReset() {
    this.reset.emit();
  }

  onDragStart(event: MouseEvent) {
    const popupElement = (event.target as HTMLElement).closest('.edit-form') as HTMLElement;
    
    // Calculate the current 'top' and 'left' of the popup
    const startLeft = parseInt(window.getComputedStyle(popupElement).left, 10);
    const startTop = parseInt(window.getComputedStyle(popupElement).top, 10);
    
    // Record the current mouse position relative to the popup's top-left corner
    const offsetX = event.clientX;
    const offsetY = event.clientY;
  
    // Update the popup position as the mouse moves
    const onMouseMove = (moveEvent: MouseEvent) => {
      // Calculate the new position of the popup after the mouse moves
      const newLeft = startLeft + (moveEvent.clientX - offsetX);
      const newTop = startTop + (moveEvent.clientY - offsetY);
      
      // Update the popup position
      popupElement.style.left = `${newLeft}px`;
      popupElement.style.top = `${newTop}px`;
    };
  
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}