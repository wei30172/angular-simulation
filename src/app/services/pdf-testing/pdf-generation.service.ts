import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  
  // Generate test data for PDF
  generateTestData(pageCount: number) {
    const pages = [];
    for (let i = 0; i < pageCount; i++) {
      pages.push({
        title: `Page ${i + 1}`,
        content: `This is the content for page ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
      });
    }
    return pages;
  }
}