import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProposalService {

  private API = `${environment.apiUrl}/proposals/apply`;

  constructor(private http: HttpClient) {}

  apply(jobId: number, message: string, price: number) {
    return this.http.post(this.API, {
      job_id: jobId,
      message: message,
      price: price
    });
  }
  getByJob(jobId: number) {
    return this.http.get<any[]>(`${environment.apiUrl}/proposals/job/${jobId}`);
  }
  reject(id: number) {
    return this.http.post(`${environment.apiUrl}/proposals/reject/${id}`, {});
  }
  accept(id: number) {
    return this.http.post(`${environment.apiUrl}/proposals/accept/${id}`, {});
  }
  delete(id: number){
    return this.http.delete(`${environment.apiUrl}/proposals/${id}`)
  }
  getMine(){
    return this.http.get<any[]>(`${environment.apiUrl}/proposals/me`);
  }
  update(id: number, data: any) {
    return this.http.put(`${environment.apiUrl}/proposals/${id}`, data);
  }
}