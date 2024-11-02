import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PdfTestComponent } from './pdf-test.component';

@NgModule({
  declarations: [
    PdfTestComponent,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    PdfTestComponent,
  ]
})
export class PdfTestingModule { }