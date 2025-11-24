import { Component, inject, OnInit } from '@angular/core';
import { Trajet, TrajetService } from '../../services/trajet.service';
import { Vehicule, VehiculeService } from '../../services/vehicule.service';
import { Conducteur, ConducteurService } from '../../services/conducteur.service';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';

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

  selectedTrajet: any = null; // stocke le trajet sélectionné

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

  async genererRapport() {
    try {
      const doc = new jsPDF();

      // === 1. Logo ===
      const logoBase64 = await this.chargerImageBase64('nh-gpa.png');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
      }

      // === 2. En-tête professionnel ===
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('NH GPA', 50, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const maintenant = new Date();
      const moisAnnee = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      doc.text(`Rapport de gestion du parc automobile - ${moisAnnee.charAt(0).toUpperCase() + moisAnnee.slice(1)}`, 50, 30);

      const dateGeneration = maintenant.toLocaleDateString('fr-FR');
      doc.text(`Généré le : ${dateGeneration}`, 50, 38);

      // Ligne séparatrice
      doc.setDrawColor(200, 200, 200);
      doc.line(10, 45, 200, 45);

      // === 3. CALCUL DES STATISTIQUES RÉELLES ===
      const stats = this.calculerStatsMensuelles();
      const statsVehicules = this.calculerStatsParVehicule();
      const statsConducteurs = this.calculerStatsParConducteur();

      let yPosition = 60;

      // === 4. SYNTHÈSE DU MOIS ===
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Synthèse du mois', 10, yPosition);
      yPosition += 10;

      // Tableau des indicateurs
      const indicateurs = [
        { label: 'Nombre total de trajets', valeur: stats.nbTrajets.toString() },
        { label: 'Kilométrage total parcouru', valeur: `${stats.kmTotal.toLocaleString('fr-FR')} km` },
        { label: 'Véhicule le plus utilisé', valeur: stats.vehiculePlusUtilise },
        { label: 'Conducteur le plus actif', valeur: stats.conducteurPlusActif },
        { label: 'Moyenne de trajets par jour', valeur: stats.moyenneTrajetsParJour.toFixed(1) },
        { label: 'Nombre de véhicules utilisés', valeur: stats.nbVehiculesUtilises.toString() }
      ];

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      indicateurs.forEach(indicateur => {
        doc.text(`${indicateur.label} :`, 15, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(indicateur.valeur, 80, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 7;
      });

      yPosition += 5;

      // === 5. RÉPARTITION PAR VÉHICULE ===
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Répartition par véhicule', 10, yPosition);
      yPosition += 10;

      // En-têtes du tableau véhicules
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPosition, 180, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(0);

      let x = 10;
      const entetesVehicules = ['Véhicule', 'Nb trajets', 'Km parcourus', '% total'];
      const largeursVehicules = [60, 30, 40, 30];

      entetesVehicules.forEach((entete, index) => {
        doc.text(entete, x + 2, yPosition + 6);
        x += largeursVehicules[index];
      });

      yPosition += 8;

      // Données véhicules
      doc.setFontSize(8);
      statsVehicules.forEach((veh, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
        } else {
          doc.setFillColor(255, 255, 255);
        }

        doc.rect(10, yPosition, 180, 8, 'F');

        x = 10;
        const ligne = [
          veh.vehicule,
          veh.nbTrajets.toString(),
          `${veh.kmParcourus.toLocaleString('fr-FR')} km`,
          `${veh.percentage}%`
        ];

        ligne.forEach((cellule, cellIndex) => {
          doc.text(cellule, x + 2, yPosition + 6);
          x += largeursVehicules[cellIndex];
        });

        yPosition += 8;

        // Gestion pagination
        if (yPosition > 250 && index < statsVehicules.length - 1) {
          doc.addPage();
          yPosition = 20;
        }
      });

      yPosition += 10;

      // === 6. RÉPARTITION PAR CONDUCTEUR ===
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Répartition par conducteur', 10, yPosition);
      yPosition += 10;

      // En-têtes du tableau conducteurs
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPosition, 180, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(0);

      x = 10;
      const entetesConducteurs = ['Conducteur', 'Nb trajets', 'Km parcourus'];
      const largeursConducteurs = [80, 40, 60];

      entetesConducteurs.forEach((entete, index) => {
        doc.text(entete, x + 2, yPosition + 6);
        x += largeursConducteurs[index];
      });

      yPosition += 8;

      // Données conducteurs
      doc.setFontSize(8);
      statsConducteurs.forEach((cond, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
        } else {
          doc.setFillColor(255, 255, 255);
        }

        doc.rect(10, yPosition, 180, 8, 'F');

        x = 10;
        const ligne = [
          cond.conducteur,
          cond.nbTrajets.toString(),
          `${cond.kmParcourus.toLocaleString('fr-FR')} km`
        ];

        ligne.forEach((cellule, cellIndex) => {
          doc.text(cellule, x + 2, yPosition + 6);
          x += largeursConducteurs[cellIndex];
        });

        yPosition += 8;

        // Gestion pagination
        if (yPosition > 250 && index < statsConducteurs.length - 1) {
          doc.addPage();
          yPosition = 20;
        }
      });

      yPosition += 15;

      // === 7. CONCLUSION ET SIGNATURE ===
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Synthèse', 10, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const conclusion = this.genererConclusion(stats, statsVehicules);
      const lignesConclusion = doc.splitTextToSize(conclusion, 180);
      doc.text(lignesConclusion, 10, yPosition);
      yPosition += lignesConclusion.length * 5 + 15;

      // Signature
      doc.text('Validé par : _______________________', 10, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Responsable du parc automobile', 10, yPosition);

      // === 8. PIED DE PAGE SUR CHAQUE PAGE ===
      this.ajouterPiedDePage(doc);

      // === 9. SAUVEGARDE ===
      const nomFichier = `rapport-parc-auto-${maintenant.toISOString().split('T')[0]}.pdf`;
      doc.save(nomFichier);

    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      alert('Erreur lors de la génération du rapport PDF');
    }
  }

  // === MÉTHODES DE CALCUL DES STATISTIQUES RÉELLES ===

  private calculerStatsMensuelles(): any {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    // Filtrer les trajets du mois en cours
    const trajetsMois = this.trajets.filter(t => {
      const dateTrajet = new Date(t.date);
      return dateTrajet >= debutMois && dateTrajet <= finMois;
    });

    // Calcul des statistiques de base
    let kmTotal = 0;
    const vehiculeCount: Record<string, number> = {};
    const conducteurCount: Record<string, number> = {};
    const vehiculeKm: Record<string, number> = {};
    const conducteurKm: Record<string, number> = {};

    trajetsMois.forEach(t => {
      if (t.kmDepart != null && t.kmArriver != null) {
        const distance = t.kmArriver - t.kmDepart;
        kmTotal += distance;

        const vId = this.extractId(t.vehicule);
        const cId = this.extractId(t.conducteur);

        if (vId) {
          vehiculeCount[vId] = (vehiculeCount[vId] || 0) + 1;
          vehiculeKm[vId] = (vehiculeKm[vId] || 0) + distance;
        }
        if (cId) {
          conducteurCount[cId] = (conducteurCount[cId] || 0) + 1;
          conducteurKm[cId] = (conducteurKm[cId] || 0) + distance;
        }
      }
    });

    // Véhicule le plus utilisé
    const vehiculeMax = Object.entries(vehiculeCount).sort((a, b) => b[1] - a[1])[0];
    const vehiculePlusUtilise = vehiculeMax ?
      this.getVehiculeLabel(vehiculeMax[0]) : 'Aucun';

    // Conducteur le plus actif
    const conducteurMax = Object.entries(conducteurCount).sort((a, b) => b[1] - a[1])[0];
    const conducteurPlusActif = conducteurMax ?
      this.getConducteurLabel(conducteurMax[0]) : 'Aucun';

    // Calcul moyenne trajets par jour
    const joursOuvres = this.calculerJoursOuvres(debutMois, finMois);
    const moyenneTrajetsParJour = trajetsMois.length / joursOuvres;

    return {
      nbTrajets: trajetsMois.length,
      kmTotal: kmTotal,
      vehiculePlusUtilise: vehiculePlusUtilise,
      conducteurPlusActif: conducteurPlusActif,
      nbVehiculesUtilises: Object.keys(vehiculeCount).length,
      moyenneTrajetsParJour: moyenneTrajetsParJour
    };
  }

  private calculerStatsParVehicule(): any[] {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    const trajetsMois = this.trajets.filter(t => {
      const dateTrajet = new Date(t.date);
      return dateTrajet >= debutMois && dateTrajet <= finMois;
    });

    const stats: Record<string, { nbTrajets: number, kmParcourus: number }> = {};

    trajetsMois.forEach(t => {
      if (t.kmDepart != null && t.kmArriver != null) {
        const vId = this.extractId(t.vehicule);
        if (vId) {
          const distance = t.kmArriver - t.kmDepart;
          if (!stats[vId]) {
            stats[vId] = { nbTrajets: 0, kmParcourus: 0 };
          }
          stats[vId].nbTrajets++;
          stats[vId].kmParcourus += distance;
        }
      }
    });

    // Calcul du total pour les pourcentages
    const totalKm = Object.values(stats).reduce((sum, stat) => sum + stat.kmParcourus, 0);

    // Conversion en tableau et tri par km parcourus
    return Object.entries(stats)
      .map(([vehiculeId, data]) => ({
        vehicule: this.getVehiculeLabel(vehiculeId),
        nbTrajets: data.nbTrajets,
        kmParcourus: data.kmParcourus,
        percentage: totalKm > 0 ? Math.round((data.kmParcourus / totalKm) * 100) : 0
      }))
      .sort((a, b) => b.kmParcourus - a.kmParcourus);
  }

  private calculerStatsParConducteur(): any[] {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    const trajetsMois = this.trajets.filter(t => {
      const dateTrajet = new Date(t.date);
      return dateTrajet >= debutMois && dateTrajet <= finMois;
    });

    const stats: Record<string, { nbTrajets: number, kmParcourus: number }> = {};

    trajetsMois.forEach(t => {
      if (t.kmDepart != null && t.kmArriver != null) {
        const cId = this.extractId(t.conducteur);
        if (cId) {
          const distance = t.kmArriver - t.kmDepart;
          if (!stats[cId]) {
            stats[cId] = { nbTrajets: 0, kmParcourus: 0 };
          }
          stats[cId].nbTrajets++;
          stats[cId].kmParcourus += distance;
        }
      }
    });

    // Conversion en tableau et tri par km parcourus
    return Object.entries(stats)
      .map(([conducteurId, data]) => ({
        conducteur: this.getConducteurLabel(conducteurId),
        nbTrajets: data.nbTrajets,
        kmParcourus: data.kmParcourus
      }))
      .sort((a, b) => b.kmParcourus - a.kmParcourus);
  }

  private calculerJoursOuvres(debut: Date, fin: Date): number {
    let jours = 0;
    const current = new Date(debut);

    while (current <= fin) {
      // Lundi à Vendredi = jours 1 à 5
      if (current.getDay() >= 1 && current.getDay() <= 5) {
        jours++;
      }
      current.setDate(current.getDate() + 1);
    }

    return jours;
  }

  private genererConclusion(stats: any, statsVehicules: any[]): string {
    const vehiculePrincipal = statsVehicules[0];
    const pourcentagePrincipal = vehiculePrincipal ? vehiculePrincipal.percentage : 0;

    let conclusion = `Le mois a été marqué par ${stats.nbTrajets} trajets pour une distance totale de ${stats.kmTotal.toLocaleString('fr-FR')} km. `;

    if (pourcentagePrincipal > 30) {
      conclusion += `Le véhicule ${vehiculePrincipal.vehicule} a été particulièrement sollicité, représentant ${pourcentagePrincipal}% du kilométrage total. `;
    }

    conclusion += `L'activité moyenne s'élève à ${stats.moyenneTrajetsParJour.toFixed(1)} trajets par jour ouvré. `;
    conclusion += `Ces données témoignent d'une utilisation optimale du parc automobile.`;

    return conclusion;
  }

  private ajouterPiedDePage(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Confidentiel – Usage interne uniquement', 10, 285);
      doc.text(`Page ${i} / ${pageCount}`, 100, 285);
      doc.text(`© ${new Date().getFullYear()} NH GPA - Généré le ${new Date().toLocaleDateString('fr-FR')}`, 150, 285);
    }
  }
  // Fonction pour charger l’image du logo en base64
  private async chargerImageBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await this.convertirBlobBase64(blob);
    } catch (error) {
      console.error('Erreur de chargement du logo :', error);
      return null;
    }
  }

  private convertirBlobBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Ouvre le modal détails du trajet
  openTrajetDetails(trajet: any) {
    this.selectedTrajet = trajet;
    const modal = new (window as any).bootstrap.Modal(document.getElementById('trajetDetailsModal'));
    modal.show();
  }

  // Optionnel : fermer le modal via TS
  closeTrajetDetails() {
    const modalEl = document.getElementById('trajetDetailsModal');
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  }
}