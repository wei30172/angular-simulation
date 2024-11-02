import { Injectable } from '@angular/core';
import { PDFDocument, rgb } from 'pdf-lib';
import { PdfService } from 'src/app/services/pdf-testing/pdf-generation.service';

@Injectable({
  providedIn: 'root'
})
export class PdfLibService {
  constructor(private pdfService: PdfService) {}

  // Generate a PDF with pdf-lib
  async generatePDF(pageCount: number) {
    const pdfDoc = await PDFDocument.create();
    const testData = this.pdfService.generateTestData(pageCount);

    testData.forEach(async (page) => {
      const pdfPage = pdfDoc.addPage();
      pdfPage.drawText(page.title, { x: 10, y: pdfPage.getHeight() - 25, size: 12, color: rgb(0, 0, 0) });
      pdfPage.drawText(page.content, { x: 10, y: pdfPage.getHeight() - 50, size: 10, color: rgb(0, 0, 0) });
    });
    
    // Save the PDF file
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pdfLib_output.pdf';
    link.click();
  }
}