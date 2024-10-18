import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { PopupOverlayComponent } from '..//components/popup-overlay/popup-overlay.component';
import { EditFormComponent } from '..//components/edit-form/edit-form.component';
import { ZoomControlsComponent } from '..//components/zoom-controls/zoom-controls.component';
import { ObstacleListComponent } from '..//components/obstacle-list/obstacle-list.component';
import { DeleteIconComponent } from '..//components/delete-icon/delete-icon.component';

@NgModule({
  declarations: [
    PopupOverlayComponent,
    EditFormComponent,
    ZoomControlsComponent,
    ObstacleListComponent,
    DeleteIconComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  exports: [
    PopupOverlayComponent,
    EditFormComponent,
    ZoomControlsComponent,
    ObstacleListComponent,
    DeleteIconComponent
  ]
})
export class ObstacleComponentsModule { }