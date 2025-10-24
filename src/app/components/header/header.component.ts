import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { interval, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  username = '';
  userInfo: any = {
    username: '',
    role: '',
    email: '',
    phone: ''
  }
  alertesNonLues: number = 0;
  alertes: any[] = [];
  showAlertesPanel: boolean = false;

  private alertesSubscription?: Subscription;

  constructor(
    private auth: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Récupération du username depuis le token
    const token = this.auth.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.username = payload.username;
      } catch (err) {
        console.error('Erreur lecture token', err);
      }

      // Profil utilisateur
      this.auth.getUserProfile()?.subscribe({
        next: (data) => (this.userInfo = data),
        error: (err) => console.error('Erreur profil', err)
      });
    }

    // Vérifie les alertes toutes les 5 secondes
    this.alertesSubscription = interval(5000)
      .pipe(switchMap(() => this.notificationService.getAlertes()))
      .subscribe(alertes => {
        this.alertes = alertes;
        this.alertesNonLues = alertes.filter(a => !a.lue).length;
      });

    // Chargement initial des alertes
    this.loadAlertes();
  }

  loadAlertes() {
    this.notificationService.getAlertes().subscribe(alertes => {
      this.alertes = alertes;
      this.alertesNonLues = alertes.filter(a => !a.lue).length;
    });
  }

  toggleAlertesPanel() {
    this.showAlertesPanel = !this.showAlertesPanel;
    if (this.showAlertesPanel) {
      this.loadAlertes(); // Recharger les alertes à l'ouverture
    }
  }

  closeAlertesPanel() {
    this.showAlertesPanel = false;
  }

  marquerAlerteLue(alerte: any) {
    this.notificationService.marquerLue(alerte._id).subscribe(() => {
      alerte.lue = true;
      this.alertesNonLues = this.alertes.filter(a => !a.lue).length;
    });
  }

  marquerToutesLues() {
    const alertesNonLues = this.alertes.filter(a => !a.lue);
    
    alertesNonLues.forEach(alerte => {
      this.notificationService.marquerLue(alerte._id).subscribe(() => {
        alerte.lue = true;
      });
    });
    
    this.alertesNonLues = 0;
  }

  logout() {
    this.auth.logout();
  }

  ngOnDestroy(): void {
    this.alertesSubscription?.unsubscribe();
  }
}