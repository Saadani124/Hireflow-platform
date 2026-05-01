import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { normalizeImage } from '../../core/utils/image';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule,CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

  loginForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
  
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['verified'] === 'true') {
        this.successMessage = 'Your email has been successfully verified! You can now log in.';
      } else if (params['verified'] === 'already') {
        this.successMessage = 'Your email is already verified. You can log in.';
      }
    });
  }

  onSubmit() {
  this.submitted = true;
  this.successMessage = '';
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    this.errorMessage = 'Please fill all fields correctly';
    return;
  }

  const email = this.loginForm.get('email')?.value;
  const password = this.loginForm.get('password')?.value;

  const payload = {
    email: email,
    password: password
  };

  this.errorMessage = '';

  this.auth.login(payload).subscribe({
    next: (res: any) => {
      this.auth.saveToken(res.access_token);

      this.auth.getMe().subscribe((user: any) => {
        user.profile_image = normalizeImage(user.profile_image);
        this.auth.saveUser(user);
        this.router.navigate(['/home']);
      });
    },
    error: (err: any) => {
      console.log('ERROR:', err);

      if (err.status === 401) {
        this.errorMessage = 'Invalid email or password';
      } else if (err.status === 403) {
        this.errorMessage = err.error?.detail || 'Please verify your email before logging in. Check your inbox.';
      } else if (err.status === 422) {
        this.errorMessage = 'Invalid input format';
      } else {
        this.errorMessage = 'Server error';
      }

      this.cdr.detectChanges(); // 🔴 CRITICAL
    }
  });
}

}