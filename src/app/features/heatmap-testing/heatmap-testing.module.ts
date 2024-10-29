import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObstacleComponentsModule } from 'src/app/components/obstacle-components.module';
import { HeatmapComponentsModule } from 'src/app/components/heatmap-components.module';

import { FabricHeatmapComponent } from './fabric-heatmap.component';
import { KonvaHeatmapComponent } from './konva-heatmap.component';

@NgModule({
  declarations: [
    FabricHeatmapComponent,
    KonvaHeatmapComponent,
  ],
  imports: [
    CommonModule,
    ObstacleComponentsModule,
    HeatmapComponentsModule
  ],
  exports: [
    FabricHeatmapComponent,
    KonvaHeatmapComponent,
  ]
})
export class HeatmapTestingModule { }