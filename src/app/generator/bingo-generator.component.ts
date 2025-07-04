import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BingoCardComponent } from '../bingo-card/bingo-card.component';

interface BingoImage {
  id: string;
  file: File;
  url: string;
  name: string;
}

interface BingoCard {
  id: string;
  grid: (BingoImage | null)[][];
  freeSpaceImage: BingoImage | null;
}

@Component({
  selector: 'app-bingo-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, BingoCardComponent],
  templateUrl: './bingo-generator.component.html',
  styleUrls: ['./bingo-generator.component.scss'],
})
export class BingoGeneratorComponent {
  images: BingoImage[] = [];
  headerImage: { file: File; url: string } | null = null;
  freeSpaceImage: BingoImage | null = null;
  freeSpaceImageId: string | null = null;
  numberOfCards: number = 1;
  generatedCards: BingoCard[] = [];
  isGenerating: boolean = false;
  isExporting: boolean = false;

  onHeaderSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.headerImage = {
          file,
          url: e.target.result,
        };
      };
      reader.readAsDataURL(file);
    }
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file: any) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const image: BingoImage = {
              id: this.generateId(),
              file: file,
              url: e.target.result,
              name: file.name,
            };
            this.images.push(image);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  removeImage(imageId: string): void {
    this.images = this.images.filter((img) => img.id !== imageId);
    if (this.freeSpaceImage?.id === imageId) {
      this.freeSpaceImage = null;
    }
  }

  setFreeSpace(image: BingoImage): void {
    this.freeSpaceImage = image;
  }

  generateCards(): void {
    if (this.images.length < 24) {
      alert(
        'You need at least 24 images to generate a bingo card (25 spaces minus free space).'
      );
      return;
    }

    // Set the actual image from selected ID
    if (this.freeSpaceImageId) {
      const matchedImage = this.images.find(
        (img) => img.id === this.freeSpaceImageId
      );
      this.freeSpaceImage = matchedImage || null;
    } else {
      this.freeSpaceImage = null;
    }

    this.isGenerating = true;
    this.generatedCards = [];

    setTimeout(() => {
      for (let i = 0; i < this.numberOfCards; i++) {
        const card = this.createBingoCard();
        this.generatedCards.push(card);
      }
      this.isGenerating = false;
    }, 100);
  }

  private createBingoCard(): BingoCard {
    const grid: (BingoImage | null)[][] = [];
    const availableImages = [...this.images];

    // Remove free space image from available images if it exists
    if (this.freeSpaceImage) {
      const freeSpaceIndex = availableImages.findIndex(
        (img) => img.id === this.freeSpaceImage!.id
      );
      if (freeSpaceIndex > -1) {
        availableImages.splice(freeSpaceIndex, 1);
      }
    }

    // Shuffle available images
    this.shuffleArray(availableImages);

    let imageIndex = 0;
    for (let row = 0; row < 5; row++) {
      grid[row] = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          // Free space (center)
          grid[row][col] = this.freeSpaceImage;
        } else {
          grid[row][col] = availableImages[imageIndex % availableImages.length];
          imageIndex++;
        }
      }
    }

    return {
      id: this.generateId(),
      grid: grid,
      freeSpaceImage: this.freeSpaceImage,
    };
  }

  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  async exportCards(): Promise<void> {
    if (this.generatedCards.length === 0) {
      alert('No cards to export. Please generate cards first.');
      return;
    }

    this.isExporting = true;

    try {
      for (let i = 0; i < this.generatedCards.length; i++) {
        await this.exportCardAsPNG(this.generatedCards[i], i + 1);
      }
      alert(`Successfully exported ${this.generatedCards.length} bingo cards!`);
    } catch (error) {
      console.error('Error exporting cards:', error);
      alert('An error occurred while exporting cards.');
    } finally {
      this.isExporting = false;
    }
  }

  private async exportCardAsPNG(
    card: BingoCard,
    cardNumber: number
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject('Could not get canvas context');
        return;
      }

      const cellSize = 120;
      const padding = 10;
      const gapBetweenHeaderAndGrid = 32; // changed from 20 to 16
      const canvasWidth = cellSize * 5 + padding * 2;

      let headerHeight = 0;
      const maxHeaderHeight = cellSize * 1.25;
      let headerDrawWidth = 0;

      if (this.headerImage) {
        const img = new Image();
        img.src = this.headerImage.url;
        await new Promise((resolveImg) => {
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            headerHeight = maxHeaderHeight; // fixed max height
            headerDrawWidth = headerHeight * aspectRatio; // width based on aspect ratio
            resolveImg(null);
          };
          img.onerror = () => resolveImg(null);
        });
      }

      canvas.width = canvasWidth;
      canvas.height =
        padding +
        headerHeight +
        gapBetweenHeaderAndGrid +
        cellSize * 5 +
        padding;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawHeader = (): Promise<void> => {
        return new Promise((resolveHeader) => {
          if (!this.headerImage) {
            resolveHeader();
            return;
          }

          const headerImg = new Image();
          headerImg.onload = () => {
            // Draw header image centered horizontally with smaller width
            const headerX = (canvasWidth - headerDrawWidth) / 2;
            ctx.drawImage(
              headerImg,
              headerX,
              padding,
              headerDrawWidth,
              headerHeight
            );
            resolveHeader();
          };
          headerImg.onerror = () => resolveHeader();
          headerImg.src = this.headerImage.url;
        });
      };

      await drawHeader();

      // Draw grid cells below header with gap
      let loadedImages = 0;
      const totalImages = 25;

      const checkComplete = () => {
        if (loadedImages === totalImages) {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `bingo-card-${cardNumber}.png`;
              a.click();
              URL.revokeObjectURL(url);
              resolve();
            } else {
              reject('Failed to create blob');
            }
          });
        }
      };

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const x = padding + col * cellSize;
          const y =
            padding + headerHeight + gapBetweenHeaderAndGrid + row * cellSize;

          // Cell border
          ctx.strokeStyle = '#ccc';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellSize, cellSize);

          const imageData = card.grid[row][col];

          if (imageData) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, x + 5, y + 5, cellSize - 10, cellSize - 10);
              loadedImages++;
              checkComplete();
            };
            img.onerror = () => {
              loadedImages++;
              checkComplete();
            };
            img.src = imageData.url;
          } else {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(x + 5, y + 5, cellSize - 10, cellSize - 10);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('FREE', x + cellSize / 2, y + cellSize / 2);
            loadedImages++;
            checkComplete();
          }
        }
      }
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
