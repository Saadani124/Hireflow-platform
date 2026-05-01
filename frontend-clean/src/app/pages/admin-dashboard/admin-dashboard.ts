import { Component, OnInit, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin';
import { AuthService } from '../../services/auth';
import { normalizeImage } from '../../core/utils/image';
import { NotificationService } from '../../services/notification';
import { ReportService } from '../../services/report';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // ---- Auth ----
  user: any = null;
  normalizeImage = normalizeImage;
  Math = Math;
  
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

  // ---- Pagination ----
  jobPage = 0;
  proposalPage = 0;
  pageSize = 50;
  totalJobs = 0;
  totalProposals = 0;

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

  // ---- Notifications ----
  notifOpen = false;
  notifications: any[] = [];
  unreadCount = 0;
  private notifPollInterval: any;

  // ---- Reports ----
  reports: any[] = [];
  reportDeleteModalOpen = false;
  reportToDelete: any = null;
  reportAdminMessage = '';
  modalError = '';
  modalLoading = false;

  constructor(
    private adminService: AdminService, 
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private reportService: ReportService
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

    this.loadUnreadCount();
    this.notifPollInterval = setInterval(() => this.loadUnreadCount(), 60000);
    
    if (this.activeSection === 'reports') {
      this.loadReports();
    }

    document.addEventListener('click', () => {
      this.menuOpen = false;
      this.imageMenu = false;
      this.notifOpen = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.notifPollInterval) clearInterval(this.notifPollInterval);
  }

  // =========================
  // NOTIFICATIONS
  // =========================
  loadUnreadCount() {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => { this.unreadCount = res.count; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  toggleNotifPanel(event: MouseEvent) {
    event.stopPropagation();
    this.notifOpen = !this.notifOpen;
    this.menuOpen = false;
    if (this.notifOpen) this.loadNotifications();
    this.cdr.detectChanges();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notifOpen = false;
    this.cdr.detectChanges();
  }

  loadNotifications() {
    this.notificationService.getAll().subscribe({
      next: (res) => { this.notifications = res; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  markAllRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  onNotifClick(notif: any) {
    this.notificationService.markRead(notif.id).subscribe();
    notif.is_read = true;
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.notifOpen = false;
    if (notif.link) this.router.navigateByUrl(notif.link);
    this.cdr.detectChanges();
  }

  /**
   * Fetches all platform data (users, jobs, proposals, stats) simultaneously
   * via the admin-specific backend endpoints.
   */
  loadAdminData() {
    this.dataLoading = true;

    this.adminService.getAllData().subscribe({
      next: ({ stats, users, jobs, proposals }) => {
        this.stats = stats;
        this.allUsers = users;
        
        // Handle paginated jobs
        this.allJobs = jobs.items;
        this.totalJobs = jobs.total;
        
        // Handle paginated proposals
        this.allProposals = proposals.items;
        this.totalProposals = proposals.total;

        this.filteredUsers = [...users];
        this.filteredJobs = [...this.allJobs];
        this.filteredProposals = [...this.allProposals];
        
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

  loadJobs() {
    this.dataLoading = true;
    const searchVal = this.searchForm.get('jobSearch')?.value || '';
    const searchId = (!isNaN(Number(searchVal)) && searchVal.trim() !== '') ? Number(searchVal) : undefined;
    
    this.adminService.getJobs(this.jobPage * this.pageSize, this.pageSize, searchId).subscribe({
      next: (res) => {
        this.allJobs = res.items;
        this.totalJobs = res.total;
        this.filteredJobs = [...this.allJobs];
        this.dataLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.dataLoading = false; }
    });
  }

  loadProposals() {
    this.dataLoading = true;
    const searchVal = this.searchForm.get('proposalSearch')?.value || '';
    const searchId = (!isNaN(Number(searchVal)) && searchVal.trim() !== '') ? Number(searchVal) : undefined;

    this.adminService.getProposals(this.proposalPage * this.pageSize, this.pageSize, searchId).subscribe({
      next: (res) => {
        this.allProposals = res.items;
        this.totalProposals = res.total;
        this.filteredProposals = [...this.allProposals];
        this.dataLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.dataLoading = false; }
    });
  }

  nextPageJobs() {
    if ((this.jobPage + 1) * this.pageSize < this.totalJobs) {
      this.jobPage++;
      this.loadJobs();
    }
  }

  prevPageJobs() {
    if (this.jobPage > 0) {
      this.jobPage--;
      this.loadJobs();
    }
  }

  nextPageProposals() {
    if ((this.proposalPage + 1) * this.pageSize < this.totalProposals) {
      this.proposalPage++;
      this.loadProposals();
    }
  }

  prevPageProposals() {
    if (this.proposalPage > 0) {
      this.proposalPage--;
      this.loadProposals();
    }
  }

  showSection(section: string) {
    this.activeSection = section;
    this.router.navigate([], { relativeTo: this.route, queryParams: { section }});
    this.menuOpen = false;
    if (section !== 'profile') this.editMode = false;
    if (section === 'reports') {
      this.loadReports();
    } else {
      this.loadAdminData();
    }
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
    
    // If it looks like an ID, we reload from server for specific search
    // If empty, we reload from server to get the normal paginated list
    if (q.trim() === '' || (!isNaN(Number(q)) && q.trim() !== '')) {
      this.jobPage = 0; 
      this.loadJobs();
      return;
    }

    this.filteredJobs = this.allJobs.filter(j =>
      String(j.id).includes(q) ||
      (j.title && j.title.toLowerCase().includes(q)) ||
      (j.category && j.category.toLowerCase().includes(q)) ||
      (j.status && j.status.toLowerCase().includes(q))
    );
  }

  filterProposals(query: string) {
    const q = (query || '').toLowerCase();

    // If it looks like an ID, we reload from server for specific search
    // If empty, we reload from server to get the normal paginated list
    if (q.trim() === '' || (!isNaN(Number(q)) && q.trim() !== '')) {
      this.proposalPage = 0;
      this.loadProposals();
      return;
    }

    this.filteredProposals = this.allProposals.filter(p =>
      String(p.id).includes(q) ||
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

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.cdr.detectChanges();
    
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  // =========================
  // REPORTS
  // =========================
  loadReports() {
    this.dataLoading = true;
    this.reportService.getAllReports().subscribe({
      next: (res) => {
        this.reports = res;
        this.dataLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.dataLoading = false;
        this.showToast('Failed to load reports', 'error');
      }
    });
  }

  ignoreReport(reportId: number) {
    this.reportService.ignoreReport(reportId).subscribe({
      next: () => {
        this.reports = this.reports.filter(r => r.id !== reportId);
        this.showToast('Report ignored', 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToast('Failed to ignore report', 'error');
      }
    });
  }

  openReportDeleteModal(report: any) {
    this.reportToDelete = report;
    this.reportAdminMessage = '';
    this.modalError = '';
    this.reportDeleteModalOpen = true;
  }

  confirmReportDelete() {
    if (!this.reportToDelete || !this.reportAdminMessage.trim()) return;
    this.modalLoading = true;
    
    if (this.reportToDelete.target_type === 'job') {
      this.adminService.deleteJob(this.reportToDelete.target_id, this.reportAdminMessage).subscribe({
        next: () => {
          this.handleReportDeleteSuccess();
        },
        error: (err: any) => this.handleReportDeleteError(err)
      });
    } else if (this.reportToDelete.target_type === 'proposal') {
      this.adminService.deleteProposal(this.reportToDelete.target_id, this.reportAdminMessage).subscribe({
        next: () => {
          this.handleReportDeleteSuccess();
        },
        error: (err: any) => this.handleReportDeleteError(err)
      });
    }
  }
  
  handleReportDeleteSuccess() {
    this.modalLoading = false;
    this.reportDeleteModalOpen = false;
    if (this.reportToDelete) {
      this.showToast(`${this.reportToDelete.target_type} deleted successfully`, 'success');
      this.reports = this.reports.filter(r => r.id !== this.reportToDelete.id);
    }
    this.reportToDelete = null;
    this.cdr.detectChanges();
  }
  
  handleReportDeleteError(err: any) {
    this.modalLoading = false;
    this.modalError = err.error?.detail || 'Failed to delete target';
    this.cdr.detectChanges();
  }
}
