import { Component, OnInit } from '@angular/core';
import { Alerte, NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alertes.component.html',
  styleUrl: './alertes.component.css'
})
export class AlertesComponent implements OnInit {
  alertes: Alerte[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Récupération automatique toutes les 30s
    this.notificationService.getAlertesAutoRefresh().subscribe(alertes => {
      this.alertes = alertes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }

  marquerLue(alerte: Alerte) {
    this.notificationService.marquerLue(alerte._id).subscribe(() => {
      alerte.lue = true;
    });
  }
}
