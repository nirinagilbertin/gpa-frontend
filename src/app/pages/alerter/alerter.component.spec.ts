import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlerterComponent } from './alerter.component';

describe('AlerterComponent', () => {
  let component: AlerterComponent;
  let fixture: ComponentFixture<AlerterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlerterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlerterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
