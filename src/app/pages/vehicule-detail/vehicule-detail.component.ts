import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Vehicule, VehiculeService } from '../../services/vehicule.service';
import { ActivatedRoute } from '@angular/router';
import Chart from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Carburant, CarburantService } from '../../services/carburant.service';
import { Entretien, EntretienService } from '../../services/entretien.service';
import { Trajet, TrajetService } from '../../services/trajet.service';
import { Conducteur, ConducteurService } from '../../services/conducteur.service';

@Component({
  selector: 'app-vehicule-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicule-detail.component.html',
  styleUrl: './vehicule-detail.component.css'
})
export class VehiculeDetailComponent implements OnInit, AfterViewInit {

  id!: string;
  vehicule!: Vehicule;

  carburants: Carburant[] = [];
  entretiens: Entretien[] = [];
  conducteurs: Conducteur[] = [];
  trajets: Trajet[] = [];

  filtre: 'annee' | 'mois' = 'mois';
  chart!: Chart;

  // Statistiques calculées
  coutsTotal = 0;
  repartition = { carburant: 0, entretien: 0 };
  nbPlein = 0;
  nbEntretiens = 0;
  nbTrajets = 0;
  dernierTrajet: Trajet | null = null;

  // Statistiques kilométriques
  kmAujourdhui = 0;
  kmCeMois = 0;
  kmCetteAnnee = 0;
  kmTotal = 0;

  // Évolution des km
  evolutionKm = {
    aujourdhui: 0,
    hier: 0,
    moisPrecedent: 0
  };

  // Données réalistes pour l'analyse
  performanceMensuelle = {
    moyenne: 0,
    ecart: 0,
    pourcentage: 0
  };

