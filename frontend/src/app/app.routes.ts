import { Routes } from '@angular/router';
import { Welcome } from './welcome/welcome';
import { Signup } from './signup/signup';
import { Login } from './login/login';

export const routes: Routes = [
  { path: '', component: Welcome },
  { path: 'signup', component: Signup },
  { path: 'login', component: Login }
];