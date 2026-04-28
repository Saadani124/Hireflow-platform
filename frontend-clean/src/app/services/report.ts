import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private BASE = 'http://localhost:8000/reports';

  constructor(private http: HttpClient) {}

  reportJob(jobId: number, reason: string): Observable<any> {
    return this.http.post(`${this.BASE}/job/${jobId}`, { reason });
  }

  reportProposal(proposalId: number, reason: string): Observable<any> {
    return this.http.post(`${this.BASE}/proposal/${proposalId}`, { reason });
  }

  getAllReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/`);
  }

  getJobReports(jobId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/job/${jobId}`);
  }

  getProposalReports(proposalId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/proposal/${proposalId}`);
  }

  ignoreReport(reportId: number): Observable<any> {
    return this.http.delete(`${this.BASE}/${reportId}`);
  }
}
