// pdf-test.component.ts
import { Component, OnInit } from '@angular/core';

import { JsPDFService } from 'src/app/services/pdf-testing/js-pdf.service';
import { PdfLibService } from 'src/app/services/pdf-testing/pdf-lib.service';

@Component({
  selector: 'app-pdf-test',
  templateUrl: './pdf-test.component.html',
  styleUrls: ['./pdf-test.component.scss']
})
export class PdfTestComponent implements OnInit {
  pageCount = 10;

  constructor(
    private jsPDFService: JsPDFService,
    private pdfLibService: PdfLibService,
  ) {}

  ngOnInit(): void {}

  generatePdfWithJsPDF() {
    console.log('Generating PDF with jsPDF...');
    const startTime = performance.now();
    this.jsPDFService.generatePDF(this.pageCount);
    const endTime = performance.now();
    console.log(`jsPDF generation time: ${endTime - startTime} milliseconds.`);
  }

  async generatePdfWithPdfLib() {
    console.log('Generating PDF with pdf-lib...');
    const startTime = performance.now();
    await this.pdfLibService.generatePDF(this.pageCount);
    const endTime = performance.now();
    console.log(`pdf-lib generation time: ${endTime - startTime} milliseconds.`);
  }
}
