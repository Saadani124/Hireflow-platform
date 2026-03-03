import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true,
  templateUrl: './welcome.html',
  styleUrl: './welcome.css'
})
export class Welcome {

  constructor(private router: Router) {}

  goSignup() {
    this.router.navigate(['/signup']);
  }

  goLogin() {
    this.router.navigate(['/login']);
  }
}