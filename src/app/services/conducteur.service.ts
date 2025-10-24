import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Conducteur {
  _id?: string;
  matricule: string;
  nom: string;
  prenom: string;
  nomUtilisateur: string;
  motDePasse: string;
  role: 'chauffeur' | 'coursier' | 'superviseur';
  access: 'simple' | 'total';
}

@Injectable({
  providedIn: 'root'
})
export class ConducteurService {
private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/conducteurs';

  getConducteurs(): Observable<Conducteur[]> {
    return this.http.get<Conducteur[]>(this.apiUrl);
  }

  getConducteur(id: string): Observable<Conducteur> {
    return this.http.get<Conducteur>(`${this.apiUrl}/${id}`);
  }

  createConducteur(conducteur: Conducteur): Observable<Conducteur> {
    return this.http.post<Conducteur>(this.apiUrl, conducteur);
  }

  updateConducteur(id: string, conducteur: Conducteur): Observable<Conducteur> {
    return this.http.put<Conducteur>(`${this.apiUrl}/${id}`, conducteur);
  }

  deleteConducteur(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}