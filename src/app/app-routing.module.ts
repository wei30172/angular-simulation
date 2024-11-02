import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FabricObstacleComponent } from './features/obstacle-testing/fabric-obstacle.component';
import { KonvaObstacleComponent } from './features/obstacle-testing/konva-obstacle.component';
import { Obstacle3DComponent } from './features/obstacle-testing/obstacle-3d.component';
import { FabricHeatmapComponent } from './features/heatmap-testing/fabric-heatmap.component';
import { KonvaHeatmapComponent } from './features/heatmap-testing/konva-heatmap.component';
import { SimpleheatHeatmapComponent } from './features/heatmap-testing/simpleheat-heatmap.component';
import { PdfTestComponent } from './features/pdf-testing/pdf-test.component';

const routes: Routes = [
  { path: 'fabric-obstacle', component: FabricObstacleComponent },
  { path: 'konva-obstacle', component: KonvaObstacleComponent },
  { path: 'obstacle-3d', component: Obstacle3DComponent },
  { path: 'fabric-heatmap', component: FabricHeatmapComponent },
  { path: 'konva-heatmap', component: KonvaHeatmapComponent },
  { path: 'simpleheat', component: SimpleheatHeatmapComponent },
  { path: 'pdf-test', component: PdfTestComponent },
  { path: '', redirectTo: '/fabric-obstacle', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
