import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreelancerDashboard } from './freelancer-dashboard';

describe('FreelancerDashboard', () => {
  let component: FreelancerDashboard;
  let fixture: ComponentFixture<FreelancerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreelancerDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(FreelancerDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
