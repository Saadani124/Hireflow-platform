import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  API = environment.apiUrl;

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
    return this.http.get(`${this.API}/users/me`);
  }
  uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(
      `${this.API}/users/upload-profile-picture`,
      formData
    );
  }
  updateProfile(data: any) {
    return this.http.put(
      `${this.API}/users/me`,
      data
    );
  }

  generateBio(data: any) {
    return this.http.post(
      `${this.API}/users/generate-bio`,
      data
    );
  }

  summarizeBatch(bios: string[]) {
    return this.http.post(
      `${this.API}/users/summarize-batch`,
      { bios }
    );
  }
}