import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {

  showTerms = false;
  showPrivacy = false;

  constructor(private router: Router) {}

  goLogin() {
    this.router.navigate(['/login']);
  }

  openTerms() {
    this.showTerms = true;
  }

  openPrivacy() {
    this.showPrivacy = true;
  }

  closeModals() {
    this.showTerms = false;
    this.showPrivacy = false;
  }
}