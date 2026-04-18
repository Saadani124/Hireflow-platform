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
}