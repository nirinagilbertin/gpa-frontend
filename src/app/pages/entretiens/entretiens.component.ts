import { Component } from '@angular/core';
import { Entretien, EntretienService } from '../../services/entretien.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConducteurService } from '../../services/conducteur.service';
import { VehiculeService } from '../../services/vehicule.service';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';

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
  vehiculePlusEntretenu: { vehicule: any, nbEntretiens: number } | null = null;
  vehiculePlusDepensier: { vehicule: any, totalCout: number } | null = null;

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

    // ✅ 4. NOUVEAU : Véhicule le plus entretenu
    this.vehiculePlusEntretenu = this.getVehiculePlusEntretenu();

    // ✅ 5. NOUVEAU : Véhicule le plus dépensier
    this.vehiculePlusDepensier = this.getVehiculePlusDepensier();
  }

  // Fonction pour récupérer le véhicule avec le plus d'entretiens
  getVehiculePlusEntretenu(): { vehicule: any, nbEntretiens: number } | null {
    if (!this.entretiens.length || !this.vehicules.length) return null;

    const entretiensParVehicule: { [key: string]: number } = {};

    // Compter le nombre d'entretiens par véhicule
    this.entretiens.forEach(entretien => {
      const vehiculeId = this.extractId(entretien.vehicule);
      if (vehiculeId) {
        entretiensParVehicule[vehiculeId] = (entretiensParVehicule[vehiculeId] || 0) + 1;
      }
    });

    // Trouver le véhicule avec le plus d'entretiens
    let maxEntretiens = 0;
    let vehiculePlusEntretenuId = '';

    Object.entries(entretiensParVehicule).forEach(([vehiculeId, nbEntretiens]) => {
      if (nbEntretiens > maxEntretiens) {
        maxEntretiens = nbEntretiens;
        vehiculePlusEntretenuId = vehiculeId;
      }
    });

    if (!vehiculePlusEntretenuId) return null;

    const vehicule = this.vehicules.find(v => v._id === vehiculePlusEntretenuId);

    return {
      vehicule: vehicule,
      nbEntretiens: maxEntretiens
    };
  }

  // Fonction pour récupérer le véhicule le plus dépensier en entretien
  getVehiculePlusDepensier(): { vehicule: any, totalCout: number } | null {
    if (!this.entretiens.length || !this.vehicules.length) return null;

    const coutParVehicule: { [key: string]: number } = {};

    // Calculer le coût total des entretiens par véhicule
    this.entretiens.forEach(entretien => {
      const vehiculeId = this.extractId(entretien.vehicule);
      if (vehiculeId) {
        coutParVehicule[vehiculeId] = (coutParVehicule[vehiculeId] || 0) + (entretien.cout || 0);
      }
    });

    // Trouver le véhicule avec le coût total le plus élevé
    let maxCout = 0;
    let vehiculePlusDepensierId = '';

    Object.entries(coutParVehicule).forEach(([vehiculeId, totalCout]) => {
      if (totalCout > maxCout) {
        maxCout = totalCout;
        vehiculePlusDepensierId = vehiculeId;
      }
    });

    if (!vehiculePlusDepensierId) return null;

    const vehicule = this.vehicules.find(v => v._id === vehiculePlusDepensierId);

    return {
      vehicule: vehicule,
      totalCout: maxCout
    };
  }

  // === MÉTHODES POUR LE PDF ===

  async genererRapportEntretien() {
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

      // === 2. En-tête spécifique entretien ===
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('NH GPA', 50, 20);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const maintenant = new Date();
      const moisAnnee = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      doc.text(`Rapport Entretien - ${moisAnnee.charAt(0).toUpperCase() + moisAnnee.slice(1)}`, 50, 30);

      const dateGeneration = maintenant.toLocaleDateString('fr-FR');
      doc.text(`Généré le : ${dateGeneration}`, 50, 38);

      // Ligne séparatrice
      doc.setDrawColor(200, 200, 200);
      doc.line(10, 45, 200, 45);

      // === 3. CALCUL DES STATISTIQUES ===
      const stats = this.calculerStatsEntretienMensuelles();
      const statsVehicules = this.calculerStatsEntretienParVehicule();
      const statsCategories = this.calculerStatsParCategorie();

      let yPosition = 60;

      // === 4. SYNTHÈSE GLOBALE ===
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Synthèse du mois', 10, yPosition);
      yPosition += 10;

      const indicateursEntretien = [
        {
          label: 'Coût total entretien',
          valeur: `${this.formatNombre(stats.coutTotal)} Ar`
        },
        {
          label: "Nombre d'entretiens",
          valeur: stats.nombreEntretiens.toString()
        },
        {
          label: 'Coût moyen par entretien',
          valeur: `${this.formatNombre(stats.coutMoyen)} Ar`
        },
        {
          label: 'Entretiens en retard',
          valeur: stats.entretiensEnRetard.toString()
        },
        {
          label: 'Prochain entretien prévu',
          valeur: stats.prochainEntretien || 'Aucun'
        }
      ];

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      indicateursEntretien.forEach(indicateur => {
        doc.text(`${indicateur.label} :`, 15, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(indicateur.valeur, 70, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 7;
      });

      yPosition += 10;

      // === 5. RÉPARTITION PAR CATÉGORIE ===
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Répartition par catégorie', 10, yPosition);
      yPosition += 10;

      // En-têtes catégories
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPosition, 180, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(0);

      let x = 10;
      const entetesCategories = ['Catégorie', 'Nombre', 'Coût total (Ar)', '% budget'];
      const largeursCategories = [70, 30, 50, 30];

      entetesCategories.forEach((entete, index) => {
        doc.text(entete, x + 2, yPosition + 6);
        x += largeursCategories[index];
      });

      yPosition += 8;

      // Données catégories
      doc.setFontSize(8);
      statsCategories.forEach((cat, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
        } else {
          doc.setFillColor(255, 255, 255);
        }

        doc.rect(10, yPosition, 180, 8, 'F');

        x = 10;

        const ligne = [
          cat.categorie,
          cat.nombre.toString(),
          this.formatNombre(cat.coutTotal),
          `${cat.percentageBudget}%`
        ];

        ligne.forEach((cellule, cellIndex) => {
          doc.text(cellule, x + 2, yPosition + 6);
          x += largeursCategories[cellIndex];
        });

        yPosition += 8;
      });

      yPosition += 10;

      // === 6. ANALYSE PAR VÉHICULE ===
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Analyse par véhicule', 10, yPosition);
      yPosition += 10;

      // En-têtes véhicules
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPosition, 180, 8, 'F');
      doc.setFontSize(9);
      doc.setTextColor(0);

      x = 10;
      const entetesVehicules = ['Véhicule', 'Entretiens', 'Coût total (Ar)', '% budget', 'Coût moyen (Ar)'];
      const largeursVehicules = [60, 25, 35, 25, 35];

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
          veh.nbEntretiens.toString(),
          this.formatNombre(veh.coutTotal),
          `${veh.percentageBudget}%`,
          this.formatNombre(veh.coutMoyen)
        ];

        ligne.forEach((cellule, cellIndex) => {
          doc.text(cellule, x + 2, yPosition + 6);
          x += largeursVehicules[cellIndex];
        });

        yPosition += 8;

        // Gestion de la pagination
        if (yPosition > 250) {
          this.ajouterPiedDePageEntretien(doc);
          doc.addPage();
          yPosition = 20;
          
          // Réafficher les en-têtes sur nouvelle page
          doc.setFillColor(240, 240, 240);
          doc.rect(10, yPosition, 180, 8, 'F');
          doc.setFontSize(9);
          x = 10;
          entetesVehicules.forEach((entete, index) => {
            doc.text(entete, x + 2, yPosition + 6);
            x += largeursVehicules[index];
          });
          yPosition += 8;
        }
      });

      yPosition += 10;

      // === 7. VÉHICULE AVEC PLUS D'ENTRETIENS ===
      if (statsVehicules.length > 0) {
        const plusEntretenu = statsVehicules[0];

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Véhicule avec le plus d\'entretiens', 10, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const textePlusEntretenu = `${plusEntretenu.vehicule} : ${plusEntretenu.nbEntretiens} entretiens (${this.formatNombre(plusEntretenu.coutTotal)} Ar)`;
        doc.text(textePlusEntretenu, 15, yPosition);
        yPosition += 15;
      }

      // === 9. PIED DE PAGE ===
      this.ajouterPiedDePageEntretien(doc);

      // === 10. SAUVEGARDE ===
      const nomFichier = `rapport-entretien-${maintenant.toISOString().split('T')[0]}.pdf`;
      doc.save(nomFichier);

    } catch (error) {
      console.error('Erreur lors de la génération du rapport entretien :', error);
      alert('Erreur lors de la génération du rapport entretien PDF');
    }
  }

  // === MÉTHODES DE CALCUL DES STATISTIQUES ===

  private calculerStatsEntretienMensuelles(): any {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    // Filtrer les entretiens du mois en cours
    const entretiensMois = this.entretiens.filter(e => {
      const dateEntretien = new Date(e.date);
      return dateEntretien >= debutMois && dateEntretien <= finMois;
    });

    if (entretiensMois.length === 0) {
      return {
        coutTotal: 0,
        nombreEntretiens: 0,
        coutMoyen: 0,
        entretiensEnRetard: 0,
        prochainEntretien: null
      };
    }

    // Calculs de base
    const coutTotal = entretiensMois.reduce((sum, e) => sum + e.cout, 0);
    const nombreEntretiens = entretiensMois.length;
    const coutMoyen = coutTotal / nombreEntretiens;

    // Entretiens en retard (date passée)
    const entretiensEnRetard = entretiensMois.filter(e => new Date(e.date) < maintenant).length;

    // Prochain entretien
    const futurs = entretiensMois.filter(e => new Date(e.date) > maintenant);
    const prochainEntretien = futurs.length > 0 
      ? futurs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date
      : null;

    return {
      coutTotal,
      nombreEntretiens,
      coutMoyen,
      entretiensEnRetard,
      prochainEntretien: prochainEntretien ? new Date(prochainEntretien).toLocaleDateString('fr-FR') : 'Aucun'
    };
  }

  private calculerStatsEntretienParVehicule(): any[] {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    const entretiensMois = this.entretiens.filter(e => {
      const dateEntretien = new Date(e.date);
      return dateEntretien >= debutMois && dateEntretien <= finMois;
    });

    const stats: Record<string, { nbEntretiens: number, coutTotal: number }> = {};

    entretiensMois.forEach(e => {
      const vId = this.extractId(e.vehicule);
      if (vId) {
        if (!stats[vId]) {
          stats[vId] = { nbEntretiens: 0, coutTotal: 0 };
        }
        stats[vId].nbEntretiens++;
        stats[vId].coutTotal += e.cout;
      }
    });

    // Calcul du total pour les pourcentages
    const totalCout = Object.values(stats).reduce((sum, stat) => sum + stat.coutTotal, 0);

    // Conversion en tableau et tri par coût
    return Object.entries(stats)
      .map(([vehiculeId, data]) => ({
        vehicule: this.getVehiculeLabel(this.vehicules.find(v => v._id === vehiculeId)),
        nbEntretiens: data.nbEntretiens,
        coutTotal: data.coutTotal,
        coutMoyen: data.nbEntretiens > 0 ? data.coutTotal / data.nbEntretiens : 0,
        percentageBudget: totalCout > 0 ? Math.round((data.coutTotal / totalCout) * 100) : 0
      }))
      .sort((a, b) => b.coutTotal - a.coutTotal);
  }

  private calculerStatsParCategorie(): any[] {
    const maintenant = new Date();
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    const entretiensMois = this.entretiens.filter(e => {
      const dateEntretien = new Date(e.date);
      return dateEntretien >= debutMois && dateEntretien <= finMois;
    });

    const stats: Record<string, { nombre: number, coutTotal: number }> = {};

    entretiensMois.forEach(e => {
      const categorie = e.categorie;
      if (!stats[categorie]) {
        stats[categorie] = { nombre: 0, coutTotal: 0 };
      }
      stats[categorie].nombre++;
      stats[categorie].coutTotal += e.cout;
    });

    // Calcul du total pour les pourcentages
    const totalCout = Object.values(stats).reduce((sum, stat) => sum + stat.coutTotal, 0);

    // Conversion en tableau et tri par coût
    return Object.entries(stats)
      .map(([categorie, data]) => ({
        categorie,
        nombre: data.nombre,
        coutTotal: data.coutTotal,
        percentageBudget: totalCout > 0 ? Math.round((data.coutTotal / totalCout) * 100) : 0
      }))
      .sort((a, b) => b.coutTotal - a.coutTotal);
  }

  // === MÉTHODES UTILITAIRES (identique au composant carburant) ===

  private formatNombre(nombre: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(nombre);
  }

  private getLogoBase64Fallback(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzhiMyIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tkg8L3RleHQ+Cjwvc3ZnPg==';
  }

  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item._id || '';
  }

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

  private ajouterPiedDePageEntretien(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Rapport Entretien - Usage interne', 10, 285);
      doc.text(`Page ${i} / ${pageCount}`, 100, 285);
      doc.text(`© ${new Date().getFullYear()} NH GPA`, 150, 285);
    }
  }

}
