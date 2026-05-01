import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { JobService } from '../../services/job';
import { ProposalService } from '../../services/proposal';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification';
import { ReportService } from '../../services/report';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { normalizeImage } from '../../core/utils/image';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './client-dashboard.html',
  styleUrls: ['./client-dashboard.css']
})
export class ClientDashboard implements OnInit, OnDestroy {

  user: any = null;

  menuOpen = false;
  activeSection = 'overview';

  myJobs: any[] = [];
  loading = true;

  openCount = 0;
  inProgressCount = 0;
  completedCount = 0;

  proposalsLoading = false;
  activeJobsWithProposals: any[] = [];

  postModalOpen = false;

  newJob = {
    title: '',
    description: '',
    budget: 0,
    category: ''
  };

  submittingJob = false;

  toastVisible = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  profileForm!: FormGroup;

  editMode = false;

  imageMenu = false;
  menuX = 0;
  menuY = 0;

  viewModal = false;
  normalizeImage = normalizeImage;

  // ── Delete Job Modal ──────────────────────────────────────
  showDeleteModal = false;
  jobIdToDelete: number | null = null;
  deleteJobLoading = false;

  // ── Notifications ──────────────────────────────────────────
  notifOpen = false;
  notifications: any[] = [];
  unreadCount = 0;
  notifPage = 0;
  notifPageSize = 10;
  hasMoreNotifs = true;
  private wsSubscription: any;

  // ── Report Proposal ──────────────────────────────────────
  reportModalOpen = false;
  reportProposalId: number | null = null;
  reportReason = '';
  reportSubmitting = false;
  reportError = '';
  reportSuccess = '';
  // =========================
  // CONSTRUCTOR
  // =========================

