import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job';
import {ProposalService } from '../../services/proposal';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {

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
  jobData = {
    title: '',
    description: '',
    budget: 0,
    category: 'Development'
  };

  categories = [
    'All',
    'Design',
    'Development',
    'Marketing',
    'Product'
  ];

  applySubmitted = false;
  applyError = '';
  applyLoading = false;
  applySuccess = '';


  deleteModal = false;
  jobToDelete: any = null;
  deleteLoading = false;
  deleteError = '';

  createSubmitted = false;
  createError = '';
  createLoading = false;


  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef,
    private ProposalService: ProposalService,
  ) {}

  ngOnInit() {

  // 1. Load user FIRST
  this.user = JSON.parse(localStorage.getItem('user') || 'null');

  // 2. Fix profile image URL
  if (this.user && this.user.profile_image) {
    this.user.profile_image =
      'http://localhost:8000' + this.user.profile_image;
  }

  // 3. Only then load jobs
  setTimeout(() => {
    this.loadJobs();
  }, 100);
}

  loadJobs() {
    this.loading = true;

    this.jobService.getJobs().subscribe({
      next: (res: any[]) => {

        this.jobs = res.filter(job => job.status === 'open');

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
  }
  postJob() {
    this.showCreateJobModal = true;

    this.jobData = {
      title: '',
      description: '',
      budget: 0,
      category: 'Development'
    };

    this.createSubmitted = false;
    this.createError = '';
  }

  closeCreateJob() {
    this.showCreateJobModal = false;
  }

  deleteJob(job: any) {
    this.jobToDelete = job;   // store job
    this.deleteModal = true;  // open modal
    this.deleteError = '';    // reset errors
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
      },
      error: (err) => {
        this.deleteLoading = false;
        this.deleteError = err.error?.detail || 'Delete failed';
        this.cdr.detectChanges();
      }
    });
  }

  goProfile() {
  console.log('go to profile');
  }

  goDashboard(){
    console.log('go to dashboard');
  }
  logout() {
    localStorage.clear();
    window.location.href = '/login';
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
  }
  showCreateJobModal = false;
  submitJob() {

    this.createSubmitted = true;

    if (!this.jobData.title || this.jobData.title.length < 5) return;
    if (!this.jobData.description || this.jobData.description.length < 10) return;
    if (!this.jobData.budget || this.jobData.budget <= 0) return;
    if (!this.jobData.category) return;

    this.createLoading = true;
    this.createError = '';

    this.jobService.createJob(this.jobData).subscribe({
      next: () => {
        this.createLoading = false;
        this.closeCreateJob();
        this.loadJobs();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.createLoading = false;
        this.createError = err.error?.detail || 'Failed to create job';
        this.cdr.detectChanges();
      }
    });
  }
  
  }