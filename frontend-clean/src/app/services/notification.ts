import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private BASE = 'http://localhost:8000/notifications';

  constructor(private http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.BASE}/unread-count`);
  }

  markRead(id: number): Observable<any> {
    return this.http.patch(`${this.BASE}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.BASE}/read-all`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/${id}`);
  }
}
