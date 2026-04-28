import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

const BASE = 'http://localhost:8000';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  // ---- Auth ----
  user: any = null;
  token: string = '';

  // ---- UI State ----
  activeSection = 'overview';
  dataLoading = false;
  confirmModalOpen = false;
  deletingJob = false;

  // ---- Data ----
  stats: any = null;
  allUsers: any[] = [];
  allJobs: any[] = [];
  allProposals: any[] = [];

  // ---- Filtered Data ----
  filteredUsers: any[] = [];
  filteredJobs: any[] = [];
  filteredProposals: any[] = [];

  // ---- Search ----
  userSearch = '';
  jobSearch = '';
  proposalSearch = '';

  // ---- Delete ----
  deleteJobId: number | null = null;

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
    } catch { this.token = stored; }
    this.loadAdminData();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' });
  }

  loadAdminData() {
    this.dataLoading = true;

    // Load current admin user
    this.http.get<any>(`${BASE}/users/me`, { headers: this.headers() }).subscribe({
      next: (me) => {
        this.user = me;
        if (me.profile_image && !me.profile_image.startsWith('http')) {
          this.user.profile_image = BASE + me.profile_image;
        }
      }
    });

    // Load all admin data in parallel
    forkJoin({
      stats: this.http.get<any>(`${BASE}/admin/stats`, { headers: this.headers() }),
      users: this.http.get<any[]>(`${BASE}/admin/users`, { headers: this.headers() }),
      jobs: this.http.get<any[]>(`${BASE}/admin/jobs`, { headers: this.headers() }),
      proposals: this.http.get<any[]>(`${BASE}/admin/proposals`, { headers: this.headers() })
    }).subscribe({
      next: ({ stats, users, jobs, proposals }) => {
        this.stats = stats;
        this.allUsers = users;
        this.allJobs = jobs;
        this.allProposals = proposals;
        this.filteredUsers = [...users];
        this.filteredJobs = [...jobs];
        this.filteredProposals = [...proposals];
        this.dataLoading = false;
      },
      error: () => {
        this.dataLoading = false;
        this.showToast('Failed to load admin data. Are you logged in as admin?', 'error');
      }
    });
  }

  showSection(name: string) { this.activeSection = name; }

  filterUsers() {
    const q = this.userSearch.toLowerCase();
    this.filteredUsers = this.allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }

  filterJobs() {
    const q = this.jobSearch.toLowerCase();
    this.filteredJobs = this.allJobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.category.toLowerCase().includes(q) ||
      j.status.toLowerCase().includes(q)
    );
  }

  filterProposals() {
    const q = this.proposalSearch.toLowerCase();
    this.filteredProposals = this.allProposals.filter(p =>
      String(p.job_id).includes(q) ||
      String(p.freelancer_id).includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.message.toLowerCase().includes(q)
    );
  }

  openConfirmDelete(jobId: number) {
    this.deleteJobId = jobId;
    this.confirmModalOpen = true;
  }
  closeConfirm() { this.deleteJobId = null; this.confirmModalOpen = false; }

  confirmDelete() {
    if (!this.deleteJobId) return;
    this.deletingJob = true;
    this.http.delete(`${BASE}/admin/jobs/${this.deleteJobId}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.showToast('Job deleted successfully.', 'success');
        this.deletingJob = false;
        this.closeConfirm();
        this.loadAdminData();
      },
      error: () => {
        this.showToast('Failed to delete job.', 'error');
        this.deletingJob = false;
      }
    });
  }

  resolveImage(url: string): string {
    return url.startsWith('http') ? url : BASE + url;
  }

  formatDate(dtStr: string): string {
    if (!dtStr) return '—';
    try {
      return new Date(dtStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dtStr; }
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  showToast(message: string, type = '') {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 3500);
  }
}
