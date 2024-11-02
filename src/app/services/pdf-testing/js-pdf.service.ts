import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { PdfService } from 'src/app/services/pdf-testing/pdf-generation.service';

@Injectable({
  providedIn: 'root'
})
export class JsPDFService {

  constructor(private pdfService: PdfService) {}

  // Generate a PDF with jsPDF
  generatePDF(pageCount: number) {
    const doc = new jsPDF();
    const testData = this.pdfService.generateTestData(pageCount);
    
    testData.forEach((page, index) => {
      if (index > 0) doc.addPage();
      doc.text(page.title, 10, 10);

       // Wrap the content to fit within page width (e.g., 180 units)
      const contentLines = doc.splitTextToSize(page.content, 180);

      doc.text(contentLines, 10, 20);
    });
    
    doc.save('jsPDF_output.pdf');
  }
}