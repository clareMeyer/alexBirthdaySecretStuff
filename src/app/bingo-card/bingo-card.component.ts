import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-bingo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bingo-card.component.html',
  styleUrls: ['./bingo-card.component.scss'],
})
export class BingoCardComponent {
  @Input() card!: BingoCard;
  @Input() cardNumber: number = 1;
  @Input() headerImageUrl: string | undefined = undefined;
}
