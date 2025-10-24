import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Carburant {
  _id?: string;
  date: Date;
  litre: number;
  prixLitre: number;
  station: string;
  vehicule: any;
  conducteur: any;
  coutTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarburantService {
private apiUrl = 'http://localhost:5000/api/carburants';

  constructor(private http: HttpClient) {}

  getCarburants(): Observable<Carburant[]> {
    return this.http.get<Carburant[]>(this.apiUrl);
  }

  getCarburant(id: string): Observable<Carburant> {
    return this.http.get<Carburant>(`${this.apiUrl}/${id}`);
  }

  addCarburant(data: Carburant): Observable<Carburant> {
    return this.http.post<Carburant>(this.apiUrl, data);
  }

  updateCarburant(id: string, data: Carburant): Observable<Carburant> {
    return this.http.put<Carburant>(`${this.apiUrl}/${id}`, data);
  }

  deleteCarburant(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
