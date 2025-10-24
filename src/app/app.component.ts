import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from "./components/sidebar/sidebar.component";
import { HeaderComponent } from './components/header/header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent,HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'gpa-frontend';

  constructor(public router: Router) {}
}
