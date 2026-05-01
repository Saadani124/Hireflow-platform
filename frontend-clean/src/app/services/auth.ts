import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  API = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  login(data: any) {
    return this.http.post(`${this.API}/auth/login`, data);
  }

  register(data: any) {
    return this.http.post(`${this.API}/auth/register`, data);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  isLoggedIn() {
    return !!this.getToken();
  }
  getMe() {
  return this.http.get('http://localhost:8000/users/me');
  }
  uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(
      'http://localhost:8000/users/upload-profile-picture',
      formData
    );
  }
  updateProfile(data: any) {
    return this.http.put(
      'http://localhost:8000/users/me',
      data
    );
  }
}