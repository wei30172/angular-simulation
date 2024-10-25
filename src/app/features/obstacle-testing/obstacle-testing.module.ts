import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObstacleComponentsModule } from 'src/app/components/obstacle-components.module';

import { FabricObstacleComponent } from './fabric-obstacle.component';
import { KonvaObstacleComponent } from './konva-obstacle.component';

@NgModule({
  declarations: [
    FabricObstacleComponent,
    KonvaObstacleComponent,
  ],
  imports: [
    CommonModule,
    ObstacleComponentsModule,
  ],
  exports: [
    FabricObstacleComponent,
    KonvaObstacleComponent,
  ]
})
export class ObstacleTestingModule { }