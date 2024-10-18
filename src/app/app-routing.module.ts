import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FabricObstacleComponent } from './features/obstacle-testing/fabric-obstacle.component';
import { KonvaObstacleComponent } from './features/obstacle-testing/konva-obstacle.component';

const routes: Routes = [
  { path: 'fabric-obstacle', component: FabricObstacleComponent },
  { path: 'konva-obstacle', component: KonvaObstacleComponent },
  { path: '', redirectTo: '/fabric-obstacle', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
