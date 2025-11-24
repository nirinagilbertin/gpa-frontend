import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, BarController, Title, Tooltip, Legend } from 'chart.js';
import { forkJoin } from 'rxjs';
import { Trajet, TrajetService } from '../../services/trajet.service';
import { Carburant, CarburantService } from '../../services/carburant.service';
import { Entretien, EntretienService } from '../../services/entretien.service';
import { Vehicule, VehiculeService } from '../../services/vehicule.service';

// Enregistrer les composants Chart.js une seule fois
Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, BarController, Title, Tooltip, Legend);

interface MonthlyData {
  labels: string[];
  distances: number[];
  coutCarburant: number[];
  coutEntretien: number[];
}

@Component({
  selector: 'app-statistique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistique.component.html',
  styleUrl: './statistique.component.css'
})
export class StatistiqueComponent implements OnInit, OnDestroy {
  @ViewChild('chartKm') chartKmRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCarburant') chartCarburantRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCouts') chartCoutsRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTopVehicules') chartTopVehiculesRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTrajets') chartTrajetsRef!: ElementRef<HTMLCanvasElement>;

  trajets: Trajet[] = [];
  carburants: Carburant[] = [];
  entretiens: Entretien[] = [];
  vehicules: Vehicule[] = [];

  charts: Chart[] = [];

  // Indicateurs
  averageDailyKm: number = 0;
  vehiculePlusUtilise: string = 'Aucun';
  totalKilometres: number = 0;
  totalDepenses: number = 0;

  isLoading: boolean = true;
  hasData: boolean = false;

  // Nouvelle propriété pour les dépenses globales
  repartitionDepenses: { label: string; montant: number; couleur: string }[] = [];

  constructor(
    private trajetService: TrajetService,
    private carburantService: CarburantService,
    private entretienService: EntretienService,
    private vehiculeService: VehiculeService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  loadData() {
    this.isLoading = true;
    
    forkJoin({
      trajets: this.trajetService.getTrajets(),
      carburants: this.carburantService.getCarburants(),
      entretiens: this.entretienService.getEntretiens(),
      vehicules: this.vehiculeService.getVehicules()
    }).subscribe({
      next: (results) => {
        this.trajets = results.trajets;
        this.carburants = results.carburants;
        this.entretiens = results.entretiens;
        this.vehicules = results.vehicules;
        
        this.hasData = this.trajets.length > 0 || this.carburants.length > 0 || this.entretiens.length > 0;
        
        if (this.hasData) {
          this.calculateIndicators();
          setTimeout(() => this.initCharts(), 100);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.isLoading = false;
      }
    });
  }

  calculateRepartitionDepenses() {
    const coutCarburant = this.carburants
      .filter(c => c.coutTotal)
      .reduce((sum, c) => sum + (c.coutTotal || 0), 0);
    
    const coutEntretien = this.entretiens
      .filter(e => e.cout)
      .reduce((sum, e) => sum + (e.cout || 0), 0);

    this.repartitionDepenses = [
      { 
        label: 'Carburant', 
        montant: coutCarburant, 
        // couleur: '#0d6efd'
        couleur: '#f9414499'
      },
      { 
        label: 'Entretien', 
        montant: coutEntretien, 
        // couleur: '#198754'
        couleur: '#f3722c99'
      }
    ].filter(item => item.montant > 0);
  }

  calculateIndicators() {
    this.calculateUsageIndicators();
    this.calculateTotalDepenses();
    this.calculateRepartitionDepenses();
  }

  calculateUsageIndicators() {
    if (this.trajets.length === 0) return;

    // Calcul du total de kilomètres (inchangé)
    this.totalKilometres = this.trajets
      .filter(t => t.distanceParcourue)
      .reduce((sum, t) => sum + (t.distanceParcourue || 0), 0);

    // Moyenne journalière (inchangé)
    const kmParJour: { [date: string]: number } = {};
    this.trajets.forEach(t => {
      if (t.date && t.distanceParcourue) {
        const dateStr = new Date(t.date).toDateString();
        kmParJour[dateStr] = (kmParJour[dateStr] || 0) + (t.distanceParcourue || 0);
      }
    });

    const nbJours = Object.keys(kmParJour).length;
    this.averageDailyKm = nbJours > 0 ? +(this.totalKilometres / nbJours).toFixed(1) : 0;

    // MODIFICATION ICI : Véhicule le plus utilisé par NOMBRE DE TRAJETS
    const trajetsParVehicule: { [id: string]: number } = {};
    this.trajets.forEach(t => {
      if (t.vehicule?._id) {
        const id = t.vehicule._id;
        trajetsParVehicule[id] = (trajetsParVehicule[id] || 0) + 1; // Compter le nombre de trajets
      }
    });

    const topVeh = Object.entries(trajetsParVehicule).sort((a, b) => b[1] - a[1])[0];
    if (topVeh) {
      const vehicule = this.vehicules.find(v => v._id === topVeh[0]);
      this.vehiculePlusUtilise = vehicule ?
        `${vehicule.marque} ${vehicule.modele || ''}` : `Aucune`
        // `${vehicule.marque} ${vehicule.modele || ''} (${vehicule.immatriculation}) - ${topVeh[1]} trajets`.trim() :
        // `Véhicule ${topVeh[0]} - ${topVeh[1]} trajets`;
    }
  }

  calculateTotalDepenses() {
    const coutCarburant = this.carburants
      .filter(c => c.coutTotal)
      .reduce((sum, c) => sum + (c.coutTotal || 0), 0);
    
    const coutEntretien = this.entretiens
      .filter(e => e.cout)
      .reduce((sum, e) => sum + (e.cout || 0), 0);
    
    this.totalDepenses = coutCarburant + coutEntretien;
  }

  initCharts() {
    this.destroyCharts();
    
    if (this.trajets.length > 0) {
      this.createTrajetsChart();
      this.createKmChart();
      this.createTopVehiculesChart();
    }
    
    if (this.carburants.length > 0) {
      this.createRepartitionDepensesChart();
    }
    
    if (this.carburants.length > 0 || this.entretiens.length > 0) {
      this.createCoutsChart();
    }
  }

  destroyCharts() {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  }

  getMonthlyData(): MonthlyData {
    const monthlyData: { [key: string]: { distance: number; carburant: number; entretien: number } } = {};

    // Initialiser les 6 derniers mois
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
      months.push(key);
      monthlyData[key] = { distance: 0, carburant: 0, entretien: 0 };
    }

    // Trajets
    this.trajets.forEach(t => {
      if (t.date && t.distanceParcourue) {
        const date = new Date(t.date);
        const key = date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].distance += t.distanceParcourue || 0;
        }
      }
    });

    // Carburants
    this.carburants.forEach(c => {
      if (c.date && c.coutTotal) {
        const date = new Date(c.date);
        const key = date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].carburant += c.coutTotal || 0;
        }
      }
    });

    // Entretiens
    this.entretiens.forEach(e => {
      if (e.date && e.cout) {
        const date = new Date(e.date);
        const key = date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
        if (monthlyData[key]) {
          monthlyData[key].entretien += e.cout || 0;
        }
      }
    });

    return {
      labels: months,
      distances: months.map(m => monthlyData[m].distance),
      coutCarburant: months.map(m => monthlyData[m].carburant),
      coutEntretien: months.map(m => monthlyData[m].entretien)
    };
  }

  createKmChart() {
    if (!this.chartKmRef?.nativeElement) return;

    const monthlyData = this.getMonthlyData();
    const ctx = this.chartKmRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: 'Distance parcourue (km)',
          data: monthlyData.distances,
          backgroundColor: '#f9414499', // rouge vif pastel
          borderColor: '#f94144',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Kilométrage mensuel',
            font: { size: 16 }
          },
          legend: { display: false }
        },
        scales: { 
          y: { 
            beginAtZero: true,
            title: { display: true, text: 'Kilomètres' }
          } 
        }
      }
    });

    this.charts.push(chart);
  }

  // Remplacer createCarburantChart par createRepartitionDepensesChart
  createRepartitionDepensesChart() {
    if (!this.chartCarburantRef?.nativeElement) return;

    const ctx = this.chartCarburantRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.repartitionDepenses.map(item => item.label);
    const data = this.repartitionDepenses.map(item => item.montant);
    // const backgroundColors = this.repartitionDepenses.map(item => item.couleur);
    const backgroundColors = this.repartitionDepenses.map((_, i) => {
      const palette = ['#f94144', '#f3722c', '#f5c6cb', '#842029'];
      return palette[i % palette.length];
    });

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Répartition globale des dépenses',
            font: { size: 16, weight: 'bold' }
          },
          legend: { 
            position: 'bottom',
            labels: { padding: 20 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed;
                const total = data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value.toFixed(2)} € (${percentage}%)`;
              }
            }
          }
        },
        cutout: '50%'
      }
    });

    this.charts.push(chart);
  }

  createCoutsChart() {
    if (!this.chartCoutsRef?.nativeElement) return;

    const monthlyData = this.getMonthlyData();
    const ctx = this.chartCoutsRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.labels,
        datasets: [
          {
            label: 'Carburant',
            data: monthlyData.coutCarburant,
            // backgroundColor: '#0d6efd99',
            // borderColor: '#0d6efd',
            backgroundColor: '#f9414499',
            borderColor: '#f94144',
            borderWidth: 1
          },
          {
            label: 'Entretien',
            data: monthlyData.coutEntretien,
            // backgroundColor: '#19875499',
            // borderColor: '#198754',
            backgroundColor: '#f3722c99',
            borderColor: '#f3722c',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Dépenses mensuelles (€)',
            font: { size: 16 }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true,
            title: { display: true, text: 'Euros (€)' }
          } 
        }
      }
    });

    this.charts.push(chart);
  }

  createTopVehiculesChart() {
    if (!this.chartTopVehiculesRef?.nativeElement) return;

    // MODIFICATION ICI : Compter le nombre de trajets par véhicule
    const trajetsParVehicule: { [vehiculeId: string]: number } = {};
    this.trajets.forEach(t => {
      if (t.vehicule?._id) {
        const id = t.vehicule._id;
        trajetsParVehicule[id] = (trajetsParVehicule[id] || 0) + 1; // Compter le nombre de trajets
      }
    });

    const top = Object.entries(trajetsParVehicule)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (top.length === 0) return;

    const labels = top.map(([id]) => {
      const vehicule = this.vehicules.find(v => v._id === id);
      return vehicule ?
        `${vehicule.marque} ${vehicule.immatriculation}`.trim() :
        `Véhicule ${id}`;
    });

    const data = top.map(([_, count]) => count); // Utiliser le nombre de trajets

    const ctx = this.chartTopVehiculesRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Nombre de trajets',
          data,
          backgroundColor: '#f9414499',
          borderColor: '#f94144',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: 'Top véhicules les plus utilisés (par nombre de trajets)', // Modifier le titre
            font: { size: 16 }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Nombre de trajets' } // Modifier l'axe
          }
        }
      }
    });

    this.charts.push(chart);
  }

  createTrajetsChart() {
    if (!this.chartTrajetsRef?.nativeElement) return;

    const trajetsParJour: { [date: string]: number } = {};
    this.trajets.forEach(t => {
      if (t.date) {
        const dateStr = new Date(t.date).toLocaleDateString('fr-FR');
        trajetsParJour[dateStr] = (trajetsParJour[dateStr] || 0) + 1;
      }
    });

    const labels = Object.keys(trajetsParJour)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-15); // Limiter aux 15 derniers jours

    const data = labels.map(date => trajetsParJour[date]);

    const ctx = this.chartTrajetsRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Nombre de trajets',
          data,
          // backgroundColor: '#20c99722',
          // borderColor: '#20c997',
          backgroundColor: '#f5c6cb22',
          borderColor: '#f94144',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Nombre de trajets par jour',
            font: { size: 16 }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true,
            title: { display: true, text: 'Nombre de trajets' }
          } 
        }
      }
    });

    this.charts.push(chart);
  }
}

