import { Component } from '@angular/core';
import { Entretien, EntretienService } from '../../services/entretien.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConducteurService } from '../../services/conducteur.service';
import { VehiculeService } from '../../services/vehicule.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-entretiens',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './entretiens.component.html',
  styleUrl: './entretiens.component.css'
})
export class EntretiensComponent {
  entretiens: Entretien[] = [];
  filteredEntretiens: Entretien[] = [];
  // Pour dropdown
  vehicules: any[] = [];
  conducteurs: any[] = [];
  categories = ['Vidange', 'Révision', 'Freins', 'Pneus', 'Autre'];

  entretienForm!: FormGroup;
  isEditMode = false;
  selectedId: string | null = null;
  formSubmitted = false;

  // === Filtres ===
  searchTerm: string = '';

  // === statistique ===
  totalCoutAnnee: number = 0;
  totalEntretiensAnnee: number = 0;
  prochainEntretien: Entretien | null = null;
  entretiensOverdue: Entretien[] = [];

  constructor(
    private fb: FormBuilder,
    private entretienService: EntretienService,
    private vehiculeService: VehiculeService,
    private conducteurService: ConducteurService
  ) {}

  ngOnInit(): void {
    this.loadVehicules();
    this.loadConducteurs();
    this.loadEntretiens();
    this.initForm();
  }

  initForm(entretien?: Entretien) {
    const now = new Date();
    const currentDate = now.toISOString().slice(0,10);

    this.entretienForm = this.fb.group({
      date: [entretien ? entretien.date : currentDate, Validators.required],
      categorie: [entretien ? entretien.categorie : '', Validators.required],
      raison: [entretien ? entretien.raison : ''],
      garage: [entretien ? entretien.garage : '', Validators.required],
      vehicule: [entretien ? entretien.vehicule : '', Validators.required],
      conducteur: [entretien ? entretien.conducteur : '', Validators.required],
      cout: [entretien ? entretien.cout : 0, [Validators.required, Validators.min(0)]],
      kilometreCompteur: [entretien ? (entretien as any).kilometreCompteur || '' : '', Validators.required] // 🆕 ajouté
    });

    // Auto-remplir le kilométrage en fonction du véhicule choisi
    this.entretienForm.get('vehicule')?.valueChanges.subscribe((vehiculeId: string) => {
      const vehicule = this.vehicules.find(v => v._id === vehiculeId);
      if (vehicule) {
        this.entretienForm.patchValue({
          kilometreCompteur: vehicule.kilometreCompteur
        });
      }
    });

    this.selectedId = entretien?._id ?? null;
    this.isEditMode = !!entretien;
    this.formSubmitted = false;
  }

  loadVehicules() { this.vehiculeService.getVehicules().subscribe(d=>this.vehicules=d); }
  loadConducteurs() { this.conducteurService.getConducteurs().subscribe(d=>this.conducteurs=d); }
  loadEntretiens() { 
    this.entretienService.getEntretiens().subscribe(d=> {
      this.entretiens = d;
      this.applyFilter();
      this.calculerStatistiques();
    });
  }

  getVehiculeLabel(v: any) { return v ? `${v.marque} ${v.immatriculation}` : ''; }
  getConducteurLabel(c: any) { return c ? `${c.nom} ${c.prenom}` : ''; }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    if(!term) {
      // Champ vide : afficher tous les entretiens
      this.filteredEntretiens = [...this.entretiens];
    } else {
      this.filteredEntretiens = this.entretiens.filter(e =>
        e.categorie.toLowerCase().includes(term)
      );
    }
  }

  // Filtrer en temps réel à chaque saisie
  onSearchChange() {
    this.applyFilter();
  }

  openModal(entretien?: Entretien) {
    this.initForm(entretien);
    const modal = document.getElementById('entretienModal');
    if(modal){
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  saveEntretien() {
    this.formSubmitted = true;
    if(this.entretienForm.invalid){
      alert('⚠️ Veuillez remplir tous les champs obligatoires !');
      return;
    }

    const data = this.entretienForm.value;

    if(this.isEditMode && this.selectedId){
      this.entretienService.updateEntretien(this.selectedId, data).subscribe(()=>this.loadEntretiens());
    } else {
      this.entretienService.addEntretien(data).subscribe(()=>this.loadEntretiens());
    }

    const modal = document.getElementById('entretienModal');
    if(modal){ const bsModal = (window as any).bootstrap.Modal.getInstance(modal); bsModal.hide(); }
  }

  deleteEntretien(id: string) {
    if(confirm('Supprimer cet entretien ?')){
      this.entretienService.deleteEntretien(id).subscribe(()=>this.loadEntretiens());
    }
  }

  calculerStatistiques() {
    const anneeCourante = new Date().getFullYear();
    const maintenant = new Date();

    // ✅ 1. Filtrer les entretiens de l’année en cours
    const entretiensAnnee = this.entretiens.filter(
      e => new Date(e.date).getFullYear() === anneeCourante
    );

    // ✅ 2. Coût total cette année
    this.totalCoutAnnee = entretiensAnnee.reduce((somme, e) => somme + (e.cout || 0), 0);

    // ✅ 3. Nombre total d’entretiens cette année
    this.totalEntretiensAnnee = entretiensAnnee.length;

    // ✅ 4. Prochain entretien programmé (fictif : le plus proche dans le futur)
    const futurs = this.entretiens.filter(e => new Date(e.date) > maintenant);
    this.prochainEntretien = futurs.length > 0
      ? futurs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
      : null;

    // ✅ 5. Entretiens overdue (en retard)
    this.entretiensOverdue = this.entretiens.filter(e => new Date(e.date) < maintenant);
  }


}
