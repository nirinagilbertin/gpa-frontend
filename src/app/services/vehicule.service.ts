import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Vehicule {
  _id?: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type: string;
  typeCarburant: string;
  kilometreCompteur: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehiculeService {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/vehicules';

  getVehicules(): Observable<Vehicule[]> {
    return this.http.get<Vehicule[]>(this.apiUrl);
  }

  getVehicule(id: string): Observable<Vehicule> {
    return this.http.get<Vehicule>(`${this.apiUrl}/${id}`);
  }

  createVehicule(vehicule: Vehicule): Observable<Vehicule> {
    return this.http.post<Vehicule>(this.apiUrl, vehicule);
  }

  updateVehicule(id: string, vehicule: Vehicule): Observable<Vehicule> {
    return this.http.put<Vehicule>(`${this.apiUrl}/${id}`, vehicule);
  }

  deleteVehicule(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
