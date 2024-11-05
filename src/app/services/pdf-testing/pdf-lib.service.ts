import { Injectable } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfService } from './pdf-data.service';

@Injectable({
  providedIn: 'root'
})
export class PdfLibService {
  private imageCache: { [url: string]: { bytes: Uint8Array; format: 'png' | 'jpeg' } } = {}; // Cache for images

  constructor(private pdfService: PdfService) {}

  // Generate a PDF with pdf-lib
  async generatePDF(testData: { title: string; content: string; imageBase64?: string }[]) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Preload and cache all images in parallel
    await this.preloadImages(testData);

    for (const pageData of testData) {
      let pdfPage = pdfDoc.addPage();
      const { width, height } = pdfPage.getSize();
      let currentY = height - 25; // Starting Y position for the page

      // Add title
      this.addTitle(pdfPage, pageData.title, currentY, font);
      currentY -= 20;

      // Add content
      currentY = this.addContent(pdfPage, pageData.content, currentY, font, width);

      // Add image if available and position it below the content
      if (pageData.imageBase64) {
        currentY = await this.addImage(pdfPage, pageData.imageBase64, currentY, pdfDoc, height);
      }
    }

    // Save and download PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pdfLib_output.pdf';
    link.click();
  }

  // Preload and cache all images in parallel
  private async preloadImages(testData: { imageBase64?: string }[]) {
    const preloadImagePromises = testData
      .filter(page => page.imageBase64)
      .map(page => this.preloadImage(page.imageBase64!));
    await Promise.all(preloadImagePromises);
  }

  // Add title to the page
  private addTitle(pdfPage: any, title: string, currentY: number, font: any) {
    pdfPage.drawText(title, {
      x: 10,
      y: currentY,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
  }

  // Add content to the page with word wrapping and paragraph spacing
  private addContent(pdfPage: any, content: string, currentY: number, font: any, width: number): number {
    const maxWidth = width - 20;
    const paragraphs = content.split('\n\n');
    const fontSize = 10;
  
    paragraphs.forEach((paragraph, index) => {
      const lines = this.splitText(paragraph.replace(/\n/g, ' '), maxWidth, font, fontSize);
  
      lines.forEach(line => {
        if (currentY < 30) {
          pdfPage = pdfPage.addPage();
          currentY = pdfPage.getHeight() - 25;
        }
        pdfPage.drawText(line, { x: 10, y: currentY, size: fontSize, font, color: rgb(0, 0, 0) });
        currentY -= 12;
      });
  
      if (index < paragraphs.length - 1) {
        currentY -= 20;
      }
    });
  
    return currentY - 10;
  }

  // Add image to the page if available
  private async addImage(pdfPage: any, imageBase64: string, currentY: number, pdfDoc: PDFDocument, pageHeight: number): Promise<number> {
    const cachedImage = this.imageCache[imageBase64];
    const { bytes, format } = cachedImage;

    // Use the appropriate embed method based on image format
    const image = format === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const imgDims = image.scale(0.5);

    if (currentY - imgDims.height < 0) {
      pdfPage = pdfDoc.addPage();
      currentY = pageHeight - 25;
    }

    pdfPage.drawImage(image, {
      x: 10,
      y: currentY - imgDims.height,
      width: imgDims.width,
      height: imgDims.height
    });

    return currentY - imgDims.height - 20;
  }

  // Preload image and store in cache, converting to JPEG if necessary
  private async preloadImage(imageBase64: string): Promise<void> {
    if (this.imageCache[imageBase64]) return;

    const convertedImageBase64 = await this.convertToJPEG(imageBase64);
    const response = await fetch(convertedImageBase64);
    const imageBytes = new Uint8Array(await response.arrayBuffer());
    const format = convertedImageBase64.startsWith('data:image/jpeg') ? 'jpeg' : 'png';

    this.imageCache[imageBase64] = { bytes: imageBytes, format };
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

 // Split text into lines with word wrapping
  private splitText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + word + ' ';
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });

    lines.push(currentLine.trim());
    return lines;
  }
}
