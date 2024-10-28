import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObstacleComponentsModule } from 'src/app/components/obstacle-components.module';

import { FabricObstacleComponent } from './fabric-obstacle.component';
import { KonvaObstacleComponent } from './konva-obstacle.component';
import { Obstacle3DComponent } from './obstacle-3d.component';

@NgModule({
  declarations: [
    FabricObstacleComponent,
    KonvaObstacleComponent,
    Obstacle3DComponent,
  ],
  imports: [
    CommonModule,
    ObstacleComponentsModule,
  ],
  exports: [
    FabricObstacleComponent,
    KonvaObstacleComponent,
    Obstacle3DComponent,
  ]
})
export class ObstacleTestingModule { }