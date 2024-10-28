import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FabricObstacleComponent } from './features/obstacle-testing/fabric-obstacle.component';
import { KonvaObstacleComponent } from './features/obstacle-testing/konva-obstacle.component';
import { Obstacle3DComponent } from './features/obstacle-testing/obstacle-3d.component';

const routes: Routes = [
  { path: 'fabric-obstacle', component: FabricObstacleComponent },
  { path: 'konva-obstacle', component: KonvaObstacleComponent },
  { path: '3d-obstacle', component: Obstacle3DComponent },
  { path: '', redirectTo: '/fabric-obstacle', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
