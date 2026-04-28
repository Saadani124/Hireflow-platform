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

  getJobs(skip: number = 0, limit: number = 50, search_id?: number): Observable<any> {
    let url = `${this.BASE}/jobs?skip=${skip}&limit=${limit}`;
    if (search_id) url += `&search_id=${search_id}`;
    return this.http.get<any>(url);
  }

  getProposals(skip: number = 0, limit: number = 50, search_id?: number): Observable<any> {
    let url = `${this.BASE}/proposals?skip=${skip}&limit=${limit}`;
    if (search_id) url += `&search_id=${search_id}`;
    return this.http.get<any>(url);
  }

  getAllData(): Observable<any> {
    return forkJoin({
      stats: this.getStats(),
      users: this.getUsers(),
      jobs: this.getJobs(),
      proposals: this.getProposals()
    });
  }

  deleteJob(id: number, adminMessage?: string): Observable<any> {
    const options = adminMessage ? { body: { admin_message: adminMessage } } : {};
    return this.http.delete(`${this.BASE}/jobs/${id}`, options);
  }

  deleteUser(id: number, adminMessage?: string): Observable<any> {
    const options = adminMessage ? { body: { admin_message: adminMessage } } : {};
    return this.http.delete(`${this.BASE}/users/${id}`, options);
  }

  deleteProposal(id: number, adminMessage?: string): Observable<any> {
    const options = adminMessage ? { body: { admin_message: adminMessage } } : {};
    return this.http.delete(`${this.BASE}/proposals/${id}`, options);
  }
}
