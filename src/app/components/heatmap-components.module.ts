import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToggleObstaclesComponent } from 'src/app/components/toggle-obstacles/toggle-obstacles.component';

@NgModule({
  declarations: [
    ToggleObstaclesComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    ToggleObstaclesComponent,
  ]
})
export class HeatmapComponentsModule { }