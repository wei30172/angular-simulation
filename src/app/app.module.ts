import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ObstacleTestingModule } from './features/obstacle-testing/obstacle-testing.module';

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
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
