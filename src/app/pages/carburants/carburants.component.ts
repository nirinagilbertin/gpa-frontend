import { Component, OnInit } from '@angular/core';
import { Carburant, CarburantService } from '../../services/carburant.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehiculeService } from '../../services/vehicule.service';
import { ConducteurService } from '../../services/conducteur.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-carburants',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './carburants.component.html',
  styleUrl: './carburants.component.css'
})
export class CarburantsComponent implements OnInit {
  carburants: Carburant[] = [];
  vehicules: any[] = [];
  conducteurs: any[] = [];

  carburantForm!: FormGroup;
  isEditMode = false;
  selectedId: string | null = null;
  formSubmitted = false;

  filteredCarburants: Carburant[] = [];
  selectedPeriod: string = 'mois'; // mois | trimestre | annee
  // Stats
  consommationMoyenne = 0;
  coutTotal = 0;
  nombrePleins = 0;
  periodiciteMoyenne = 0;

  constructor(
    private fb: FormBuilder,
    private carburantService: CarburantService,
    private vehiculeService: VehiculeService,
    private conducteurService: ConducteurService
  ) {}

  ngOnInit(): void {
    this.loadVehicules();
    this.loadConducteurs();
    this.loadCarburants();
    this.initForm();
  }

  initForm(carburant?: Carburant) {
    const now = new Date();
    const currentDate = now.toISOString().slice(0,10);

    this.carburantForm = this.fb.group({
      date: [carburant ? carburant.date : currentDate, Validators.required],
      litre: [carburant ? carburant.litre : 0, [Validators.required, Validators.min(0.01)]],
      coutTotal: [carburant ? carburant.coutTotal : 0, [Validators.required, Validators.min(0.01)]],
      prixLitre: [{ value: carburant ? carburant.prixLitre : 0, disabled: true }],
      station: [carburant ? carburant.station : '', Validators.required],
      vehicule: [carburant ? carburant.vehicule : '', Validators.required],
      conducteur: [carburant ? carburant.conducteur : '', Validators.required]
    });

    this.selectedId = carburant?._id ?? null;
    this.isEditMode = !!carburant;
    this.formSubmitted = false;

    // recalcul automatique du prix par litre
    this.carburantForm.valueChanges.subscribe(val => {
      const { litre, coutTotal } = val;
      if (litre > 0 && coutTotal > 0) {
        const prix = coutTotal / litre;
        this.carburantForm.patchValue({ prixLitre: prix }, { emitEvent: false });
      }
    });
  }

  loadVehicules() { this.vehiculeService.getVehicules().subscribe(d=>this.vehicules=d); }
  loadConducteurs() { this.conducteurService.getConducteurs().subscribe(d=>this.conducteurs=d); }
  loadCarburants() { 
    this.carburantService.getCarburants().subscribe(d=> {
      this.carburants=d;
      this.filterData();
    }); 
  }

  filterData() {
    const now = new Date();
    let startDate: Date;

    switch (this.selectedPeriod) {
      case 'mois':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'trimestre':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'annee':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    this.filteredCarburants = this.carburants.filter(c => {
      const d = new Date(c.date);
      return d >= startDate && d <= now;
    });

    this.calculateStats();
  }

  calculateStats() {
    if (this.filteredCarburants.length === 0) {
      this.consommationMoyenne = 0;
      this.coutTotal = 0;
      this.nombrePleins = 0;
      this.periodiciteMoyenne = 0;
      return;
    }

    // Coût total
    this.coutTotal = this.filteredCarburants.reduce((sum, c) => sum + c.coutTotal, 0);

    // Consommation moyenne (Litre / plein)
    const totalLitres = this.filteredCarburants.reduce((sum, c) => sum + c.litre, 0);
    this.nombrePleins = this.filteredCarburants.length;
    this.consommationMoyenne = totalLitres / this.nombrePleins;

    // Périodicité moyenne entre pleins (en jours)
    const dates = this.filteredCarburants.map(c => new Date(c.date)).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length > 1) {
      const totalDiff = dates.slice(1).reduce((sum, date, i) => {
        return sum + (date.getTime() - dates[i].getTime());
      }, 0);
      this.periodiciteMoyenne = totalDiff / ((dates.length - 1) * 1000 * 60 * 60 * 24);
    } else {
      this.periodiciteMoyenne = 0;
    }
  }

  getVehiculeLabel(v: any) {
    return v ? `${v.marque} ${v.immatriculation}` : '';
  }

  getConducteurLabel(c: any) {
    return c ? `${c.nom} ${c.prenom}` : '';
  }

  openModal(carburant?: Carburant) {
    this.initForm(carburant);
    const modal = document.getElementById('carburantModal');
    if(modal){
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  saveCarburant() {
    this.formSubmitted = true;
    if(this.carburantForm.invalid){
      alert('⚠️ Veuillez remplir tous les champs obligatoires !');
      return;
    }

    const data = this.carburantForm.getRawValue();

    if(this.isEditMode && this.selectedId){
      this.carburantService.updateCarburant(this.selectedId, data).subscribe(()=>this.loadCarburants());
    } else {
      this.carburantService.addCarburant(data).subscribe(()=>this.loadCarburants());
    }

    const modal = document.getElementById('carburantModal');
    if(modal){ const bsModal = (window as any).bootstrap.Modal.getInstance(modal); bsModal.hide(); }
  }

  deleteCarburant(id: string) {
    if(confirm('Supprimer cette entrée carburant ?')){
      this.carburantService.deleteCarburant(id).subscribe(()=>this.loadCarburants());
    }
  }
}
