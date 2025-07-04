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

const CTX_LINE_WIDTH = 4;
const CTX_LINE_COLOR = '#808080';

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
  twoPerPageMode: boolean = false;

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
      if (this.twoPerPageMode) {
        for (let i = 0; i < this.generatedCards.length; i += 2) {
          const card1 = this.generatedCards[i];
          const card2 = this.generatedCards[i + 1] || null;
          await this.exportTwoCardsOnOneLandscapePage(
            card1,
            card2,
            Math.floor(i / 2) + 1
          );
        }
      } else {
        for (let i = 0; i < this.generatedCards.length; i++) {
          await this.exportCardAsPNG(this.generatedCards[i], i + 1);
        }
      }
      alert(`Successfully exported ${this.generatedCards.length} bingo cards!`);
    } catch (error) {
      console.error('Error exporting cards:', error);
      alert('An error occurred while exporting cards.');
    } finally {
      this.isExporting = false;
    }
  }

  private async exportTwoCardsOnOneLandscapePage(
    card1: BingoCard,
    card2: BingoCard | null,
    pageNumber: number
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const canvasWidth = 3300; // 11"
      const canvasHeight = 2550; // 8.5"
      const cardWidth = 1650;
      const cardHeight = 2550;
      const padding = 40;
      const gap = 32;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const drawCard = async (
        card: BingoCard,
        offsetX: number
      ): Promise<void> => {
        const availableHeight = cardHeight - 2 * padding;
        const gridHeight = (availableHeight - gap) / 1.25;
        const headerHeight = 0.25 * gridHeight;
        const cellWidth = (cardWidth - 2 * padding) / 5;
        const cellHeight = gridHeight / 5;

        // Draw header image (object-fit: contain)
        if (this.headerImage) {
          const img = new Image();
          img.src = this.headerImage.url;
          await new Promise((res) => {
            img.onload = () => {
              const aspectRatio = img.width / img.height;
              let drawWidth = headerHeight * aspectRatio;
              let drawHeight = headerHeight;

              if (drawWidth > cardWidth - 2 * padding) {
                drawWidth = cardWidth - 2 * padding;
                drawHeight = drawWidth / aspectRatio;
              }

              const x = offsetX + (cardWidth - drawWidth) / 2;
              const y = padding;
              ctx.drawImage(img, x, y, drawWidth, drawHeight);
              res(null);
            };
            img.onerror = () => res(null);
          });
        }

        const gridTop = padding + headerHeight + gap;

        const promises: Promise<void>[] = [];
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 5; col++) {
            const x = offsetX + padding + col * cellWidth;
            const y = gridTop + row * cellHeight;

            // Border
            ctx.strokeStyle = CTX_LINE_COLOR;
            ctx.lineWidth = CTX_LINE_WIDTH;
            ctx.strokeRect(x, y, cellWidth, cellHeight);

            const imageData = card.grid[row][col];
            if (imageData) {
              const img = new Image();
              img.src = imageData.url;

              const p = new Promise<void>((res) => {
                img.onload = () => {
                  // OBJECT-FIT: CONTAIN logic
                  const iw = img.width;
                  const ih = img.height;
                  const cellAR = cellWidth / cellHeight;
                  const imgAR = iw / ih;

                  let drawWidth = cellWidth - 10;
                  let drawHeight = cellHeight - 10;
                  let dx = x + 5;
                  let dy = y + 5;

                  if (imgAR > cellAR) {
                    // constrain width
                    drawWidth = cellWidth - 10;
                    drawHeight = drawWidth / imgAR;
                    dy = y + (cellHeight - drawHeight) / 2;
                  } else {
                    // constrain height
                    drawHeight = cellHeight - 10;
                    drawWidth = drawHeight * imgAR;
                    dx = x + (cellWidth - drawWidth) / 2;
                  }

                  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
                  res();
                };
                img.onerror = () => res();
              });
              promises.push(p);
            } else {
              ctx.fillStyle = '#f0f0f0';
              ctx.fillRect(x + 5, y + 5, cellWidth - 10, cellHeight - 10);
              ctx.fillStyle = '#333';
              ctx.font = `${Math.min(cellWidth, cellHeight) * 0.2}px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('FREE', x + cellWidth / 2, y + cellHeight / 2);
            }
          }
        }

        await Promise.all(promises);
      };

      await drawCard(card1, 0);
      if (card2) {
        await drawCard(card2, cardWidth);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bingo-cards-page-${pageNumber}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject('Failed to create PNG');
        }
      });
    });
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
          ctx.strokeStyle = CTX_LINE_COLOR;
          ctx.lineWidth = CTX_LINE_WIDTH;
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
