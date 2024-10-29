import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ObstacleTestingModule } from './features/obstacle-testing/obstacle-testing.module';
import { HeatmapTestingModule } from './features/heatmap-testing/heatmap-testing.module';

import { SidebarComponent } from './layout/sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ObstacleTestingModule,
    HeatmapTestingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
