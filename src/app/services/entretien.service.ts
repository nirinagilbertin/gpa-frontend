import { Injectable } from '@angular/core';
import { Vehicule } from './vehicule.service';
import { Conducteur } from './conducteur.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Entretien {
  _id?: string;
  date: string | Date;
  categorie: string;
  raison?: string;
  garage: string;
  vehicule: Vehicule;
  conducteur: Conducteur;
  cout: number;
  kilometreCompteur: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntretienService {

  private apiUrl = 'http://localhost:5000/api/entretiens';

  constructor(private http: HttpClient) {}

  getEntretiens(): Observable<Entretien[]> {
    return this.http.get<Entretien[]>(this.apiUrl);
  }

  getEntretien(id: string): Observable<Entretien> {
    return this.http.get<Entretien>(`${this.apiUrl}/${id}`);
  }

  addEntretien(entretien: Entretien): Observable<Entretien> {
    return this.http.post<Entretien>(this.apiUrl, entretien);
  }

  updateEntretien(id: string, entretien: Partial<Entretien>): Observable<Entretien> {
    return this.http.put<Entretien>(`${this.apiUrl}/${id}`, entretien);
  }

  deleteEntretien(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
