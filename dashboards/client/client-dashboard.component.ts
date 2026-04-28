import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, TitleCasePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const BASE = 'http://localhost:8000';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.css']
})
export class ClientDashboardComponent implements OnInit {

  // ---- Auth ----
  user: any = null;
  token: string = '';

  // ---- UI State ----
  menuOpen = false;
  activeSection = 'overview';
  loading = false;
  proposalsLoading = false;
  postModalOpen = false;
  submittingJob = false;

  // ---- Data ----
  myJobs: any[] = [];
  activeJobsWithProposals: { job: any; proposals: any[] }[] = [];

  // ---- Stats ----
  get openCount() { return this.myJobs.filter(j => j.status === 'open').length; }
  get inProgressCount() { return this.myJobs.filter(j => j.status === 'in_progress').length; }
  get completedCount() { return this.myJobs.filter(j => j.status === 'completed').length; }

  // ---- New Job Form ----
  newJob = { title: '', description: '', category: '', budget: null as number | null };

  // ---- Toast ----
  toastMessage = '';
  toastType = '';
  toastVisible = false;
  private toastTimer: any;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const stored = localStorage.getItem('user');
    if (!stored) { this.router.navigate(['/login']); return; }
    try {
      const parsed = JSON.parse(stored);
      this.token = parsed.access_token || parsed.token || parsed;
      this.user = parsed;
      if (this.user?.profile_image && !this.user.profile_image.startsWith('http')) {
        this.user.profile_image = BASE + this.user.profile_image;
      }
    } catch { this.token = stored; }

    this.loadUser();
    this.loadMyJobs();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' });
  }

  loadUser() {
    this.http.get<any>(`${BASE}/users/me`, { headers: this.headers() }).subscribe({
      next: (u) => {
        this.user = u;
        if (u.profile_image && !u.profile_image.startsWith('http')) {
          this.user.profile_image = BASE + u.profile_image;
        }
      }
    });
  }

  loadMyJobs() {
    this.loading = true;
    this.http.get<any[]>(`${BASE}/jobs/me`, { headers: this.headers() }).subscribe({
      next: (jobs) => { this.myJobs = jobs; this.loading = false; },
      error: () => {
        // Fallback: filter all jobs by client
        this.http.get<any[]>(`${BASE}/jobs/`, { headers: this.headers() }).subscribe({
          next: (all) => { this.myJobs = all.filter(j => j.client_id === this.user?.id); this.loading = false; },
          error: () => { this.loading = false; this.showToast('Failed to load jobs', 'error'); }
        });
      }
    });
  }

  loadProposals() {
    this.proposalsLoading = true;
    const activeJobs = this.myJobs.filter(j => j.status === 'open' || j.status === 'in_progress');
    if (!activeJobs.length) { this.proposalsLoading = false; return; }

    const results: { job: any; proposals: any[] }[] = [];
    let done = 0;

    activeJobs.forEach(job => {
      this.http.get<any[]>(`${BASE}/proposals/job/${job.id}`, { headers: this.headers() }).subscribe({
        next: (proposals) => {
          results.push({ job, proposals });
          done++;
          if (done === activeJobs.length) {
            this.activeJobsWithProposals = results;
            this.proposalsLoading = false;
          }
        },
        error: () => {
          results.push({ job, proposals: [] });
          done++;
          if (done === activeJobs.length) {
            this.activeJobsWithProposals = results;
            this.proposalsLoading = false;
          }
        }
      });
    });
  }

  showSection(name: string) {
    this.activeSection = name;
    this.menuOpen = false;
    if (name === 'proposals') {
      this.loadMyJobs();
      setTimeout(() => this.loadProposals(), 300);
    }
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.avatar-wrap')) this.menuOpen = false;
  }

  openPostModal() { this.postModalOpen = true; }
  closePostModal() { this.postModalOpen = false; }

  onModalOverlayClick(e: MouseEvent) {
    this.closePostModal();
  }

  submitJob() {
    const { title, description, category, budget } = this.newJob;
    if (!title || !description || !category || !budget) {
      this.showToast('Please fill all fields', 'error');
      return;
    }
    this.submittingJob = true;
    this.http.post(`${BASE}/jobs/create`, { title, description, category, budget }, { headers: this.headers() }).subscribe({
      next: () => {
        this.showToast('Job posted successfully!', 'success');
        this.submittingJob = false;
        this.closePostModal();
        this.newJob = { title: '', description: '', category: '', budget: null };
        this.loadMyJobs();
      },
      error: () => { this.showToast('Failed to post job', 'error'); this.submittingJob = false; }
    });
  }

  completeJob(id: number) {
    this.http.post(`${BASE}/jobs/complete/${id}`, {}, { headers: this.headers() }).subscribe({
      next: () => { this.showToast('Job marked as completed!', 'success'); this.loadMyJobs(); },
      error: () => this.showToast('Could not complete job', 'error')
    });
  }

  acceptProposal(id: number) {
    this.http.post(`${BASE}/proposals/accept/${id}`, {}, { headers: this.headers() }).subscribe({
      next: () => {
        this.showToast('Proposal accepted! Job is now in progress.', 'success');
        this.loadMyJobs();
        setTimeout(() => this.loadProposals(), 300);
      },
      error: () => this.showToast('Failed to accept proposal', 'error')
    });
  }

  uploadAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.token}` });
    this.http.post<any>(`${BASE}/users/upload-profile-picture`, formData, { headers }).subscribe({
      next: (data) => {
        this.user.profile_image = BASE + data.image_url;
        this.showToast('Profile picture updated!', 'success');
      },
      error: () => this.showToast('Upload failed', 'error')
    });
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  showToast(message: string, type = '') {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 3000);
  }
}
