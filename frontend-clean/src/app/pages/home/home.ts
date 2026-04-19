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

    // reset form
    this.proposalData = {
      message: '',
      price: 0
    };
  }
  postJob() {
    this.showCreateJobModal = true;
    this.jobData = { title: '', description: '', budget: 0, category: 'Development' };
  }

  closeCreateJob() {
    this.showCreateJobModal = false;
  }

  deleteJob(job: any) {
    console.log('Delete clicked:', job);
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

    if (!this.proposalData.message || !this.proposalData.price) {
      alert('Fill all fields');
      return;
    }

    this.ProposalService.apply(
      this.selectedJob.id,
      this.proposalData.message,
      this.proposalData.price
    ).subscribe({
      next: () => {
        alert('Applied successfully');
        this.closeModal();
      },
      error: (err) => {
        console.log(err);
        alert(err.error?.detail || 'Error');
      }
    });
  }

  closeModal() {
    this.showApplyModal = false;
  }
  showCreateJobModal = false;
  submitJob() {

  if (!this.jobData.title || !this.jobData.description || !this.jobData.budget) {
    alert('Fill all fields');
    return;
  }

  this.jobService.createJob(this.jobData).subscribe({
      next: () => {
        alert('Job created');
        this.closeCreateJob();
        this.loadJobs(); // refresh list
      },
      error: (err) => {
        console.log(err);
        alert(err.error?.detail || 'Error creating job');
      }
    });
  }
  
  }