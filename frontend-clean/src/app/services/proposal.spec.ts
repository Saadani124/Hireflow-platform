import { TestBed } from '@angular/core/testing';

import { Proposal } from './proposal';

describe('Proposal', () => {
  let service: Proposal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Proposal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
