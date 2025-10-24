import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicule } from './vehicule.service';
import { Conducteur } from './conducteur.service';

export interface Trajet {
  _id?: string;
  motif: string[];
  date: string | Date;
  heure: string;
  kmDepart: number;
  kmArriver?: number;
  distanceParcourue?: number;
  status?: 'en cours' | 'terminé';
  vehicule: Vehicule;
  conducteur: Conducteur;
}


@Injectable({
  providedIn: 'root'
})
export class TrajetService {

  private apiUrl = 'http://localhost:5000/api/trajets';

  constructor(private http: HttpClient) {}

  getTrajets(): Observable<Trajet[]> {
    return this.http.get<Trajet[]>(this.apiUrl);
  }

  getTrajet(id: string): Observable<Trajet> {
    return this.http.get<Trajet>(`${this.apiUrl}/${id}`);
  }

  addTrajet(trajet: Trajet): Observable<Trajet> {
    return this.http.post<Trajet>(this.apiUrl, trajet);
  }

  updateTrajet(id: string, trajet: Partial<Trajet>): Observable<Trajet> {
    return this.http.put<Trajet>(`${this.apiUrl}/${id}`, trajet);
  }

  deleteTrajet(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
