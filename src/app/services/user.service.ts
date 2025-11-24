import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  _id?: string;
  username: string;
  email?: string;
  phone?: string;
  role?: 'user' | 'admin' | string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private baseUrl = 'http://localhost:5000/api/users'; // adapte si nécessaire

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken'); // ← ici
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      })
    };
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl, this.getAuthHeaders());
  }

  // Remplacer toutes les méthodes pour utiliser les bons headers
  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/${id}`, this.getAuthHeaders());
  }

  createUser(payload: any) {
    return this.http.post(this.baseUrl, payload, this.getAuthHeaders());
  }

  updateUser(id: string, payload: any) {
    return this.http.put(`${this.baseUrl}/${id}`, payload, this.getAuthHeaders());
  }

  deleteUser(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`, this.getAuthHeaders());
  }
}
