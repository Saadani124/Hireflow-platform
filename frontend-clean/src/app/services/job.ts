import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class JobService {

  API = 'http://localhost:8000/jobs/';

  constructor(private http: HttpClient) {}

  getJobs(skip: number = 0, limit: number = 50) {
    return this.http.get<any>(`${this.API}?skip=${skip}&limit=${limit}`);
  }
  getMyJobs() {
    return this.http.get<any[]>('http://localhost:8000/jobs/me');
  }
  createJob(data: any) {
  return this.http.post('http://localhost:8000/jobs/create', data);
  }
  deleteJobAsAdmin(id: number) {
    return this.http.delete(`http://localhost:8000/admin/jobs/${id}`);
  }
  completeJob(id: number) {
    return this.http.post(`http://localhost:8000/jobs/complete/${id}`, {});
  }
  deleteJobAsClient(id: number) {
    return this.http.delete(`http://localhost:8000/jobs/${id}`);
  }
}