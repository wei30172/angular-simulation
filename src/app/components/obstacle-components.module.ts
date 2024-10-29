import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { PopupOverlayComponent } from 'src/app/components/popup-overlay/popup-overlay.component';
import { EditFormComponent } from 'src/app/components/edit-form/edit-form.component';
import { ZoomControlsComponent } from 'src/app/components/zoom-controls/zoom-controls.component';
import { ObstacleListComponent } from 'src/app/components/obstacle-list/obstacle-list.component';
import { DeleteIconComponent } from 'src/app/components/delete-icon/delete-icon.component';
import { TooltipComponent } from 'src/app/components/tooltip/tooltip.component';

@NgModule({
  declarations: [
    PopupOverlayComponent,
    EditFormComponent,
    ZoomControlsComponent,
    ObstacleListComponent,
    DeleteIconComponent,
    TooltipComponent,
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
    DeleteIconComponent,
    TooltipComponent,
  ]
})
export class ObstacleComponentsModule { }