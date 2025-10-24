import { Component, inject, OnInit } from '@angular/core';
import { Trajet, TrajetService } from '../../services/trajet.service';
import { Vehicule, VehiculeService } from '../../services/vehicule.service';
import { Conducteur, ConducteurService } from '../../services/conducteur.service';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-trajets',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './trajets.component.html',
  styleUrl: './trajets.component.css'
})
export class TrajetsComponent implements OnInit {

  private router = inject(Router);

  trajets: Trajet[] = [];
  vehicules: Vehicule[] = [];
  conducteurs: Conducteur[] = [];

  filteredTrajets: Trajet[] = [];

  trajetForm!: FormGroup;
  isEditMode = false;
  selectedId: string | null = null;
  formSubmitted = false;

  // Ajoute ces variables pour les stats
  kmTotalAnnee = 0;
  kmTotalMois = 0;
  nbTrajetsAnnee = 0;
  nbTrajetsMois = 0;

  // === Filtres ===
  searchTerm: string = '';
  dateFilter: string = '';
  dateDebut: string = '';
  dateFin: string = '';
  triActif: string = 'date-desc';

  // === Stats ===
  periode = 'mois';
  kmTotal = 0;
  nbTrajets = 0;
  vehiculeActif: string = '';
  conducteurActif: string = '';

  constructor(
    private trajetService: TrajetService,
    private vehiculeService: VehiculeService,
    private conducteurService: ConducteurService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loadVehicules();
    this.loadConducteurs();
    this.loadTrajets();
    this.initForm();
  }

  initForm(trajet?: Trajet) {
    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    // Extraire les IDs pour le formulaire
    const vehiculeId = trajet ? this.extractId(trajet.vehicule) : '';
    const conducteurId = trajet ? this.extractId(trajet.conducteur) : '';

    this.trajetForm = this.fb.group({
      motif: this.fb.array(
        trajet?.motif?.length ? trajet.motif.map(m => this.fb.control(m, Validators.required)) : [this.fb.control('', Validators.required)]
      ),
      date: [trajet ? trajet.date : currentDate, Validators.required],
      heure: [trajet ? trajet.heure : currentTime, Validators.required],
      kmDepart: [trajet ? trajet.kmDepart : null, [Validators.required, Validators.min(0)]],
      kmArriver: [trajet ? trajet.kmArriver : null],
      vehicule: [vehiculeId, Validators.required],
      conducteur: [conducteurId, Validators.required],
      status: [trajet ? trajet.status : 'en cours', Validators.required]
    });

    this.selectedId = trajet?._id ?? null;
    this.isEditMode = !!trajet;
    this.formSubmitted = false;
  }

  // Méthode utilitaire pour extraire l'ID que ce soit un string ou un objet
  private extractId(item: string | Vehicule | Conducteur): string {
    if (typeof item === 'string') {
      return item;
    } else if (item && typeof item === 'object' && '_id' in item) {
      return item._id || '';
    }
    return '';
  }

  get motifArray(): FormArray { return this.trajetForm.get('motif') as FormArray; }

  addMotif() { this.motifArray.push(this.fb.control('', Validators.required)); }
  removeMotif(i: number) { if (this.motifArray.length > 1) this.motifArray.removeAt(i); }

  loadVehicules() { this.vehiculeService.getVehicules().subscribe(d => this.vehicules = d); }
  loadConducteurs() { this.conducteurService.getConducteurs().subscribe(d => this.conducteurs = d); }

  loadTrajets() {
    this.trajetService.getTrajets().subscribe(d => {
      this.trajets = d;
      this.appliquerFiltresEtTri();
    });
  }

  // === SYSTÈME DE FILTRES ET TRI ===
  appliquerFiltresEtTri() {
    let resultats = [...this.trajets];

    // Filtre par recherche de motif
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      resultats = resultats.filter(t =>
        t.motif.some(m => m.toLowerCase().includes(term))
      );
    }

    // Filtre par date spécifique - CORRIGÉ
    if (this.dateFilter) {
      const filterDate = new Date(this.dateFilter).toISOString().split('T')[0];
      resultats = resultats.filter(t => {
        const trajetDate = new Date(t.date).toISOString().split('T')[0];
        return trajetDate === filterDate;
      });
    }

