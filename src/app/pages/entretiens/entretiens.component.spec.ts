import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntretiensComponent } from './entretiens.component';

describe('EntretiensComponent', () => {
  let component: EntretiensComponent;
  let fixture: ComponentFixture<EntretiensComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntretiensComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntretiensComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
