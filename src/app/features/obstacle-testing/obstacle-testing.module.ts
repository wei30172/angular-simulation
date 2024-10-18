import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObstacleComponentsModule } from '../../components/obstacle-omponents.module';

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