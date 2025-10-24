import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Vehicule } from './vehicule.service';

export interface Alerte {
  _id: string;
  vehicule: Vehicule;
  message: string;
  categorie: string;
  lue: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private apiUrl = 'http://localhost:5000/api/alertes';

  constructor(private http: HttpClient) {}

  // Récupérer toutes les alertes
  getAlertes(): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(this.apiUrl);
  }

  // Marquer une alerte comme lue
  marquerLue(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/lue`, {});
  }

  // Rafraîchissement automatique
  getAlertesAutoRefresh(intervalMs: number = 30000): Observable<Alerte[]> {
    return timer(0, intervalMs).pipe(switchMap(() => this.getAlertes()));
  }
}
