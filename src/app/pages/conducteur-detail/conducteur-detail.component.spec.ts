import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConducteurDetailComponent } from './conducteur-detail.component';

describe('ConducteurDetailComponent', () => {
  let component: ConducteurDetailComponent;
  let fixture: ComponentFixture<ConducteurDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConducteurDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConducteurDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
