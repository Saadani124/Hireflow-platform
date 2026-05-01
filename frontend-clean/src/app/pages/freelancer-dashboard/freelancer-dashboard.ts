import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { JobService } from '../../services/job';
import { ProposalService } from '../../services/proposal';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification';
import { ReportService } from '../../services/report';
import { normalizeImage } from '../../core/utils/image';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-freelancer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './freelancer-dashboard.html',
  styleUrls: ['./freelancer-dashboard.css']
})
export class FreelancerDashboardComponent implements OnInit, OnDestroy {

  // ---- Auth ----
  user: any = null;
  normalizeImage = normalizeImage;

  // ---- UI State ----
  menuOpen = false;
  activeSection = 'dashboard';
  proposalsLoading = false;
  applyModalOpen = false;
  submittingProposal = false;

  // ---- Data ----
  myProposals: any[] = [];
  applyingJob: any = null;
  proposalForm = { message: '', price: null as number | null };
  editingProposal: any = null;

  // ---- Stats ----
  get acceptedCount() { return this.myProposals.filter(p => p.status === 'accepted').length; }
  get pendingCount()  { return this.myProposals.filter(p => p.status === 'pending').length; }

  // Status priority: pending first, accepted next, completed next, rejected last
  private statusPriority: Record<string, number> = { pending: 0, accepted: 1, completed: 2, rejected: 3 };

  get sortedProposals() {
    return [...this.myProposals].sort((a, b) =>
      (this.statusPriority[a.status] ?? 99) - (this.statusPriority[b.status] ?? 99)
    );
  }

  // ---- Toast ----
  toastMessage = '';
  toastType = '';
  toastVisible = false;
  private toastTimer: any;

  // ---- Profile / Image ----
  editMode = false;
  profileForm = { name: '', email: '' };
  imageMenu = false;
  menuX = 0;
  menuY = 0;
  viewImageModal = false;

  // ── Notifications ──────────────────────────────────────────
  notifOpen = false;
  notifications: any[] = [];
  unreadCount = 0;
  private notifPollInterval: any;

  // ── Report Job ──────────────────────────────────────
  reportModalOpen = false;
  reportJobId: number | null = null;
  reportReason = '';
  reportSubmitting = false;
  reportError = '';
  reportSuccess = '';

  constructor(
    private jobService: JobService,
    private auth: AuthService,
    private router: Router,
    private proposalService: ProposalService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private reportService: ReportService
  ) {}

