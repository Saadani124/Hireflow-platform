import { Component, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {

  registerForm!: FormGroup;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['', Validators.required]
    });
  }

  onSubmit() {

    if (this.registerForm.invalid) {
      this.errorMessage = 'Please fill all fields correctly';
      return;
    }

    const payload = this.registerForm.value;

    this.errorMessage = '';

    this.auth.register(payload).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.log(err);

        if (err.status === 400) {
          this.errorMessage = err.error?.detail || 'Invalid data';
        } else if (err.status === 403) {
          this.errorMessage = 'Admin registration not allowed';
        } else {
          this.errorMessage = 'Server error';
        }

        this.cdr.detectChanges(); // 🔴 same fix as login
      }
    });
  }
}