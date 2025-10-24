import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarburantsComponent } from './carburants.component';

describe('CarburantsComponent', () => {
  let component: CarburantsComponent;
  let fixture: ComponentFixture<CarburantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarburantsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CarburantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