  // =========================
  // INIT
  // =========================

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.user.profile_image) {
      this.user.profile_image = normalizeImage(this.user.profile_image);
    }

    this.route.queryParams.subscribe(params => {
      this.activeSection = params['section'] || 'dashboard';
    });

    this.loadProposals();

    this.profileForm = { name: this.user.name, email: this.user.email };

    this.loadUnreadCount();
    this.notifPollInterval = setInterval(() => this.loadUnreadCount(), 60000);

    document.addEventListener('click', () => {
      this.imageMenu = false;
      this.menuOpen = false;
      this.notifOpen = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.notifPollInterval) clearInterval(this.notifPollInterval);
  }

  // ── NOTIFICATIONS ──────────────────────────────────────────
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

  // ── REPORT JOB ──────────────────────────────────────
  openReportModal(jobId: number, event: MouseEvent) {
    event.stopPropagation();
    this.reportJobId = jobId;
    this.reportReason = '';
    this.reportError = '';
    this.reportSuccess = '';
    this.reportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeReportModal() {
    this.reportModalOpen = false;
    this.reportJobId = null;
    this.cdr.detectChanges();
  }

  submitReport() {
    if (!this.reportReason.trim()) { this.reportError = 'Please provide a reason.'; return; }
    if (!this.reportJobId) return;
    this.reportSubmitting = true;
    this.reportError = '';
    this.reportService.reportJob(this.reportJobId, this.reportReason).subscribe({
      next: () => {
        this.reportSubmitting = false;
        this.reportSuccess = 'Report submitted.';
        this.cdr.detectChanges();
        setTimeout(() => this.closeReportModal(), 1500);
      },
      error: (err) => {
        this.reportSubmitting = false;
        this.reportError = err.error?.detail || 'Failed to submit report.';
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // PROPOSALS
  // =========================

  /**
   * Fetches all proposals submitted by the current freelancer
   * and updates the local state.
   */
  loadProposals() {
    this.proposalsLoading = true;
    this.proposalService.getMine().subscribe({
      next: (proposals: any[]) => {
        this.myProposals = proposals;
        this.proposalsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.proposalsLoading = false;
        this.showToast('Failed to load applications', 'error');
      }
    });
  }

  editProposal(p: any) {
    this.editingProposal = p;
    this.applyingJob = { id: p.job_id, title: p.job?.title || 'Untitled Job' };
    this.proposalForm = { message: p.message, price: p.price };
    this.applyModalOpen = true;
    this.cdr.detectChanges();
  }

  closeApplyModal() {
    this.applyModalOpen = false;
    this.applyingJob = null;
    this.editingProposal = null;
    this.cdr.detectChanges();
  }

  submitProposal() {
    const { message, price } = this.proposalForm;
    if (!message || !price) { this.showToast('Please fill all fields', 'error'); return; }

    this.submittingProposal = true;

    const request = this.proposalService.update(this.editingProposal.id, {
      job_id: this.editingProposal.job_id,
      message,
      price
    });

    request.subscribe({
      next: () => {
        this.showToast('Proposal updated!', 'success');
        this.submittingProposal = false;
        this.closeApplyModal();
        this.loadProposals();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.showToast(err?.error?.detail || 'Operation failed', 'error');
        this.submittingProposal = false;
      }
    });
  }

  deleteProposal(id: number) {
    this.proposalService.delete(id).subscribe({
      next: () => {
        this.showToast('Application withdrawn.', 'success');
        this.loadProposals();
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Could not withdraw', 'error')
    });
  }

  // =========================
  // PROFILE
  // =========================

  toggleEdit() {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.profileForm = { name: this.user.name, email: this.user.email };
    }
    this.cdr.detectChanges();
  }

  saveProfile() {
    if (!this.profileForm.name || !this.profileForm.email) {
      this.showToast('Fill all fields', 'error');
      return;
    }
    this.auth.updateProfile(this.profileForm).subscribe({
      next: (updatedUser: any) => {
        this.user = updatedUser;
        this.user.profile_image = normalizeImage(updatedUser.profile_image);
        localStorage.setItem('user', JSON.stringify(this.user));
        this.editMode = false;
        this.showToast('Profile updated', 'success');
        this.cdr.detectChanges();
      },
      error: () => this.showToast('Update failed', 'error')
    });
  }

  uploadAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.auth.uploadProfilePicture(file).subscribe({
      next: () => {
        this.auth.getMe().subscribe((freshUser: any) => {
          freshUser.profile_image = normalizeImage(freshUser.profile_image);
          this.user = freshUser;
          localStorage.setItem('user', JSON.stringify(freshUser));
          this.loadProposals();
          this.showToast('Profile picture updated!', 'success');
          this.cdr.detectChanges();
        });
      },
      error: () => this.showToast('Upload failed', 'error')
    });
  }

  // =========================
  // IMAGE MENU
  // =========================

  onAvatarClick(event: MouseEvent) {
    event.stopPropagation();
    this.imageMenu = !this.imageMenu;
    this.menuX = event.clientX + window.scrollX;
    this.menuY = event.clientY + window.scrollY;
    this.cdr.detectChanges();
  }

  viewPhoto() {
    this.viewImageModal = true;
    this.imageMenu = false;
  }

  closeViewPhoto() {
    this.viewImageModal = false;
  }

  triggerUpload() {
    this.imageMenu = false;
    document.getElementById('fileInput')?.click();
    this.cdr.detectChanges();
  }

  // =========================
  // UI / NAVIGATION
  // =========================



  showSection(name: string) {
    this.activeSection = name;
    this.menuOpen = false;
    this.cdr.detectChanges();
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // =========================
  // TOAST
  // =========================

  showToast(message: string, type = '') {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 3000);
    this.cdr.detectChanges();
  }
}