  // Pour utiliser Math dans le template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private vehiculeService: VehiculeService,
    private carburantService: CarburantService,
    private entretienService: EntretienService,
    private conducteurService: ConducteurService,
    private trajetService: TrajetService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.chargerVehicule();
    this.chargerConducteur();
    this.chargerDonnees();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initChart(), 1000);
  }

  chargerVehicule() {
    this.vehiculeService.getVehicule(this.id).subscribe({
      next: (v) => {
        this.vehicule = v;
        console.log('Véhicule chargé:', v);
      },
      error: (err) => console.error('Erreur chargement véhicule :', err)
    });
  }

  chargerConducteur() {
    this.conducteurService.getConducteurs().subscribe({
      next: (d) => {
        this.conducteurs = d;
        console.log('Conducteurs chargés:', d.length);
      },
      error: (err) => console.error('Erreur chargement conducteurs:', err)
    });
  }

  chargerDonnees() {
    this.carburantService.getCarburants().subscribe({
      next: (data) => {
        this.carburants = data.filter((c) => this.extractId(c.vehicule) === this.id);
        console.log('Carburants filtrés:', this.carburants.length);
        this.actualiserStats();
      },
      error: (err) => console.error('Erreur chargement carburant :', err)
    });

    this.entretienService.getEntretiens().subscribe({
      next: (data) => {
        this.entretiens = data.filter((e) => this.extractId(e.vehicule) === this.id);
        console.log('Entretiens filtrés:', this.entretiens.length);
        this.actualiserStats();
      },
      error: (err) => console.error('Erreur chargement entretien :', err)
    });

    this.trajetService.getTrajets().subscribe({
      next: (data) => {
        this.trajets = data
          .filter((t) => this.extractId(t.vehicule) === this.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        console.log('Trajets filtrés:', this.trajets.length);
        this.calculerKilometrages();
        this.calculerPerformanceMensuelle();
        this.actualiserStats();
      },
      error: (err) => console.error('Erreur chargement trajet :', err)
    });
  }

  // Méthode utilitaire pour extraire l'ID
  private extractId(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (item._id) return item._id;
    return '';
  }

  /** Calculer tous les kilométrages avec des données réalistes */
  calculerKilometrages() {
    const aujourdhui = new Date();
    const hier = new Date(aujourdhui);
    hier.setDate(hier.getDate() - 1);
    
    const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    const debutAnnee = new Date(aujourdhui.getFullYear(), 0, 1);
    const debutMoisPrecedent = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
    const finMoisPrecedent = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0);

    // Réinitialiser les compteurs
    this.kmAujourdhui = 0;
    this.kmCeMois = 0;
    this.kmCetteAnnee = 0;
    this.kmTotal = 0;

    let kmHier = 0;
    let kmMoisPrecedent = 0;

    this.trajets.forEach(trajet => {
      if (!trajet.date) return;
      
      const dateTrajet = new Date(trajet.date);
      const distance = trajet.distanceParcourue || 0;

      // Total général
      this.kmTotal += distance;

      // Cette année
      if (dateTrajet >= debutAnnee) {
        this.kmCetteAnnee += distance;
      }

      // Ce mois
      if (dateTrajet >= debutMois) {
        this.kmCeMois += distance;
      }

      // Aujourd'hui
      if (this.estMemeJour(dateTrajet, aujourdhui)) {
        this.kmAujourdhui += distance;
      }

      // Hier
      if (this.estMemeJour(dateTrajet, hier)) {
        kmHier += distance;
      }

      // Mois précédent
      if (dateTrajet >= debutMoisPrecedent && dateTrajet <= finMoisPrecedent) {
        kmMoisPrecedent += distance;
      }
    });

    // Calculer les évolutions avec des valeurs réalistes
    this.evolutionKm.aujourdhui = kmHier > 0 ? 
      ((this.kmAujourdhui - kmHier) / kmHier) * 100 : 
      this.kmAujourdhui > 0 ? 100 : 0;

    this.evolutionKm.moisPrecedent = kmMoisPrecedent > 0 ? 
      ((this.kmCeMois - kmMoisPrecedent) / kmMoisPrecedent) * 100 : 
      this.kmCeMois > 0 ? 100 : 0;

    console.log('Kilométrages calculés:', {
      aujourdhui: this.kmAujourdhui,
      ceMois: this.kmCeMois,
      cetteAnnee: this.kmCetteAnnee,
      total: this.kmTotal
    });
  }

  /** Calculer la performance mensuelle */
  calculerPerformanceMensuelle() {
    const moisActuel = new Date().getMonth() + 1; // 1-12
    const moyenneMensuelle = this.kmCetteAnnee / moisActuel;
    const ecart = this.kmCeMois - moyenneMensuelle;
    const pourcentage = moyenneMensuelle > 0 ? (ecart / moyenneMensuelle) * 100 : 0;

    this.performanceMensuelle = {
      moyenne: moyenneMensuelle,
      ecart: ecart,
      pourcentage: pourcentage
    };
  }

  /** Vérifier si deux dates sont le même jour */
  private estMemeJour(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /** Obtenir la classe CSS pour l'évolution */
  getEvolutionClass(valeur: number): string {
    if (valeur > 5) return 'positive';
    if (valeur < -5) return 'negative';
    return 'neutral';
  }

  /** Obtenir l'icône pour l'évolution */
  getEvolutionIcon(valeur: number): string {
    if (valeur > 5) return 'bi-arrow-up-right';
    if (valeur < -5) return 'bi-arrow-down-right';
    return 'bi-dash';
  }

  actualiserStats() {
    if (!this.carburants || !this.entretiens || !this.trajets) return;

    const now = new Date();
    const moisActuel = now.getMonth();
    const anneeActuelle = now.getFullYear();

    const filtrerDate = (date: any) => {
      if (!date) return false;
      const d = new Date(date);
      return this.filtre === 'annee'
        ? d.getFullYear() === anneeActuelle
        : d.getFullYear() === anneeActuelle && d.getMonth() === moisActuel;
    };

    const carburantsFiltres = this.carburants.filter((c) => filtrerDate(c.date));
    const entretiensFiltres = this.entretiens.filter((e) => filtrerDate(e.date));
    const trajetsFiltres = this.trajets.filter((t) => filtrerDate(t.date));

    // Calcul coûts carburant réalistes
    const totalCarburant = carburantsFiltres.reduce((sum, c) => {
      const cout = c.coutTotal || (c.litre || 0) * (c.prixLitre || 0);
      return sum + (cout || 0);
    }, 0);

    const totalEntretien = entretiensFiltres.reduce((sum, e) => sum + (e.cout || 0), 0);

    this.coutsTotal = totalCarburant + totalEntretien;
    this.repartition = {
      carburant: totalCarburant,
      entretien: totalEntretien
    };

    this.nbPlein = carburantsFiltres.length;
    this.nbEntretiens = entretiensFiltres.length;
    this.nbTrajets = trajetsFiltres.length;
    this.dernierTrajet = this.trajets.length > 0 ? this.trajets[0] : null;

    console.log('Stats actualisées:', {
      coutsTotal: this.coutsTotal,
      nbPlein: this.nbPlein,
      nbTrajets: this.nbTrajets
    });

    this.updateChart();
  }

  initChart() {
    const ctx = document.getElementById('repartitionChart') as HTMLCanvasElement;
    if (!ctx) {
      console.warn('Canvas element not found');
      return;
    }

    // Détruire le chart existant
    if (this.chart) {
      this.chart.destroy();
    }

    const data = [this.repartition.carburant, this.repartition.entretien];
    
    // Ne créer le chart que si on a des données
    if (data.some(val => val > 0)) {
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Carburant', 'Entretien'],
          datasets: [
            {
              data: data,
              backgroundColor: ['#0d6efd', '#198754'],
              borderWidth: 2,
              borderColor: '#fff'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { 
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw as number;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                  return `${context.label}: ${value.toLocaleString()} Ar (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  updateChart() {
    if (!this.chart) {
      this.initChart();
      return;
    }

    const newData = [this.repartition.carburant, this.repartition.entretien];
    
    // Mettre à jour seulement si on a des données
    if (newData.some(val => val > 0)) {
      this.chart.data.datasets[0].data = newData;
      this.chart.update();
    }
  }

  changerFiltre(type: 'annee' | 'mois') {
    this.filtre = type;
    this.actualiserStats();
    this.calculerPerformanceMensuelle();
  }

  getConducteurLabel(conducteur: any): string {
    if (!conducteur) return 'Non assigné';
    
    const id = typeof conducteur === 'string' ? conducteur : conducteur._id;
    const cond = this.conducteurs.find(c => c._id === id);
    return cond ? `${cond.nomUtilisateur}` : 'Conducteur inconnu';
  }

  // === MÉTHODES D'ANALYSE AMÉLIORÉES ===

  /** Calculer la moyenne des distances parcourues */
  getMoyenneDistance(): number {
    if (this.trajets.length === 0) return 0;
    const total = this.trajets.reduce((sum, trajet) => sum + (trajet.distanceParcourue || 0), 0);
    return total / this.trajets.length;
  }

  /** Calculer la distance totale des trajets */
  getTotalDistance(): number {
    return this.trajets.reduce((sum, trajet) => sum + (trajet.distanceParcourue || 0), 0);
  }

  /** Évaluer l'efficacité d'un trajet de façon plus réaliste */
  getEfficiencyRating(trajet: Trajet): string {
    const distance = trajet.distanceParcourue || 0;
    const moyenne = this.getMoyenneDistance();
    
    if (moyenne === 0) return 'medium';
    
    // Seuils plus réalistes
    if (distance > moyenne * 1.3) return 'high';    // +30% de la moyenne
    if (distance > moyenne * 0.7) return 'medium';  // -30% à +30%
    return 'low';                                   // -30% de la moyenne
  }

  /** Calculer le coût moyen au kilomètre */
  getCoutAuKm(): number {
    const km = this.filtre === 'mois' ? this.kmCeMois : this.kmCetteAnnee;
    if (km === 0) return 0;
    return this.coutsTotal / km;
  }

  /** Calculer le coût moyen par trajet */
  getCoutParTrajet(): number {
    if (this.nbTrajets === 0) return 0;
    return this.coutsTotal / this.nbTrajets;
  }

  /** Obtenir la performance mensuelle vs moyenne */
  getPerformanceMensuelle(): { moyenne: number, ecart: number, pourcentage: number } {
    return this.performanceMensuelle;
  }

  /** Calculer l'efficacité quotidienne moyenne */
  getEfficaciteQuotidienne(): number {
    const joursEcoules = new Date().getDate();
    return joursEcoules > 0 ? this.kmCeMois / joursEcoules : 0;
  }

  /** Obtenir les statistiques de conducteur */
  getStatsConducteur(): { [key: string]: { trajets: number, distance: number } } {
    const stats: { [key: string]: { trajets: number, distance: number } } = {};
    
    this.trajets.forEach(trajet => {
      const conducteurId = this.extractId(trajet.conducteur);
      const conducteur = this.conducteurs.find(c => c._id === conducteurId);
      const nom = conducteur ? conducteur.nomUtilisateur : 'Non assigné';
      
      if (!stats[nom]) {
        stats[nom] = { trajets: 0, distance: 0 };
      }
      stats[nom].trajets++;
      stats[nom].distance += trajet.distanceParcourue || 0;
    });
    
    return stats;
  }

  /** Calculer la consommation moyenne réaliste */
  getConsommationMoyenne(): number {
    const carburantsFiltres = this.carburants.filter(c => {
      if (!c.date) return false;
      const dateCarburant = new Date(c.date);
      const now = new Date();
      return this.filtre === 'annee'
        ? dateCarburant.getFullYear() === now.getFullYear()
        : dateCarburant.getFullYear() === now.getFullYear() && dateCarburant.getMonth() === now.getMonth();
    });

    const totalLitres = carburantsFiltres.reduce((sum, c) => sum + (c.litre || 0), 0);
    
    if (totalLitres === 0) return 0;
    
    const kmParcourus = this.filtre === 'annee' ? this.kmCetteAnnee : this.kmCeMois;
    return kmParcourus / totalLitres; // km/litre
  }

  /** Obtenir le dernier entretien */
  getDernierEntretien(): Entretien | null {
    if (this.entretiens.length === 0) return null;
    return this.entretiens
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  /** Obtenir la date du dernier plein */
  getDernierPlein(): Carburant | null {
    if (this.carburants.length === 0) return null;
    return this.carburants
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  // Méthode utilitaire pour l'abs dans le template
  abs(value: number): number {
    return Math.abs(value);
  }
}