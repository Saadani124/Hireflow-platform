import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8000';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor(private http: HttpClient) {}

  login(data: any) {
  return this.http.post(
    'http://localhost:8000/auth/login',
    data   // ✅ JSON
  );
}

  register(data: any): Observable<any> {
    return this.http.post(`${API_URL}/auth/register`, data);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}