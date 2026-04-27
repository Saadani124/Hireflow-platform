import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job';
import {ProposalService } from '../../services/proposal';
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
export class Home implements OnInit {
  jobForm!: FormGroup;

  jobs: any[] = [];
  filteredJobs: any[] = [];
  user: any = null;
  menuOpen = false;
  search = '';
  selectedCategory = 'All';
  loading = true;

  skeletons = [1, 2, 3];
  showApplyModal = false;
  selectedJob: any = null;

  proposalData = {
    message: '',
    price: 0
  };
    
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
    private cdr: ChangeDetectorRef,
    private ProposalService: ProposalService,
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

  // 1. Load user FIRST
  this.user = JSON.parse(localStorage.getItem('user') || 'null');

  // 2. Fix profile image URL
  if (this.user?.profile_image) {
  this.user.profile_image = this.normalizeImageUrl(this.user.profile_image);
}

  // 3. Only then load jobs
  this.loadJobs();
}

  loadJobs() {
    this.loading = true;

    this.jobService.getJobs().subscribe({
      next: (res: any[]) => {

        this.jobs = res.filter(job => job.status === 'open').sort((a, b) => {
          if (a.applied === b.applied) return 0;
          return a.applied ? 1 : -1;
        });

        this.applyFilters();

        this.loading = false;

        // 🔴 FORCE UI REFRESH
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.log(err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters() {
    this.filteredJobs = this.jobs.filter(job => {

      const matchesSearch =
        job.title.toLowerCase().includes(this.search.toLowerCase()) ||
        job.description.toLowerCase().includes(this.search.toLowerCase());

      const matchesCategory =
        this.selectedCategory === 'All' ||
        job.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  onSearchChange() {
    this.applyFilters();
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
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
  // =========================
  // POST JOB MODAL
  // =========================

  openPostModal() {
    this.postModalOpen = true;
    document.body.classList.add('no-scroll');
  }

  closePostModal() {
    this.postModalOpen = false;
    document.body.classList.remove('no-scroll');

    this.jobForm.reset({
      title: '',
      description: '',
      budget: 0,
      category: ''
    });
  }

  onModalOverlayClick(event: any) {
    if (event.target.classList.contains('modal-overlay')) {
      this.closePostModal();
    }
  }

  submitJob() {

    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      return;
    }

    this.submittingJob = true;

    this.jobService.createJob(this.jobForm.value).subscribe({
      next: () => {
        this.submittingJob = false;
        this.closePostModal();
        this.loadJobs();

        this.jobForm.reset({
          title: '',
          description: '',
          budget: 0,
          category: ''
        });
      },
      error: (err) => {
        this.submittingJob = false;
        alert(err.error?.detail || 'Error creating job');
      }
    });
  }

  deleteJob(job: any) {
    this.jobToDelete = job;   // store job
    this.deleteModal = true;  // open modal
    this.deleteError = '';    // reset errors
    document.body.classList.add('no-scroll');
  }
  confirmDelete() {

    this.deleteLoading = true;

    this.jobService.deleteJob(this.jobToDelete.id).subscribe({
      next: () => {

        this.deleteLoading = false;
        
        // remove from UI
        this.jobs = this.jobs.filter(j => j.id !== this.jobToDelete.id);
        this.applyFilters();

        this.deleteModal = false; // close modal
        this.cdr.detectChanges();
        document.body.classList.remove('no-scroll');
      },
      error: (err) => {
        this.deleteLoading = false;
        this.deleteError = err.error?.detail || 'Delete failed';
        this.deleteModal = false; // close modal
        this.cdr.detectChanges();
        document.body.classList.remove('no-scroll');
      }
    });
  }
  goHome(){
    this.router.navigate(['/home']);
    return;
  }
  goProfile() {

    const user = this.user;

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    if (user.role === 'client') {
      this.router.navigate(['/ClientDashboard'], {
        queryParams: { section: 'profile' }
      });
    }

    else if (user.role === 'admin') {
      this.router.navigate(['/AdminDashboard'], {
        queryParams: { section: 'profile' }
      });
    }

    else if (user.role === 'freelancer') {
      this.router.navigate(['/FreelancerDashboard'], {
        queryParams: { section: 'profile' }
      });
    }
  }

  goDashboard() {

    const user = this.user;

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    if (user.role === 'client') {
      this.router.navigate(['/ClientDashboard']);
    }

    else if (user.role === 'admin') {
      this.router.navigate(['/AdminDashboard']); // matched with routes
    }

    else if (user.role === 'freelancer') {
      this.router.navigate(['/FreelancerDashboard']); // future
    }
  }
  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  
  submitProposal() {
    this.applySubmitted = true;

    if (!this.proposalData.message || this.proposalData.message.length < 10) {
      return;
    }

    if (!this.proposalData.price || this.proposalData.price <= 0) {
      return;
    }
    this.applyLoading = true;
    this.applyError = '';
    this.applySuccess = '';

    this.ProposalService.apply(
      this.selectedJob.id,
      this.proposalData.message,
      this.proposalData.price
    ).subscribe({
      next: () => {
        this.applyLoading = false;
        this.applySuccess = 'Application sent successfully';
        
        // Update local state immediately
        if (this.selectedJob) {
          this.selectedJob.applied = true;
        }

        this.cdr.detectChanges();
        setTimeout(() => {
          this.closeModal();
          this.applySuccess = '';
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err) => {
        this.applyLoading = false;
        this.applyError = err.error?.detail || 'Failed to apply';
        this.cdr.detectChanges();
      }
    });
    
  }

  closeModal() {
    this.showApplyModal = false;
    document.body.classList.remove('no-scroll');
  }
  
  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;

    setTimeout(() => {
      this.toastVisible = false;
    }, 2500);
    this.cdr.detectChanges();
  }
  
  private normalizeImageUrl(url: string): string {
  if (!url) return '';

  const path = url.replace('http://localhost:8000', '');
  return 'http://localhost:8000' + path;
}
  }