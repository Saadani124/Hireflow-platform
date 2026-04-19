import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { JobService } from '../../services/job';
import { ProposalService } from '../../services/proposal';
import { Auth } from '../../services/auth';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-dashboard.html',
  styleUrls: ['./client-dashboard.css']
})
export class ClientDashboard implements OnInit {

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

  constructor(
    private jobService: JobService,
    private proposalService: ProposalService,
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {

    this.user = this.auth.getUser();

    if (this.user && this.user.profile_image) {
      this.user.profile_image =
        'http://localhost:8000' + this.user.profile_image;
    }

    this.route.queryParams.subscribe(params => {
      this.activeSection = params['section'] || 'overview';
    });

    this.loadJobs();
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
      error: (err) => {
        console.log(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // PROPOSALS
  // =========================

  loadProposals() {
    this.proposalsLoading = true;

    const jobs = this.myJobs.filter(j => j.status === 'open' || j.status === 'in_progress');

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

          if (count === jobs.length) {
            this.activeJobsWithProposals = results;
            this.proposalsLoading = false;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          count++;
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

  completeJob(id: number) {
    this.jobService.completeJob(id).subscribe({
      next: () => {
        this.showToast('Job completed', 'success');
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
  // UI
  // =========================

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  showSection(section: string) {
    this.activeSection = section;
    this.menuOpen = false;
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
  goHome(){
    this.router.navigate(['/home']);
    return;
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
      error: (err) => {
        this.submittingJob = false;
        this.showToast(err.error?.detail || 'Error', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // PROFILE
  // =========================

  uploadAvatar(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.auth.uploadProfilePicture(file).subscribe({
      next: (res: any) => {
        this.user.profile_image = 'http://localhost:8000' + res.image_url;
        this.showToast('Profile updated', 'success');
        this.cdr.detectChanges();
      }
    });
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
    }, 2500);
    this.cdr.detectChanges();
  }
}