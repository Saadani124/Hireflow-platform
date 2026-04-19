import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class JobService {

  API = 'http://localhost:8000/jobs/';

  constructor(private http: HttpClient) {}

  getJobs() {
    return this.http.get<any[]>(this.API);
  }
  createJob(data: any) {
  return this.http.post('http://localhost:8000/jobs/create', data);
  }
  deleteJob(id: number) {
    return this.http.delete(`http://localhost:8000/admin/jobs/${id}`);
  }
}