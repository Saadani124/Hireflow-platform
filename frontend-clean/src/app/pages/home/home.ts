import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job';

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

  categories = [
    'All',
    'Design',
    'Development',
    'Marketing',
    'Product'
  ];

  constructor(private jobService: JobService) {}

  ngOnInit() {

  // 1. Load user FIRST
  this.user = JSON.parse(localStorage.getItem('user') || 'null');

  // 2. Fix profile image URL
  if (this.user && this.user.profile_image) {
    this.user.profile_image =
      'http://localhost:8000' + this.user.profile_image;
  }

  // 3. Only then load jobs
  this.loadJobs();
}

  loadJobs() {
    this.jobService.getJobs().subscribe({
      next: (res: any[]) => {
        // ✅ ONLY OPEN JOBS
        this.jobs = res.filter(job => job.status === 'open');
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.log(err);
        this.loading = false;
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
    console.log('Apply clicked:', job);
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
}