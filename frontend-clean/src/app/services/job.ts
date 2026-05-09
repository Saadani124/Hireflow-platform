import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class JobService {

  API = `${environment.apiUrl}/jobs/`;

  constructor(private http: HttpClient) {}

  getJobs(skip: number = 0, limit: number = 50) {
    return this.http.get<any>(`${this.API}?skip=${skip}&limit=${limit}`);
  }
  getMyJobs() {
    return this.http.get<any[]>(`${environment.apiUrl}/jobs/me`);
  }
  createJob(data: any) {
  return this.http.post(`${environment.apiUrl}/jobs/create`, data);
  }
  deleteJobAsAdmin(id: number) {
    return this.http.delete(`${environment.apiUrl}/admin/jobs/${id}`);
  }
  completeJob(id: number) {
    return this.http.post(`${environment.apiUrl}/jobs/complete/${id}`, {});
  }
  deleteJobAsClient(id: number) {
    return this.http.delete(`${environment.apiUrl}/jobs/${id}`);
  }
}