import { Component, OnInit } from '@angular/core';
import { Carburant, CarburantService } from '../../services/carburant.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehiculeService } from '../../services/vehicule.service';
import { ConducteurService } from '../../services/conducteur.service';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  async genererRapportCarburant() {
    try {
      const doc = new jsPDF();

      // === 1. Logo ===
      let logoBase64: string | null = null;
      try {
        logoBase64 = await this.chargerImageBase64('nh-gpa.png');
        if (!logoBase64) {
          logoBase64 = this.getLogoBase64Fallback();
        }
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
        }
      } catch (logoError) {
        console.warn('Impossible de charger le logo:', logoError);
      }

      // === 2. En-tête spécifique carburant ===
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('NH GPA', 50, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const maintenant = new Date();
      const moisAnnee = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      doc.text(`Rapport Carburant - ${moisAnnee.charAt(0).toUpperCase() + moisAnnee.slice(1)}`, 50, 30);

      const dateGeneration = maintenant.toLocaleDateString('fr-FR');
      doc.text(`Généré le : ${dateGeneration}`, 50, 38);

      // Ligne séparatrice
      doc.setDrawColor(200, 200, 200);
      doc.line(10, 45, 200, 45);

      // === 3. CALCUL DES STATISTIQUES ===
      const stats = this.calculerStatsCarburantMensuelles();
      const statsVehicules = this.calculerStatsCarburantParVehicule();

      let yPosition = 60;

      // === 4. SYNTHÈSE GLOBALE ===
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Synthèse du mois', 10, yPosition);
      yPosition += 10;

      // CORRECTION : Ariary au lieu d'Euros
      const indicateursCarburant = [
        {
          label: 'Coût total carburant',
          valeur: `${this.formatNombre(stats.coutTotal)} Ar`
        },
        {
          label: 'Nombre de pleins',
          valeur: stats.nombrePleins.toString()
        },
        {
          label: 'Volume total',
          valeur: `${this.formatNombre(stats.volumeTotal)} L`
        },
        {
          label: 'Prix moyen au litre',
          valeur: `${stats.prixMoyenLitre.toFixed(0)} Ar/L`  // Pas de décimales pour Ariary
        },
        {
          label: 'Consommation moyenne',
          valeur: `${stats.pleinMoyen.toFixed(1)} L/plein`
        },
        {
          label: 'Périodicité moyenne',
          valeur: `${stats.periodiciteMoyenne.toFixed(1)} jours`
        }
      ];

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      indicateursCarburant.forEach(indicateur => {
        doc.text(`${indicateur.label} :`, 15, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(indicateur.valeur, 70, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 7;
      });

      yPosition += 10;

      // === 5. ANALYSE PAR VÉHICULE ===
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Analyse par véhicule', 10, yPosition);
      yPosition += 10;

      // En-têtes simplifiées - CORRECTION : Ariary
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPosition, 180, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(0);

      let x = 10;
      const entetesVehicules = ['Véhicule', 'Pleins', 'Volume (L)', 'Coût (Ar)', '% budget'];
      const largeursVehicules = [60, 20, 35, 35, 30];

      entetesVehicules.forEach((entete, index) => {
        doc.text(entete, x + 2, yPosition + 6);
        x += largeursVehicules[index];
      });

      yPosition += 8;

      // Données véhicules - CORRECTION : Ariary
      doc.setFontSize(8);
      statsVehicules.forEach((veh, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
        } else {
          doc.setFillColor(255, 255, 255);
        }

        doc.rect(10, yPosition, 180, 8, 'F');

        x = 10;

        // CORRECTION : Formatage avec Ariary
        const ligne = [
          veh.vehicule,
          veh.nbPleins.toString(),
          this.formatNombre(veh.volumeTotal),
          this.formatNombre(veh.coutTotal),
          `${veh.percentageBudget}%`
        ];

        ligne.forEach((cellule, cellIndex) => {
          doc.text(cellule, x + 2, yPosition + 6);
          x += largeursVehicules[cellIndex];
        });

        yPosition += 8;
      });

      yPosition += 10;

      // === 6. VÉHICULE LE PLUS CONSOMMATEUR ===
      if (statsVehicules.length > 0) {
        const plusConsommateur = statsVehicules[0];

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Véhicule le plus consommateur', 10, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // CORRECTION : Ariary
        const texteConsommateur = `${plusConsommateur.vehicule} : ${this.formatNombre(plusConsommateur.coutTotal)} Ar (${plusConsommateur.percentageBudget}% du budget)`;
        doc.text(texteConsommateur, 15, yPosition);
        yPosition += 15;
      }

      // === 7. PIED DE PAGE ===
      this.ajouterPiedDePageCarburant(doc);

      // === 8. SAUVEGARDE ===
      const nomFichier = `rapport-carburant-${maintenant.toISOString().split('T')[0]}.pdf`;
      doc.save(nomFichier);

    } catch (error) {
      console.error('Erreur lors de la génération du rapport carburant :', error);
      alert('Erreur lors de la génération du rapport carburant PDF');
    }
  }

  // === MÉTHODE POUR FORMATER LES NOMBRES EN ARIARY ===
  private formatNombre(nombre: number): string {
    
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(nombre);
  }

  // AJOUTER CETTE MÉTHODE POUR LE FALLBACK LOGO
  private getLogoBase64Fallback(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzhiMyIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tkg8L3RleHQ+Cjwvc3ZnPg==';
  }

  // === MÉTHODES DE CALCUL (AVEC CORRECTION PRIX MOYEN) ===

  private calculerStatsCarburantMensuelles(): any {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    // Filtrer les entrées carburant du mois en cours
    const carburantsMois = this.carburants.filter(c => {
      const dateCarburant = new Date(c.date);
      return dateCarburant >= debutMois && dateCarburant <= finMois;
    });

    if (carburantsMois.length === 0) {
      return {
        volumeTotal: 0,
        coutTotal: 0,
        prixMoyenLitre: 0,
        nombrePleins: 0,
        pleinMoyen: 0,
        periodiciteMoyenne: 0
      };
    }

    // Calculs de base
    const volumeTotal = carburantsMois.reduce((sum, c) => sum + c.litre, 0);
    const coutTotal = carburantsMois.reduce((sum, c) => sum + c.coutTotal, 0);

    // CORRECTION : Calcul du prix moyen au litre sans décimales pour Ariary
    const prixMoyenLitre = volumeTotal > 0 ? Math.round(coutTotal / volumeTotal) : 0;

    const nombrePleins = carburantsMois.length;
    const pleinMoyen = volumeTotal / nombrePleins;

    // Calcul périodicité moyenne
    const dates = carburantsMois.map(c => new Date(c.date)).sort((a, b) => a.getTime() - b.getTime());
    let periodiciteMoyenne = 0;
    if (dates.length > 1) {
      const totalDiff = dates.slice(1).reduce((sum, date, i) => {
        return sum + (date.getTime() - dates[i].getTime());
      }, 0);
      periodiciteMoyenne = totalDiff / ((dates.length - 1) * 1000 * 60 * 60 * 24);
    }

    return {
      volumeTotal,
      coutTotal,
      prixMoyenLitre,
      nombrePleins,
      pleinMoyen,
      periodiciteMoyenne
    };
  }

  private calculerStatsCarburantParVehicule(): any[] {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    const carburantsMois = this.carburants.filter(c => {
      const dateCarburant = new Date(c.date);
      return dateCarburant >= debutMois && dateCarburant <= finMois;
    });

    const stats: Record<string, { nbPleins: number, volumeTotal: number, coutTotal: number }> = {};

    carburantsMois.forEach(c => {
      const vId = this.extractId(c.vehicule);
      if (vId) {
        if (!stats[vId]) {
          stats[vId] = { nbPleins: 0, volumeTotal: 0, coutTotal: 0 };
        }
        stats[vId].nbPleins++;
        stats[vId].volumeTotal += c.litre;
        stats[vId].coutTotal += c.coutTotal;
      }
    });

    // Calcul du total pour les pourcentages
    const totalCout = Object.values(stats).reduce((sum, stat) => sum + stat.coutTotal, 0);

    // Conversion en tableau et tri par coût
    return Object.entries(stats)
      .map(([vehiculeId, data]) => ({
        vehicule: this.getVehiculeLabel(this.vehicules.find(v => v._id === vehiculeId)),
        nbPleins: data.nbPleins,
        volumeTotal: data.volumeTotal,
        coutTotal: data.coutTotal,
        percentageBudget: totalCout > 0 ? Math.round((data.coutTotal / totalCout) * 100) : 0
      }))
      .sort((a, b) => b.coutTotal - a.coutTotal);
  }

  // Méthode utilitaire pour extraire l'ID
  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item._id || '';
  }

  // Méthodes pour le logo
  private async chargerImageBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await this.convertirBlobBase64(blob);
    } catch (error) {
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

  private ajouterPiedDePageCarburant(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Rapport Carburant - Usage interne', 10, 285);
      doc.text(`Page ${i} / ${pageCount}`, 100, 285);
      doc.text(`© ${new Date().getFullYear()} NH GPA`, 150, 285);
    }
  }
}
