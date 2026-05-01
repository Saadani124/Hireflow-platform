import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify.html',
  styleUrls: ['./verify.css']
})
export class VerifyComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  message = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status = 'error';
      this.message = 'Invalid verification link.';
      return;
    }

    this.http.get(`http://localhost:8000/auth/verify?token=${token}`, {
      observe: 'response',
      responseType: 'text'
    }).subscribe({
      next: () => {
        this.status = 'success';
        this.message = 'Your account has been verified! You can now log in.';
        setTimeout(() => this.router.navigate(['/login'], { queryParams: { verified: 'true' } }), 3000);
      },
      error: (err) => {
        this.status = 'error';
        this.message = err?.error || 'This verification link is invalid or has expired.';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
