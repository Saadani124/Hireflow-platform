import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job';
import { ProposalService } from '../../services/proposal';
import { NotificationService } from '../../services/notification';
import { ReportService } from '../../services/report';
import { ChangeDetectorRef } from '@angular/core';
import { CATEGORIES } from '../../core/categories';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, OnDestroy {
  jobForm!: FormGroup;

  jobs: any[] = [];
  filteredJobs: any[] = [];
  user: any = null;
  menuOpen = false;
  search = '';
  selectedCategories: string[] = [];

  minPrice: number | null = null;
  maxPrice: number | null = null;
  absoluteMinPrice = 0;
  absoluteMaxPrice = 0;

  // Pagination
  page = 0;
  pageSize = 50;
  totalJobs = 0;

  loading = true;
  skeletons = [1, 2, 3];
  showApplyModal = false;
  selectedJob: any = null;
  proposalData = { message: '', price: 0 };

  categories = ['All', ...CATEGORIES];
  jobCategories = CATEGORIES;

  applySubmitted = false;
  applyError = '';
  applyLoading = false;
  applySuccess = '';

  deleteModal = false;
  jobToDelete: any = null;
  deleteLoading = false;
  deleteError = '';

  postModalOpen = false;
  newJob = { title: '', description: '', budget: 0, category: '' };
  submittingJob = false;

  // ── Job Detail Modal ──────────────────────────────────────────
  jobDetailOpen = false;
  detailJob: any = null;

  // ── Report ────────────────────────────────────────────────────
  reportModalOpen = false;
  reportJobId: number | null = null;
  reportReason = '';
  reportSubmitting = false;
  reportError = '';
  reportSuccess = '';

  // ── Notifications ─────────────────────────────────────────────
  notifOpen = false;
  notifications: any[] = [];
  unreadCount = 0;
  private notifPollInterval: any;

  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef,
    private ProposalService: ProposalService,
    private notificationService: NotificationService,
    private reportService: ReportService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.jobForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      budget: [0, [Validators.required, Validators.min(1)]],
      category: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    if (this.user?.profile_image) {
      this.user.profile_image = this.normalizeImageUrl(this.user.profile_image);
    }
    this.loadJobs();
    if (this.user) {
      this.loadUnreadCount();
      this.notifPollInterval = setInterval(() => this.loadUnreadCount(), 60000);
    }
    document.addEventListener('click', () => {
      if (this.menuOpen || this.notifOpen) {
        this.menuOpen = false;
        this.notifOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    if (this.notifPollInterval) clearInterval(this.notifPollInterval);
  }

  // ── NOTIFICATIONS ────────────────────────────────────────────
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

  // ── JOB DETAIL MODAL ─────────────────────────────────────────
  openJobDetail(job: any, event: MouseEvent) {
    event.stopPropagation();
    this.detailJob = job;
    this.jobDetailOpen = true;
    this.reportError = '';
    this.reportSuccess = '';
    document.body.classList.add('no-scroll');
    this.cdr.detectChanges();
  }

  closeJobDetail() {
    this.jobDetailOpen = false;
    this.detailJob = null;
    document.body.classList.remove('no-scroll');
    this.cdr.detectChanges();
  }

  applyFromDetail() { this.closeJobDetail(); this.apply(this.detailJob); }
  deleteFromDetail() { this.closeJobDetail(); this.deleteJob(this.detailJob); }

  // ── REPORT JOB ───────────────────────────────────────────────
  openReportModal(job: any, event: MouseEvent) {
    event.stopPropagation();
    this.reportJobId = job.id;
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
        this.reportSuccess = 'Report submitted. Thank you.';
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

  // ── JOB LOADING & FILTERING ──────────────────────────────────
  loadJobs() {
    this.loading = true;
    this.jobService.getJobs(this.page * this.pageSize, this.pageSize).subscribe({
      next: (res: any) => {
        // Handle both array and paginated response
        const items = res.items || res;
        this.totalJobs = res.total || items.length;

        this.jobs = items.filter((job: any) => job.status === 'open').sort((a: any, b: any) => {
          if (a.applied === b.applied) return 0;
          return a.applied ? 1 : -1;
        });
        
        if (this.jobs.length > 0) {
          const budgets = this.jobs.map(j => j.budget || 0);
          this.absoluteMinPrice = Math.min(...budgets);
          this.absoluteMaxPrice = Math.max(...budgets);
          
          // Only update min/max if they are not set or outside range
          if (this.minPrice === null) this.minPrice = this.absoluteMinPrice;
          if (this.maxPrice === null) this.maxPrice = this.absoluteMaxPrice;
        }
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { console.log(err); this.loading = false; this.cdr.detectChanges(); }
    });
  }

  nextPage() {
    if ((this.page + 1) * this.pageSize < this.totalJobs) {
      this.page++;
      this.loadJobs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.page > 0) {
      this.page--;
      this.loadJobs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  applyFilters() {
    this.filteredJobs = this.jobs.filter(job => {
      const matchesSearch =
        job.title.toLowerCase().includes(this.search.toLowerCase()) ||
        job.description.toLowerCase().includes(this.search.toLowerCase());
      const matchesCategory = this.selectedCategories.length === 0 || this.selectedCategories.includes(job.category);
      const jobBudget = job.budget || 0;
      const matchesMin = this.minPrice !== null ? jobBudget >= this.minPrice : true;
      const matchesMax = this.maxPrice !== null ? jobBudget <= this.maxPrice : true;
      return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });
  }

  onSearchChange() { this.applyFilters(); }

  onMinPriceChange(event: any) {
    let val = Number(event.target.value);
    if (this.maxPrice !== null && val > this.maxPrice) { val = this.maxPrice; event.target.value = val; }
    this.minPrice = val; this.applyFilters();
  }

  onMaxPriceChange(event: any) {
    let val = Number(event.target.value);
    if (this.minPrice !== null && val < this.minPrice) { val = this.minPrice; event.target.value = val; }
    this.maxPrice = val; this.applyFilters();
  }

  get sliderTrackStyle() {
    const range = this.absoluteMaxPrice - this.absoluteMinPrice;
    if (range === 0) return { left: '0%', width: '100%' };
    const currentMin = this.minPrice ?? this.absoluteMinPrice;
    const currentMax = this.maxPrice ?? this.absoluteMaxPrice;
    const minPercent = ((currentMin - this.absoluteMinPrice) / range) * 100;
    const maxPercent = ((currentMax - this.absoluteMinPrice) / range) * 100;
    return { left: `${minPercent}%`, width: `${maxPercent - minPercent}%` };
  }

  toggleCategory(cat: string) {
    if (cat === 'All') { this.selectedCategories = []; }
    else {
      const idx = this.selectedCategories.indexOf(cat);
      if (idx > -1) this.selectedCategories.splice(idx, 1);
      else this.selectedCategories.push(cat);
    }
    this.applyFilters();
  }

  apply(job: any) {
    this.selectedJob = job;
    this.showApplyModal = true;
    this.proposalData = { message: '', price: 0 };
    this.applySubmitted = false;
    this.applyError = '';
    document.body.classList.add('no-scroll');
  }

  openPostModal() { this.postModalOpen = true; document.body.classList.add('no-scroll'); }
  closePostModal() {
    this.postModalOpen = false;
    document.body.classList.remove('no-scroll');
    this.jobForm.reset({ title: '', description: '', budget: 0, category: '' });
  }
  onModalOverlayClick(event: any) {
    if (event.target.classList.contains('modal-overlay')) this.closePostModal();
  }

  submitJob() {
    if (this.jobForm.invalid) { this.jobForm.markAllAsTouched(); return; }
    this.submittingJob = true;
    this.jobService.createJob(this.jobForm.value).subscribe({
      next: () => {
        this.submittingJob = false; this.closePostModal(); this.loadJobs();
        this.jobForm.reset({ title: '', description: '', budget: 0, category: '' });
      },
      error: (err) => { this.submittingJob = false; alert(err.error?.detail || 'Error creating job'); }
    });
  }

  deleteJob(job: any) {
    this.jobToDelete = job; this.deleteModal = true; this.deleteError = '';
    document.body.classList.add('no-scroll');
  }

  confirmDelete() {
    this.deleteLoading = true;
    this.jobService.deleteJobAsAdmin(this.jobToDelete.id).subscribe({
      next: () => {
        this.deleteLoading = false;
        this.jobs = this.jobs.filter(j => j.id !== this.jobToDelete.id);
        this.applyFilters(); this.deleteModal = false; this.cdr.detectChanges();
        document.body.classList.remove('no-scroll');
      },
      error: (err) => {
        this.deleteLoading = false;
        this.deleteError = err.error?.detail || 'Delete failed';
        this.deleteModal = false; this.cdr.detectChanges();
        document.body.classList.remove('no-scroll');
      }
    });
  }

  goHome() { this.router.navigate(['/home']); }

  goProfile() {
    if (!this.user) { this.router.navigate(['/login']); return; }
    if (this.user.role === 'client') this.router.navigate(['/ClientDashboard'], { queryParams: { section: 'profile' } });
    else if (this.user.role === 'admin') this.router.navigate(['/AdminDashboard'], { queryParams: { section: 'profile' } });
    else if (this.user.role === 'freelancer') this.router.navigate(['/FreelancerDashboard'], { queryParams: { section: 'profile' } });
  }

  goDashboard() {
    if (!this.user) { this.router.navigate(['/login']); return; }
    if (this.user.role === 'client') this.router.navigate(['/ClientDashboard']);
    else if (this.user.role === 'admin') this.router.navigate(['/AdminDashboard']);
    else if (this.user.role === 'freelancer') this.router.navigate(['/FreelancerDashboard']);
  }

  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  submitProposal() {
    this.applySubmitted = true;
    if (!this.proposalData.message || this.proposalData.message.length < 10) return;
    if (!this.proposalData.price || this.proposalData.price <= 0) return;
    this.applyLoading = true;
    this.applyError = '';
    this.applySuccess = '';
    this.ProposalService.apply(this.selectedJob.id, this.proposalData.message, this.proposalData.price).subscribe({
      next: () => {
        this.applyLoading = false;
        this.applySuccess = 'Application sent successfully';
        if (this.selectedJob) this.selectedJob.applied = true;
        this.cdr.detectChanges();
        setTimeout(() => { this.closeModal(); this.applySuccess = ''; this.cdr.detectChanges(); }, 1500);
      },
      error: (err) => {
        this.applyLoading = false;
        this.applyError = err.error?.detail || 'Failed to apply';
        this.cdr.detectChanges();
      }
    });
  }

  closeModal() { this.showApplyModal = false; document.body.classList.remove('no-scroll'); }

  private normalizeImageUrl(url: string): string {
    if (!url) return '';
    const path = url.replace('http://localhost:8000', '');
    return 'http://localhost:8000' + path;
  }
}