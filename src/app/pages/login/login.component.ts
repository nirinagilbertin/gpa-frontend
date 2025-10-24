import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/accueil']);
    }
  }

  onSubmit() {
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/accueil']),
      error: (err) => this.error = err.error.message || 'Erreur de connexion'
    });
  }
}
