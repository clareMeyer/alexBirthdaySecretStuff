import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BingoGeneratorComponent } from './generator/bingo-generator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BingoGeneratorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'bingo-card-generator';
}
