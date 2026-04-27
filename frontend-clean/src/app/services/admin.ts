import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private BASE = 'http://localhost:8000/admin';

  constructor(private http: HttpClient) {}

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/stats`);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/users`);
  }

  getJobs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/jobs`);
  }

  getProposals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/proposals`);
  }

  getAllData(): Observable<any> {
    return forkJoin({
      stats: this.getStats(),
      users: this.getUsers(),
      jobs: this.getJobs(),
      proposals: this.getProposals()
    });
  }

  deleteJob(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/jobs/${id}`);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/users/${id}`);
  }
}
