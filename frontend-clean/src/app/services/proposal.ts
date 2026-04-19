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
}