import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class JsPDFService {
  private imageCache: Map<string, string> = new Map(); // Cache for images to avoid re-encoding

  // Main method to generate a PDF
  async generatePDF(testData: { title: string; content: string; imageBase64?: string }[]) {
    const doc = new jsPDF();

    for (let i = 0; i < testData.length; i++) {
      const page = testData[i];
      let currentY = 10; // Start Y position for the page

      // Add title
      currentY = this.addTitle(doc, page.title, currentY);

      // Add content
      currentY = this.addContent(doc, page.content, currentY);

      // Add image if available and only load when necessary
      if (page.imageBase64) {
        const cachedImage = await this.getCachedImage(page.imageBase64);
        currentY = this.addImage(doc, cachedImage, currentY);
      }

      // Add a new page if it's not the last one
      if (i < testData.length - 1) {
        doc.addPage();
      }
    }

    // Save and download the PDF
    doc.save('jsPDF_output.pdf');
  }

  // Add title to the page
  private addTitle(doc: jsPDF, title: string, startY: number): number {
    doc.setFontSize(12);
    doc.text(title, 10, startY);
    return startY + 10; // Move down after title
  }

  // Add content to the page with word wrapping and paragraph spacing
  private addContent(doc: jsPDF, content: string, startY: number): number {
    doc.setFontSize(10);

    // Split content by paragraphs using '\n\n'
    const paragraphs = content.split('\n\n');
    let currentY = startY;
    
    paragraphs.forEach((paragraph, index) => {
      // Wrap text within each paragraph
      const contentLines = doc.splitTextToSize(paragraph, 180); // Set max width to 180
      doc.text(contentLines, 10, currentY);
  
      // Move down for the next paragraph, add extra spacing between paragraphs
      currentY += contentLines.length * 5 + 10;
  
      // Add additional space between paragraphs except after the last one
      if (index < paragraphs.length - 1) {
        currentY += 5; // Extra spacing between paragraphs
      }
    });
  
    return currentY;
  }

  // Add image to the page if available
  private addImage(doc: jsPDF, imageBase64: string, startY: number): number {
    try {
      const imageHeight = 50; // Set desired image height
      const imageWidth = 50; // Set desired image width
      doc.addImage(imageBase64, 'JPEG', 10, startY, imageWidth, imageHeight);
      return startY + imageHeight + 10; // Move down after image
    } catch (error) {
      console.error("Failed to add image:", error);
      return startY;
    }
  }

  // Cache image data to avoid re-encoding
  private async getCachedImage(imageBase64: string): Promise<string> {
    if (this.imageCache.has(imageBase64)) {
      return this.imageCache.get(imageBase64)!; // Return cached image
    }

    // Optionally convert to JPEG to reduce size if necessary
    const optimizedImage = await this.convertToJPEG(imageBase64);
    this.imageCache.set(imageBase64, optimizedImage);
    return optimizedImage;
  }

 // Convert image to JPEG format to reduce size (only for large images)
  private async convertToJPEG(imageBase64: string): Promise<string> {
    const base64Length = (imageBase64.length * 3) / 4 - (imageBase64.endsWith('==') ? 2 : imageBase64.endsWith('=') ? 1 : 0);
    const imageSizeKB = base64Length / 1024;

    if (imageSizeKB < 50) {
      // Skip conversion for small images
      return imageBase64;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageBase64;
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Convert canvas to JPEG
          const jpegDataUrl = canvas.toDataURL('image/jpeg');
          resolve(jpegDataUrl);
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };

      img.onerror = (error) => {
        reject(error);
      };
    });
  }
}