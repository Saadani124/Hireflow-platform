import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { ClientDashboard } from './pages/client-dashboard/client-dashboard';
import { authGuard } from './core/guards/auth-guard';
import { FreelancerDashboardComponent }from './pages/freelancer-dashboard/freelancer-dashboard';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { roleGuard } from './core/guards/role-guard';
import { VerifyComponent } from './pages/verify/verify';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'verify', component: VerifyComponent },

  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'ClientDashboard', component: ClientDashboard, canActivate: [roleGuard], data: { role: 'client' } },
  { path: 'FreelancerDashboard', component: FreelancerDashboardComponent, canActivate: [roleGuard], data: { role: 'freelancer' } },
  { path: 'AdminDashboard', component: AdminDashboardComponent, canActivate: [roleGuard], data: { role: 'admin' } },
  
  // Aliases for notification links
  { path: 'admin', redirectTo: 'AdminDashboard' },
  { path: 'admin-dashboard', redirectTo: 'AdminDashboard' },
  { path: 'client', redirectTo: 'ClientDashboard' },
  { path: 'client-dashboard', redirectTo: 'ClientDashboard' },
  { path: 'freelancer', redirectTo: 'FreelancerDashboard' },
  { path: 'freelancer-dashboard', redirectTo: 'FreelancerDashboard' },

  { path: '', redirectTo: 'login', pathMatch: 'full' }
];