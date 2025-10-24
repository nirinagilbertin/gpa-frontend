import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicule } from './vehicule.service';

export interface EntretienProgramme {
  _id?: string;
  vehicule: Vehicule; // maintenant c'est un objet
  categorie: string;
  typeCondition: 'date' | 'kilometrage';
  datePrevue?: string;
  seuilKilometrage?: number;
  statut?: string;
  createdAt?: string;
}


@Injectable({
  providedIn: 'root'
})
export class EntretienProgrammeService {

  private apiUrl = 'http://localhost:5000/api/entretienProgrammes';

  constructor(private http: HttpClient) {}

  // Récupérer tous les entretiens programmés
  getEntretiens(): Observable<EntretienProgramme[]> {
    return this.http.get<EntretienProgramme[]>(this.apiUrl);
  }

  // Créer un entretien programmé
  creerEntretien(entretien: any): Observable<EntretienProgramme> {
    return this.http.post<EntretienProgramme>(this.apiUrl, entretien);
  }

  // Supprimer un entretien
  supprimerEntretien(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Marquer un entretien comme terminé
  marquerTermine(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/termine`, {});
  }
}