  constructor(
    private jobService: JobService,
    private proposalService: ProposalService,
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private reportService: ReportService
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // =========================
  // INIT
  // =========================

  ngOnInit() {
    this.user = this.auth.getUser();

    // Normalize image URL once on load — handles both raw relative paths and
    // already-prefixed URLs stored in localStorage
    if (this.user?.profile_image) {
      this.user.profile_image = this.normalizeImageUrl(this.user.profile_image);
    }

    this.route.queryParams.subscribe(params => {
      this.activeSection = params['section'] || 'overview';
    });

    this.loadJobs();

    this.loadUnreadCount();
    const token = localStorage.getItem('token');
    if (token) {
      this.notificationService.connectWebSocket(token);
      this.wsSubscription = this.notificationService.getRealtimeStream().subscribe(notif => {
        this.notifications.unshift(notif);
        this.unreadCount++;
        this.cdr.detectChanges();
      });
    }

    this.profileForm.patchValue({
      name: this.user.name,
      email: this.user.email
    });
    // Close menus when clicking anywhere on the page
    document.addEventListener('click', () => {
      this.imageMenu = false;
      this.menuOpen = false;
      this.notifOpen = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    this.notificationService.disconnectWebSocket();
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
    if (this.notifOpen && this.notifications.length === 0) {
      this.notifPage = 0;
      this.loadNotifications();
    }
    this.cdr.detectChanges();
  }

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
    this.notifOpen = false;
    this.cdr.detectChanges();
  }

  loadNotifications(append = false) {
    this.notificationService.getAll(this.notifPage * this.notifPageSize, this.notifPageSize).subscribe({
      next: (res) => {
        if (append) {
          this.notifications = [...this.notifications, ...res];
        } else {
          this.notifications = res;
        }
        this.hasMoreNotifs = res.length === this.notifPageSize;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  loadMoreNotifs(event: MouseEvent) {
    event.stopPropagation();
    this.notifPage++;
    this.loadNotifications(true);
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

  // ── REPORT PROPOSAL ──────────────────────────────────────
  openReportModal(proposalId: number, event: MouseEvent) {
    event.stopPropagation();
    this.reportProposalId = proposalId;
    this.reportReason = '';
    this.reportError = '';
    this.reportSuccess = '';
    this.reportModalOpen = true;
    this.cdr.detectChanges();
  }

  closeReportModal() {
    this.reportModalOpen = false;
    this.reportProposalId = null;
    this.cdr.detectChanges();
  }

  submitReport() {
    if (!this.reportReason.trim()) { this.reportError = 'Please provide a reason.'; return; }
    if (!this.reportProposalId) return;
    this.reportSubmitting = true;
    this.reportError = '';
    this.reportService.reportProposal(this.reportProposalId, this.reportReason).subscribe({
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
  // HELPERS
  // =========================

  private normalizeImageUrl(url: string): string {
    if (!url) return '';
    // Strip any existing prefix first, then re-apply — idempotent no matter how many times called
    const path = url.replace('http://localhost:8000', '');
    return 'http://localhost:8000' + path;
  }

  // =========================
  // JOBS
  // =========================

  loadJobs() {
    this.loading = true;

    this.jobService.getMyJobs().subscribe({
      next: (res: any[]) => {
        this.myJobs = res;

        this.openCount = res.filter(j => j.status === 'open').length;
        this.inProgressCount = res.filter(j => j.status === 'in_progress').length;
        this.completedCount = res.filter(j => j.status === 'completed').length;

        this.loadProposals();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.log(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  completeJob(id: number) {
    this.jobService.completeJob(id).subscribe({
      next: () => {
        this.showToast('Job completed', 'success');
        this.loadJobs();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.showToast(err.error?.detail || 'Error', 'error');
        this.cdr.detectChanges();
      }
    });
  }
  deleteJobC(id: number) {
    this.jobIdToDelete = id;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  confirmDeleteJob() {
    if (!this.jobIdToDelete) return;

    this.deleteJobLoading = true;
    this.jobService.deleteJobAsClient(this.jobIdToDelete).subscribe({
      next: () => {
        this.deleteJobLoading = false;
        this.showDeleteModal = false;
        this.jobIdToDelete = null;
        this.showToast('Job deleted successfully', 'success');
        this.loadJobs();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.deleteJobLoading = false;
        this.showDeleteModal = false;
        this.jobIdToDelete = null;
        this.showToast(err.error?.detail || 'Error deleting job', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // PROPOSALS
  // =========================

  /**
   * Fetches proposals for all jobs and maps them to their respective jobs.
   * After fetching, it sorts the jobs based on a priority system to ensure
   * jobs requiring immediate attention (like pending proposals) appear first.
   */
  loadProposals() {
    this.proposalsLoading = true;

    // Include all jobs to allow sorting as requested
    const jobs = this.myJobs;
    const results: any[] = [];
    let count = 0;

    if (jobs.length === 0) {
      this.activeJobsWithProposals = [];
      this.proposalsLoading = false;
      this.cdr.detectChanges();
      return;
    }

    jobs.forEach(job => {
      this.proposalService.getByJob(job.id).subscribe({
        next: (proposals: any[]) => {
          results.push({ job, proposals });
          count++;

          // Once all proposals for all jobs are fetched, apply sorting
          if (count === jobs.length) {
            
            // SORTING LOGIC: Prioritize jobs needing attention
            this.activeJobsWithProposals = results.sort((a, b) => {
              const getPriority = (item: any) => {
                const jobStatus = item.job.status;
                const proposals = item.proposals || [];

                // Priority 0 (Highest): Jobs with new proposals waiting for review
                if (proposals.some((p: any) => p.status === 'pending')) return 0;
                
                // Priority 1: Open jobs where previous proposals were rejected
                if (proposals.some((p: any) => p.status === 'rejected') && jobStatus === 'open') return 1;

                // Priority 2: Active jobs currently being worked on
                if (jobStatus === 'in_progress') return 2;

                // Priority 3: Open jobs that haven't received any applications yet
                if (proposals.length === 0 && jobStatus === 'open') return 3;

                // Priority 4 (Lowest): Finished jobs
                if (jobStatus === 'completed') return 4;

                return 5; // Fallback default
              };

              return getPriority(a) - getPriority(b);
            });
            
            // Apply the same sorted order to myJobs
            this.myJobs = this.activeJobsWithProposals.map(item => item.job);
            
            this.proposalsLoading = false;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          count++;
          if (count === jobs.length) {
            this.proposalsLoading = false;
          }
          this.cdr.detectChanges();
        }
      });
    });
  }

  acceptProposal(id: number) {
    this.proposalService.accept(id).subscribe({
      next: () => {
        this.showToast('Proposal accepted', 'success');
        this.loadJobs();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Error', 'error');
        this.cdr.detectChanges();
      }
    });
  }
  rejectProposal(id: number) {
  this.proposalService.reject(id).subscribe({
    next: () => {
      this.showToast('Proposal rejected', 'success');
      this.loadJobs();
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.showToast(err.error?.detail || 'Error', 'error');
      this.cdr.detectChanges();
    }
  });
}
  // =========================
  // POST JOB MODAL
  // =========================

  openPostModal() {
    this.postModalOpen = true;
  }

  closePostModal() {
    this.postModalOpen = false;
  }

  onModalOverlayClick(event: any) {
    if (event.target.classList.contains('modal-overlay')) {
      this.closePostModal();
    }
  }

  submitJob() {
    if (!this.newJob.title || !this.newJob.description || !this.newJob.budget || !this.newJob.category) {
      this.showToast('Fill all fields', 'error');
      return;
    }

    this.submittingJob = true;

    this.jobService.createJob(this.newJob).subscribe({
      next: () => {
        this.submittingJob = false;
        this.closePostModal();
        this.loadJobs();
        this.showToast('Job created', 'success');
        this.newJob = { title: '', description: '', budget: 0, category: '' };
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.submittingJob = false;
        this.showToast(err.error?.detail || 'Error', 'error');
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

    const existingImage = this.user.profile_image;

    this.auth.updateProfile(this.profileForm.value).subscribe({
      next: (updatedUser: any) => {
        this.user = updatedUser;

        // API may or may not return profile_image — preserve existing if absent
        this.user.profile_image = updatedUser.profile_image
          ? this.normalizeImageUrl(updatedUser.profile_image)
          : existingImage;

        localStorage.setItem('user', JSON.stringify(this.user));
        this.editMode = false;
        this.showToast('Profile updated', 'success');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  uploadAvatar(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.auth.uploadProfilePicture(file).subscribe({
      next: (res: any) => {
        this.user.profile_image = this.normalizeImageUrl(res.image_url);
        localStorage.setItem('user', JSON.stringify(this.user));
        this.showToast('Profile picture updated', 'success');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // IMAGE MENU
  // =========================

  onImageClick(event: MouseEvent) {
    event.stopPropagation();
    this.imageMenu = true;
    this.menuX = event.clientX + window.scrollX;
    this.menuY = event.clientY + window.scrollY;
  }

  closeImageMenu() {
    this.imageMenu = false;
  }

  triggerUpload() {
    this.imageMenu = false;
    document.getElementById('fileInput')?.click();
  }

  // =========================
  // VIEW PHOTO MODAL
  // =========================

  viewPhoto() {
    this.viewModal = true;
    this.imageMenu = false;
  }

  closeView() {
    this.viewModal = false;
  }

  // =========================
  // UI / NAVIGATION
  // =========================



  showSection(section: string) {
    this.activeSection = section;
    this.menuOpen = false;
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  // =========================
  // TOAST
  // =========================

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;

    setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 2500);

    this.cdr.detectChanges();
  }
}