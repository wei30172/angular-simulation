import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private imageCache: { [url: string]: string } = {}; // Cache for base64 images

  // Generate test data for PDF with mixed content types
  async generateTestData(pageCount: number, maxParagraphs: number = 3, maxImages: number = 2, maxTables: number = 1): Promise<{ title: string; content: string; imageBase64?: string }[]> {
    const pages = [];

    for (let i = 0; i < pageCount; i++) {
      const contentSections = [];

      // Add random paragraphs
      const paragraphCount = this.getRandomInt(1, maxParagraphs);
      for (let j = 0; j < paragraphCount; j++) {
        contentSections.push(this.generateTextContent(i, 50));
      }

      // Add image as base64 and cache it
      let imageBase64 = '';
      const imageUrl = `https://picsum.photos/200/200?random=${i}`; // Use a unique URL for each page
      if (this.getRandomInt(1, maxImages) > 0) {
        imageBase64 = await this.getImageAsBase64(imageUrl);
      }

      // Add random tables
      const tableCount = this.getRandomInt(1, maxTables);
      for (let j = 0; j < tableCount; j++) {
        contentSections.push(this.generateTableContent(this.getRandomInt(2, 5), this.getRandomInt(2, 4)));
      }

      pages.push({
        title: `Page ${i + 1}`,
        content: contentSections.join('\n\n'),
        imageBase64 // Include base64 image if available
      });
    }

    return pages;
  }

  // Get image as base64 with caching
  private async getImageAsBase64(url: string): Promise<string> {
    if (this.imageCache[url]) {
      return this.imageCache[url]; // Return cached image if available
    }
    const base64 = await this.loadImageAsBase64(url);
    this.imageCache[url] = base64; // Cache the image
    return base64;
  }

  // Load image from URL and convert to base64
  private loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    });
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateTextContent(pageIndex: number, length: number): string {
    return `Paragraph ${pageIndex + 1}: ` + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(length / 10);
  }

  private generateTableContent(rows: number, columns: number): string {
    let table = 'Table:\n';
    for (let i = 0; i < rows; i++) {
      table += '| ' + Array(columns).fill('Cell').map((cell, index) => `${cell} ${index + 1}`).join(' | ') + ' |\n';
    }
    return table;
  }
}