import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProposalService {

  private API = 'http://localhost:8000/proposals/apply';

  constructor(private http: HttpClient) {}

  apply(jobId: number, message: string, price: number) {
    return this.http.post(this.API, {
      job_id: jobId,
      message: message,
      price: price
    });
  }
  getByJob(jobId: number) {
    return this.http.get<any[]>(`http://localhost:8000/proposals/job/${jobId}`);
  }

  accept(id: number) {
    return this.http.post(`http://localhost:8000/proposals/accept/${id}`, {});
  }
  delete(id: number){
    return this.http.delete(`http://localhost:8000/proposals/${id}`)
  }
  getMine(){
    return this.http.get<any[]>('http://localhost:8000/proposals/me');
  }
  update(id: number, data: any) {
    return this.http.put(`http://localhost:8000/proposals/${id}`, data);
  }
}