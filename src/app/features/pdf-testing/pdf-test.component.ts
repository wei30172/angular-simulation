import { Component } from '@angular/core';
import { JsPDFService } from 'src/app/services/pdf-testing/js-pdf.service';
import { PdfLibService } from 'src/app/services/pdf-testing/pdf-lib.service';
import { PdfService } from 'src/app/services/pdf-testing/pdf-data.service';

@Component({
  selector: 'app-pdf-test',
  templateUrl: './pdf-test.component.html',
  styleUrls: ['./pdf-test.component.scss']
})
export class PdfTestComponent {
  pageCount = 10;
  isLoading = false;
  generationStatus = '';

  constructor(
    private jsPDFService: JsPDFService,
    private pdfLibService: PdfLibService,
    private pdfService: PdfService
  ) {}

  async generatePdf(tool: 'jsPDF' | 'pdf-lib') {
    this.isLoading = true;
    this.generationStatus = `Preparing test data for PDF generation...`;
    
    try {
      const testData = await this.pdfService.generateTestData(this.pageCount);
      this.generationStatus = 'Test data prepared successfully!';

      const startTime = performance.now();
      this.generationStatus = `Generating PDF with ${tool}...`;

      if (tool === 'jsPDF') {
        await this.jsPDFService.generatePDF(testData);
      } else {
        await this.pdfLibService.generatePDF(testData);
      }
      const endTime = performance.now();
      this.generationStatus = `${tool} PDF generated in ${(endTime - startTime).toFixed(2)} milliseconds.`;
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.generationStatus = 'An error occurred while generating the PDF. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }
}
