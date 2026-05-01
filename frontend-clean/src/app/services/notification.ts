import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private BASE = 'http://localhost:8000/notifications';
  private WS_URL = 'ws://localhost:8000/notifications/ws';
  private socket: WebSocket | null = null;
  private realtimeSubject = new Subject<any>();

  constructor(private http: HttpClient) {}

  getAll(skip: number = 0, limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/?skip=${skip}&limit=${limit}`);
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

  // WebSocket methods
  connectWebSocket(token: string) {
    if (this.socket) {
      this.socket.close();
    }
    
    this.socket = new WebSocket(`${this.WS_URL}?token=${token}`);
    
    this.socket.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        this.realtimeSubject.next(notif);
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    this.socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };
  }

  disconnectWebSocket() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  getRealtimeStream(): Observable<any> {
    return this.realtimeSubject.asObservable();
  }
}
