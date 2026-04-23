import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { JobService } from '../../services/job';
import { ProposalService } from '../../services/proposal';
import { Auth } from '../../services/auth';
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
export class FreelancerDashboardComponent implements OnInit {

  // ---- Auth ----
  user: any = null;
  normalizeImage = normalizeImage;
  // ---- UI State ----
  menuOpen = false;
  activeSection = 'dashboard';
  proposalsLoading = false;
  jobsLoading = false;
  applyModalOpen = false;
  submittingProposal = false;

  // ---- Data ----
  myProposals: any[] = [];
  openJobs: any[] = [];
  appliedJobIds = new Set<number>();
  applyingJob: any = null;
  proposalForm = { message: '', price: null as number | null };

  // ---- Stats ----
  get acceptedCount() { return this.myProposals.filter(p => p.status === 'accepted').length; }
  get pendingCount() { return this.myProposals.filter(p => p.status === 'pending').length; }

  // ---- Toast ----
  toastMessage = '';
  toastType = '';
  toastVisible = false;
  private toastTimer: any;


  editMode = false;

  profileForm = {
    name: '',
    email: ''
  };
  imageMenu = false;
  editingProposal: any = null;

  viewImageModal = false;
  constructor(
    private jobService: JobService,
    private proposalService: ProposalService,
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}
  

ngOnInit() {
  this.user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!this.user) {
    this.router.navigate(['/login']);
    return;
  }

  if (this.user.profile_image) {
    this.user.profile_image = normalizeImage(this.user.profile_image);
    this.cdr.detectChanges();
  }
  this.route.queryParams.subscribe(params => {
    this.activeSection = params['section'] || 'dashboard';
  });

  this.loadProposals();
  this.loadOpenJobs();
  this.profileForm = {
    name: this.user.name,
    email: this.user.email
  };
}
editProposal(p: any) {

  this.editingProposal = p;

  // 🔴 FIX HERE
  this.applyingJob = {
    id: p.job_id,
    title: p.job?.title || 'Untitled Job'
  };

  this.proposalForm = {
    message: p.message,
    price: p.price
  };

  this.applyModalOpen = true;
}
onAvatarClick(event: MouseEvent) {
  event.stopPropagation();
  console.log("CLICK WORKS");
  this.menuOpen = false;        // close navbar dropdown
  this.imageMenu = !this.imageMenu; // toggle profile menu
  this.cdr.detectChanges();
}

closeImageMenu() {
  this.imageMenu = false;
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
  toggleEdit() {
    this.editMode = !this.editMode;

    if (this.editMode) {
      this.profileForm = {
        name: this.user.name,
        email: this.user.email
      };
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

      // 🔴 update runtime
      this.user = updatedUser;

      // 🔴 normalize image
      this.user.profile_image = normalizeImage(updatedUser.profile_image);

      // 🔴 persist
      localStorage.setItem('user', JSON.stringify(this.user));

      this.editMode = false;
      this.showToast('Profile updated', 'success');
    },
    error: () => {
      this.showToast('Update failed', 'error');
    }
  });
}


  loadProposals() {
  this.proposalsLoading = true;

  this.proposalService.getMine().subscribe({
    next: (proposals: any[]) => {
      this.myProposals = proposals;
      this.appliedJobIds = new Set(proposals.map(p => p.job_id));
      this.proposalsLoading = false;
      this.cdr.detectChanges();
    },
    error: () => {
      this.proposalsLoading = false;
      this.showToast('Failed to load applications', 'error');
    }
  });
}

  loadOpenJobs() {
  this.jobsLoading = true;

  this.jobService.getJobs().subscribe({
    next: (jobs: any[]) => {
      this.openJobs = jobs.filter(j => j.status === 'open');
      this.jobsLoading = false;
      this.cdr.detectChanges();
    },
    error: () => {
      this.jobsLoading = false;
    }
  });
}

  showSection(name: string) {
    this.activeSection = name;
    this.menuOpen = false;
    this.cdr.detectChanges();
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }

  @HostListener('document:click', ['$event'])
onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement;

if (!target.closest('.avatar-wrap') && !target.closest('.profile-avatar-big')) {
  this.menuOpen = false;
  this.imageMenu = false;
}
}

  openApplyModal(job: any) {

  // 🔴 normalize job structure
  this.applyingJob = {
    ...job,
    title: job.title || job.job?.title || 'Untitled Job'
  };

  this.proposalForm = { message: '', price: null };
  this.applyModalOpen = true;
  this.cdr.detectChanges();
}
  closeApplyModal() { this.applyModalOpen = false;
  this.applyingJob = null;
  this.editingProposal = null; }

  submitProposal() {

  const { message, price } = this.proposalForm;

  if (!message || !price) {
    this.showToast('Please fill all fields', 'error');
    return;
  }

  this.submittingProposal = true;

  let request;

  if (this.editingProposal) {
    // 🔴 UPDATE
    request = this.proposalService.update(this.editingProposal.id, {
      job_id: this.editingProposal.job_id,
      message,
      price
    });
  } else {
    // 🔴 CREATE
    request = this.proposalService.apply(
      this.applyingJob.id,
      message,
      price
    );
  }

  request.subscribe({
    next: () => {

      this.showToast(
        this.editingProposal ? 'Proposal updated!' : 'Application submitted!',
        'success'
      );

      this.submittingProposal = false;
      this.closeApplyModal();

      this.editingProposal = null;

      this.loadProposals();
      this.loadOpenJobs();
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
      this.loadOpenJobs();
    },
    error: () => {
      this.showToast('Could not withdraw', 'error');
    }
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
  });
},
    error: () => {
      this.showToast('Upload failed', 'error');
    }
  });
}

  logout() { localStorage.clear(); this.router.navigate(['/login']); }

  showToast(message: string, type = '') {
    clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 3000);
    this.cdr.detectChanges();
  }
  
}
