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
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Please fill all fields correctly';
      return;
    }

    const payload = this.registerForm.value;

    this.errorMessage = '';

    this.auth.register(payload).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        console.log(err);

        if (err.status === 400) {
          this.errorMessage = err.error?.detail || 'Invalid data';
        } else if (err.status === 403) {
          this.errorMessage = 'Admin registration not allowed';
        } else if (err.status === 422) {
          // 🔴 FASTAPI VALIDATION ERROR
          this.errorMessage = err.error?.detail?.[0]?.msg || 'Invalid input';
        } else {
          this.errorMessage = err.error?.detail || 'Server error';
        }

        this.cdr.detectChanges();
      }
    });
  }
}