    // Filtre par période (date début - date fin) - CORRIGÉ
    if (this.dateDebut && this.dateFin) {
      const debut = new Date(this.dateDebut);
      const fin = new Date(this.dateFin);

      // Ajuster la date de fin pour inclure toute la journée
      fin.setHours(23, 59, 59, 999);

      resultats = resultats.filter(t => {
        const dateTrajet = new Date(t.date);
        return dateTrajet >= debut && dateTrajet <= fin;
      });
    }

    // Application du tri
    resultats = this.appliquerTri(resultats);

    this.filteredTrajets = resultats;
    this.calculerStatsFiltrees();
  }

  // Ajoutez cette méthode pour formater les dates de façon cohérente
  private formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // Méthodes pour vider les filtres individuellement
  clearDateFilter() {
    this.dateFilter = '';
    this.onDateFilterChange();
  }

  clearPeriodeFilter() {
    this.dateDebut = '';
    this.dateFin = '';
    this.onPeriodeFilterChange();
  }

  clearSearchFilter() {
    this.searchTerm = '';
    this.onSearchChange();
  }
  // appliquerFiltresEtTri() {
  //   let resultats = [...this.trajets];

  //   // Filtre par recherche de motif
  //   if (this.searchTerm.trim()) {
  //     const term = this.searchTerm.trim().toLowerCase();
  //     resultats = resultats.filter(t =>
  //       t.motif.some(m => m.toLowerCase().includes(term))
  //     );
  //   }

  //   // Filtre par date spécifique
  //   if (this.dateFilter) {
  //     resultats = resultats.filter(t => t.date === this.dateFilter);
  //   }

  //   // Filtre par période (date début - date fin)
  //   if (this.dateDebut && this.dateFin) {
  //     resultats = resultats.filter(t => {
  //       const dateTrajet = new Date(t.date);
  //       const debut = new Date(this.dateDebut);
  //       const fin = new Date(this.dateFin);
  //       return dateTrajet >= debut && dateTrajet <= fin;
  //     });
  //   }

  //   // Application du tri
  //   resultats = this.appliquerTri(resultats);

  //   this.filteredTrajets = resultats;
  //   this.calculerStatsFiltrees();
  // }

  appliquerTri(trajets: Trajet[]): Trajet[] {
    switch (this.triActif) {
      case 'date-asc':
        return trajets.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      case 'date-desc':
        return trajets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      case 'km-asc':
        return trajets.sort((a, b) => {
          const kmA = (a.kmArriver || 0) - (a.kmDepart || 0);
          const kmB = (b.kmArriver || 0) - (b.kmDepart || 0);
          return kmA - kmB;
        });
      
      case 'km-desc':
        return trajets.sort((a, b) => {
          const kmA = (a.kmArriver || 0) - (a.kmDepart || 0);
          const kmB = (b.kmArriver || 0) - (b.kmDepart || 0);
          return kmB - kmA;
        });
      
      default:
        return trajets;
    }
  }

  // Méthodes pour gérer les changements de filtres
  onSearchChange() {
    this.appliquerFiltresEtTri();
  }

  onDateFilterChange() {
    this.appliquerFiltresEtTri();
  }

  onPeriodeFilterChange() {
    this.appliquerFiltresEtTri();
  }

  onTriChange() {
    this.appliquerFiltresEtTri();
  }

  // Réinitialiser tous les filtres
  reinitialiserFiltres() {
    this.searchTerm = '';
    this.dateFilter = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.triActif = 'date-desc';
    this.appliquerFiltresEtTri();
  }

  // Calculer les stats sur les données filtrées
  calculerStatsFiltrees() {
    this.kmTotal = 0;
    this.nbTrajets = this.filteredTrajets.length;

    const vehiculeCount: Record<string, number> = {};
    const conducteurCount: Record<string, number> = {};

    this.filteredTrajets.forEach(t => {
      if (t.kmDepart != null && t.kmArriver != null) {
        this.kmTotal += t.kmArriver - t.kmDepart;
      }

      const vId = this.extractId(t.vehicule);
      const cId = this.extractId(t.conducteur);

      if (vId) vehiculeCount[vId] = (vehiculeCount[vId] || 0) + 1;
      if (cId) conducteurCount[cId] = (conducteurCount[cId] || 0) + 1;
    });

    // Véhicule le plus actif
    const vehiculeMax = Object.entries(vehiculeCount).sort((a, b) => b[1] - a[1])[0];
    this.vehiculeActif = vehiculeMax ? 
      this.getVehiculeLabel(vehiculeMax[0]) : '—';

    // Conducteur le plus actif
    const conducteurMax = Object.entries(conducteurCount).sort((a, b) => b[1] - a[1])[0];
    this.conducteurActif = conducteurMax ? 
      this.getConducteurLabel(conducteurMax[0]) : '—';
  }

  // === MÉTHODES EXISTANTES ===

  getVehiculeLabel(v: string | Vehicule): string {
    const id = this.extractId(v);
    const veh = this.vehicules.find(vehicule => vehicule._id === id);
    return veh ? `${veh.marque} ${veh.modele}` : 'Véhicule inconnu';
  }

  getConducteurLabel(c: string | Conducteur): string {
    const id = this.extractId(c);
    const cond = this.conducteurs.find(conducteur => conducteur._id === id);
    return cond ? `${cond.nomUtilisateur}` : 'Conducteur inconnu';
  }

  setCurrentDate() {
    const now = new Date();
    this.trajetForm.patchValue({ date: now.toISOString().slice(0, 10) });
  }

  setCurrentTime() {
    const now = new Date();
    const t = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    this.trajetForm.patchValue({ heure: t });
  }

  setKmDepartFromVehicule() {
    const vehId = this.trajetForm.get('vehicule')?.value;
    if (!vehId) {
      alert('Sélectionner d\'abord un véhicule');
      return;
    }
    const veh = this.vehicules.find(v => v._id === vehId);
    if (veh) {
      this.trajetForm.patchValue({ kmDepart: veh.kilometreCompteur });
    }
  }

  openModal(trajet?: Trajet) {
    this.initForm(trajet);
    const modal = document.getElementById('trajetModal');
    if (modal) {
      const bsModal = new (window as any).bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  // saveTrajet() {
  //   this.formSubmitted = true;
  //   if (this.trajetForm.invalid) {
  //     alert('⚠️ Veuillez remplir tous les champs obligatoires !');
  //     return;
  //   }

  //   const formValue = this.trajetForm.value;
    
  //   // Préparer les données pour l'envoi - s'assurer que ce sont des strings
  //   const data: any = {
  //     ...formValue,
  //     vehicule: formValue.vehicule, // Déjà un string depuis le formulaire
  //     conducteur: formValue.conducteur // Déjà un string depuis le formulaire
  //   };

  //   // Vérification kmDepart < kmArriver
  //   if (data.kmArriver && data.kmDepart != null && data.kmArriver < data.kmDepart) {
  //     alert('Le km d\'arrivée doit être supérieur ou égal au km de départ !');
  //     return;
  //   }

  //   // Fonction pour mettre à jour le km compteur du véhicule
  //   const updateVehiculeKm = () => {
  //     const vehId = data.vehicule;
  //     if (vehId && data.kmArriver != null) {
  //       const veh = this.vehicules.find(v => v._id === vehId);
  //       if (veh && data.kmArriver > veh.kilometreCompteur) {
  //         const updatedVeh = { ...veh, kilometreCompteur: data.kmArriver };
  //         this.vehiculeService.updateVehicule(vehId, updatedVeh).subscribe();
  //       }
  //     }
  //   };

  //   if (this.isEditMode && this.selectedId) {
  //     this.trajetService.updateTrajet(this.selectedId, data).subscribe(() => {
  //       this.loadTrajets();
  //       updateVehiculeKm();
  //     });
  //   } else {
  //     this.trajetService.addTrajet(data).subscribe(() => this.loadTrajets());
  //   }

  //   const modal = document.getElementById('trajetModal');
  //   if (modal) { 
  //     const bsModal = (window as any).bootstrap.Modal.getInstance(modal); 
  //     if (bsModal) {
  //       bsModal.hide();
  //     }
  //   }
  // }
  saveTrajet() {
    this.formSubmitted = true;
    if (this.trajetForm.invalid) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires !');
      return;
    }

    const formValue = this.trajetForm.value;

    // Calculer la distance parcourue si kmArriver est renseigné
    let distanceParcourue = null;
    if (formValue.kmArriver && formValue.kmDepart) {
      distanceParcourue = formValue.kmArriver - formValue.kmDepart;
    }

    // Préparer les données pour l'envoi
    const data: any = {
      ...formValue,
      vehicule: formValue.vehicule,
      conducteur: formValue.conducteur,
      distanceParcourue: distanceParcourue // AJOUT IMPORTANT
    };

    // Vérification kmDepart < kmArriver
    if (data.kmArriver && data.kmDepart != null && data.kmArriver < data.kmDepart) {
      alert('Le km d\'arrivée doit être supérieur ou égal au km de départ !');
      return;
    }

    // Fonction pour mettre à jour le km compteur du véhicule
    const updateVehiculeKm = () => {
      const vehId = data.vehicule;
      if (vehId && data.kmArriver != null) {
        const veh = this.vehicules.find(v => v._id === vehId);
        if (veh && data.kmArriver > veh.kilometreCompteur) {
          const updatedVeh = { ...veh, kilometreCompteur: data.kmArriver };
          this.vehiculeService.updateVehicule(vehId, updatedVeh).subscribe();
        }
      }
    };

    if (this.isEditMode && this.selectedId) {
      this.trajetService.updateTrajet(this.selectedId, data).subscribe(() => {
        this.loadTrajets();
        updateVehiculeKm();
      });
    } else {
      this.trajetService.addTrajet(data).subscribe(() => this.loadTrajets());
    }

    const modal = document.getElementById('trajetModal');
    if (modal) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bsModal) {
        bsModal.hide();
      }
    }
  }

  deleteTrajet(id: string) {
    if (confirm('Supprimer ce trajet ?')) {
      this.trajetService.deleteTrajet(id).subscribe(() => this.loadTrajets());
    }
  }

  // Nouvelle fonction pour calculer les stats
  calculateStats() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    this.kmTotalAnnee = 0;
    this.kmTotalMois = 0;
    this.nbTrajetsAnnee = 0;
    this.nbTrajetsMois = 0;

    this.trajets.forEach(t => {
      if (t.kmDepart != null && t.kmArriver != null) {
        const diff = t.kmArriver - t.kmDepart;
        const tDate = new Date(t.date);

        if (tDate.getFullYear() === currentYear) {
          this.kmTotalAnnee += diff;
          this.nbTrajetsAnnee++;
        }

        if (tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth) {
          this.kmTotalMois += diff;
          this.nbTrajetsMois++;
        }
      }
    });
  }

  // === Calcul des stats principales ===
  calculateStatsPeriode() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Définir la période selon le filtre
    let startDate: Date, endDate: Date;
    if (this.periode === 'mois') {
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth + 1, 0);
    } else if (this.periode === 'trimestre') {
      const currentQuarter = Math.floor(currentMonth / 3);
      startDate = new Date(currentYear, currentQuarter * 3, 1);
      endDate = new Date(currentYear, currentQuarter * 3 + 3, 0);
    } else { // année
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);
    }

    // Filtrer trajets selon la période
    const trajetsFiltres = this.trajets.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    this.filteredTrajets = trajetsFiltres;

    // Stats globales
    this.kmTotal = 0;
    this.nbTrajets = trajetsFiltres.length;

    const vehiculeCount: Record<string, number> = {};
    const conducteurCount: Record<string, number> = {};

    trajetsFiltres.forEach(t => {
      if (t.kmDepart != null && t.kmArriver != null) {
        this.kmTotal += t.kmArriver - t.kmDepart;
      }

      const vId = this.extractId(t.vehicule);
      const cId = this.extractId(t.conducteur);

      if (vId) vehiculeCount[vId] = (vehiculeCount[vId] || 0) + 1;
      if (cId) conducteurCount[cId] = (conducteurCount[cId] || 0) + 1;
    });

    // Véhicule le plus actif
    const vehiculeMax = Object.entries(vehiculeCount).sort((a, b) => b[1] - a[1])[0];
    if (vehiculeMax) {
      const veh = this.vehicules.find(v => v._id === vehiculeMax[0]);
      this.vehiculeActif = veh ? `${veh.marque} ${veh.modele}` : '—';
    } else {
      this.vehiculeActif = '—';
    }

    // Conducteur le plus actif
    const conducteurMax = Object.entries(conducteurCount).sort((a, b) => b[1] - a[1])[0];
    if (conducteurMax) {
      const cond = this.conducteurs.find(c => c._id === conducteurMax[0]);
      this.conducteurActif = cond ? `${cond.nomUtilisateur}` : '—';
    } else {
      this.conducteurActif = '—';
    }
  }

  onPeriodeChange() {
    this.calculateStatsPeriode();
  }
}