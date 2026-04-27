import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../services/admin';
import { Auth } from '../../services/auth';
import { normalizeImage } from '../../core/utils/image';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {

  // ---- Auth ----
  user: any = null;
  normalizeImage = normalizeImage;
  
  // ---- UI State ----
  menuOpen = false;
  activeSection = 'overview';
  dataLoading = false;
  confirmModalOpen = false;
  confirmUserModalOpen = false;
  confirmProposalModalOpen = false;
  deletingJob = false;
  deletingUser = false;
  deletingProposal = false;

  // ---- Data ----
  stats: any = null;
  allUsers: any[] = [];
  allJobs: any[] = [];
  allProposals: any[] = [];

  // ---- Filtered Data ----
  filteredUsers: any[] = [];
  filteredJobs: any[] = [];
  filteredProposals: any[] = [];

  // ---- Profile ----
  profileForm: FormGroup;
  editMode = false;
  imageMenu = false;
  menuX = 0;
  menuY = 0;
  viewModal = false;

  // ---- Search Form ----
  searchForm: FormGroup;

  // ---- Delete ----
  deleteJobId: number | null = null;
  deleteUserId: number | null = null;
  deleteProposalId: number | null = null;

  // ---- Toast ----
  toastMessage = '';
  toastType = '';
  toastVisible = false;
  private toastTimer: any;

  constructor(
    private adminService: AdminService, 
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      userSearch: [''],
      jobSearch: [''],
      proposalSearch: ['']
    });
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.user.profile_image) {
      this.user.profile_image = normalizeImage(this.user.profile_image);
    }

    this.profileForm.patchValue({
      name: this.user.name,
      email: this.user.email
    });

    this.route.queryParams.subscribe(params => {
      this.activeSection = params['section'] || 'overview';
    });

    this.searchForm.get('userSearch')?.valueChanges.subscribe(val => this.filterUsers(val));
    this.searchForm.get('jobSearch')?.valueChanges.subscribe(val => this.filterJobs(val));
    this.searchForm.get('proposalSearch')?.valueChanges.subscribe(val => this.filterProposals(val));

    this.loadAdminData();

    document.addEventListener('click', () => {
      this.menuOpen = false;
      this.imageMenu = false;
      this.cdr.detectChanges();
    });
  }

  /**
   * Fetches all platform data (users, jobs, proposals, stats) simultaneously
   * via the admin-specific backend endpoints.
   */
  loadAdminData() {
    this.dataLoading = true;

    // Load all admin data in parallel
    // the interceptor handles the token
    this.adminService.getAllData().subscribe({
      next: ({ stats, users, jobs, proposals }) => {
        this.stats = stats;
        this.allUsers = users;
        this.allJobs = jobs;
        this.allProposals = proposals;
        this.filteredUsers = [...users];
        this.filteredJobs = [...jobs];
        this.filteredProposals = [...proposals];
        this.dataLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.dataLoading = false;
        this.showToast('Failed to load admin data. Are you logged in as admin?', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  showSection(name: string) { 
    this.activeSection = name; 
    this.menuOpen = false;
    this.cdr.detectChanges();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.cdr.detectChanges();
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  filterUsers(query: string) {
    const q = (query || '').toLowerCase();
    this.filteredUsers = this.allUsers.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }

  filterJobs(query: string) {
    const q = (query || '').toLowerCase();
    this.filteredJobs = this.allJobs.filter(j =>
      (j.title && j.title.toLowerCase().includes(q)) ||
      (j.category && j.category.toLowerCase().includes(q)) ||
      (j.status && j.status.toLowerCase().includes(q))
    );
  }

  filterProposals(query: string) {
    const q = (query || '').toLowerCase();
    this.filteredProposals = this.allProposals.filter(p =>
      String(p.job_id).includes(q) ||
      String(p.freelancer_id).includes(q) ||
      (p.status && p.status.toLowerCase().includes(q)) ||
      (p.message && p.message.toLowerCase().includes(q))
    );
  }

  openConfirmDelete(jobId: number) {
    this.deleteJobId = jobId;
    this.confirmModalOpen = true;
    this.cdr.detectChanges();
  }

  openConfirmDeleteUser(userId: number) {
    this.deleteUserId = userId;
    this.confirmUserModalOpen = true;
    this.cdr.detectChanges();
  }

  openConfirmDeleteProposal(proposalId: number) {
    this.deleteProposalId = proposalId;
    this.confirmProposalModalOpen = true;
    this.cdr.detectChanges();
  }

  closeConfirm() { 
    this.deleteJobId = null; 
    this.confirmModalOpen = false; 
    this.cdr.detectChanges();
  }

  closeConfirmUser() {
    this.deleteUserId = null;
    this.confirmUserModalOpen = false;
    this.cdr.detectChanges();
  }

  closeConfirmProposal() {
    this.deleteProposalId = null;
    this.confirmProposalModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (!this.deleteJobId) return;
    this.deletingJob = true;
    this.adminService.deleteJob(this.deleteJobId).subscribe({
      next: () => {
        this.showToast('Job deleted successfully.', 'success');
        this.deletingJob = false;
        this.closeConfirm();
        this.loadAdminData();
      },
      error: () => {
        this.showToast('Failed to delete job.', 'error');
        this.deletingJob = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmDeleteUser() {
    if (!this.deleteUserId) return;
    this.deletingUser = true;
    this.adminService.deleteUser(this.deleteUserId).subscribe({
      next: () => {
        this.showToast('User deleted successfully.', 'success');
        this.deletingUser = false;
        this.closeConfirmUser();
        this.loadAdminData();
      },
      error: (err: any) => {
        this.showToast(err.error?.detail || 'Failed to delete user.', 'error');
        this.deletingUser = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmDeleteProposal() {
    if (!this.deleteProposalId) return;
    this.deletingProposal = true;
    this.adminService.deleteProposal(this.deleteProposalId).subscribe({
      next: () => {
        this.showToast('Proposal deleted successfully.', 'success');
        this.deletingProposal = false;
        this.closeConfirmProposal();
        this.loadAdminData();
      },
      error: (err: any) => {
        this.showToast(err.error?.detail || 'Failed to delete proposal.', 'error');
        this.deletingProposal = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // PROFILE
  // =========================

  toggleEdit() {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.profileForm.patchValue({
        name: this.user.name,
        email: this.user.email
      });
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) return;

    this.auth.updateProfile(this.profileForm.value).subscribe({
      next: (updatedUser: any) => {
        this.user = { ...this.user, ...updatedUser };
        if (this.user.profile_image) {
          this.user.profile_image = normalizeImage(this.user.profile_image);
        }
        localStorage.setItem('user', JSON.stringify(this.user));
        this.editMode = false;
        this.showToast('Profile updated', 'success');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.showToast(err.error?.detail || 'Update failed', 'error');
      }
    });
  }

  uploadAvatar(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.auth.uploadProfilePicture(file).subscribe({
      next: (res: any) => {
        this.user.profile_image = normalizeImage(res.image_url);
        localStorage.setItem('user', JSON.stringify(this.user));
        this.showToast('Profile picture updated', 'success');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.showToast(err.error?.detail || 'Upload failed', 'error');
      }
    });
  }

  onImageClick(event: MouseEvent) {
    event.stopPropagation();
    this.imageMenu = true;
    this.menuX = event.clientX + window.scrollX;
    this.menuY = event.clientY + window.scrollY;
  }

  triggerUpload() {
    this.imageMenu = false;
    document.getElementById('fileInput')?.click();
  }

  viewPhoto() {
    this.viewModal = true;
    this.imageMenu = false;
  }

  closeView() {
    this.viewModal = false;
  }

  formatDate(dtStr: string): string {
    if (!dtStr) return '—';
    try {
      return new Date(dtStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dtStr; }
  }

  logout() { 
    localStorage.clear(); 
    this.router.navigate(['/login']); 
  }

  showToast(message: string, type = '') {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { 
      this.toastVisible = false; 
      this.cdr.detectChanges();
    }, 3500);
    this.cdr.detectChanges();
  }
}
