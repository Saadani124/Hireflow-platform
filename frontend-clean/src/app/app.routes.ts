import { Routes } from '@angular/router';
import { Welcome } from './pages/welcome/welcome';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { Profile } from './pages/profile/profile';
import { ClientDashboard } from './pages/client-dashboard/client-dashboard';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: ClientDashboard },

  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'ClientDashboard', component: ClientDashboard, canActivate: [authGuard] },

  { path: '', redirectTo: 'login', pathMatch: 'full' }
];