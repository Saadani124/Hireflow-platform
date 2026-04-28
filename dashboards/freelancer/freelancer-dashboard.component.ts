import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const BASE = 'http://localhost:8000';

@Component({
  selector: 'app-freelancer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './freelancer-dashboard.component.html',
  styleUrls: ['./freelancer-dashboard.component.css']
})
export class FreelancerDashboardComponent implements OnInit {

  // ---- Auth ----
  user: any = null;
  token: string = '';

  // ---- UI State ----
  menuOpen = false;
  activeSection = 'dashboard';
  proposalsLoading = false;
  jobsLoading = false;
  applyModalOpen = false;
  submittingProposal = false;

  // ---- Data ----
  myProposals: any[] = [];
  openJobs: any[] = [];
  appliedJobIds = new Set<number>();
  applyingJob: any = null;
  proposalForm = { message: '', price: null as number | null };

  // ---- Stats ----
  get acceptedCount() { return this.myProposals.filter(p => p.status === 'accepted').length; }
  get pendingCount() { return this.myProposals.filter(p => p.status === 'pending').length; }

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
    this.loadProposals();
    this.loadOpenJobs();
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

  loadProposals() {
    this.proposalsLoading = true;
    this.http.get<any[]>(`${BASE}/proposals/me`, { headers: this.headers() }).subscribe({
      next: (proposals) => {
        this.myProposals = proposals;
        this.appliedJobIds = new Set(proposals.map(p => p.job_id));
        this.proposalsLoading = false;
      },
      error: () => { this.proposalsLoading = false; this.showToast('Failed to load applications', 'error'); }
    });
  }

  loadOpenJobs() {
    this.jobsLoading = true;
    this.http.get<any[]>(`${BASE}/jobs/`, { headers: this.headers() }).subscribe({
      next: (all) => {
        this.openJobs = all.filter(j => j.status === 'open');
        this.jobsLoading = false;
      },
      error: () => { this.jobsLoading = false; }
    });
  }

  showSection(name: string) {
    this.activeSection = name;
    this.menuOpen = false;
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.avatar-wrap')) this.menuOpen = false;
  }

  openApplyModal(job: any) {
    this.applyingJob = job;
    this.proposalForm = { message: '', price: null };
    this.applyModalOpen = true;
  }
  closeApplyModal() { this.applyModalOpen = false; this.applyingJob = null; }

  submitProposal() {
    const { message, price } = this.proposalForm;
    if (!message || !price) { this.showToast('Please fill all fields', 'error'); return; }
    this.submittingProposal = true;
    this.http.post(`${BASE}/proposals/apply`, {
      job_id: this.applyingJob.id,
      message,
      price
    }, { headers: this.headers() }).subscribe({
      next: () => {
        this.showToast('Application submitted!', 'success');
        this.submittingProposal = false;
        this.closeApplyModal();
        this.loadProposals();
        this.loadOpenJobs();
      },
      error: (err) => {
        const msg = err?.error?.detail?.includes('Already applied')
          ? 'You already applied to this job.'
          : 'Failed to submit proposal.';
        this.showToast(msg, 'error');
        this.submittingProposal = false;
      }
    });
  }

  deleteProposal(id: number) {
    this.http.delete(`${BASE}/proposals/${id}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.showToast('Application withdrawn.', 'success');
        this.loadProposals();
        this.loadOpenJobs();
      },
      error: () => this.showToast('Could not withdraw', 'error')
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
