import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { Profile } from './pages/profile/profile';
import { Dashboard } from './pages/dashboard/dashboard';
import { AuthGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: 'home', component: Home, canActivate: [AuthGuard] },
  { path: 'profile', component: Profile, canActivate: [AuthGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard] },

  { path: '**', redirectTo: '' }
];