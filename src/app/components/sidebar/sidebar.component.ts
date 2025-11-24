import { Component } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  isCollapsed = false;

  constructor(private auth: AuthService, private router: Router) {}

  // Ouvre le modal
  openLogoutModal() {
    const modalEl = document.getElementById('logoutModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  // Déconnexion
  confirmLogout() {
    this.auth.logout(); // supprime le token + redirige vers login
  }

  menuItems = [
    { path: '/accueil', icon: 'house-fill', label: 'Accueil' },
    { path: '/utilisateur', icon: 'person', label: 'Utilisateur'},
    { path: '/vehicules', icon: 'truck', label: 'Véhicules' },
    { path: '/conducteurs', icon: 'person-badge', label: 'Conducteurs' },
    { path: '/trajets', icon: 'geo-alt', label: 'Trajets' },
    { path: '/carburants', icon: 'fuel-pump', label: 'Carburant' },
    { path: '/entretiens', icon: 'tools', label: 'Entretien'},
    { path: '/alerter', icon: 'bell', label: 'Alerte'},
    { path: '/statistique', icon: 'graph-down', label: 'Statistique'},
  ];

}
