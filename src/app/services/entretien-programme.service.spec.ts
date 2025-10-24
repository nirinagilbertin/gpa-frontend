import { TestBed } from '@angular/core/testing';

import { EntretienProgrammeService } from './entretien-programme.service';

describe('EntretienProgrammeService', () => {
  let service: EntretienProgrammeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntretienProgrammeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
