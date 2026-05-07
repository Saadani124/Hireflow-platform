import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-pending-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-verification.html',
  styleUrls: ['./pending-verification.css']
})
export class PendingVerification implements OnInit {
  user: any = null;
  loading = false;
  statusMessage: string | null = null;
  statusType: 'success' | 'info' | 'error' | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.user.is_verified == 1 || this.user.is_verified === true) {
      this.router.navigate(['/home']);
    }
  }

  checkStatus() {
    console.log('Checking status...');
    this.loading = true;
    this.statusMessage = null;
    this.statusType = null;

    this.auth.getMe().subscribe({
      next: (user: any) => {
        console.log('User data received:', user);
        this.loading = false;
        this.auth.saveUser(user);
        this.user = user;

        // Use == to match both 1 and true
        if (user.is_verified == 1 || user.is_verified === true) {
          console.log('User is verified!');
          this.statusType = 'success';
          this.statusMessage = 'Congratulations! Your account has been verified.';
        } else {
          console.log('User is still pending.');
          this.statusType = 'info';
          this.statusMessage = 'Your account is still under review. Our team is working on it.';
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error checking status:', err);
        this.loading = false;
        this.statusType = 'error';
        this.statusMessage = 'Failed to check status. Please check your connection.';
        this.cdr.detectChanges();
      }
    });
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
