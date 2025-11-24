import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CategoryScale, Chart, Filler, LinearScale, LineController, LineElement, PointElement, Title } from 'chart.js';
import { Vehicule, VehiculeService } from '../../services/vehicule.service';
import { Carburant, CarburantService } from '../../services/carburant.service';
import { Entretien, EntretienService } from '../../services/entretien.service';
import { CommonModule } from '@angular/common';
import { Conducteur, ConducteurService } from '../../services/conducteur.service';
import { Trajet, TrajetService } from '../../services/trajet.service';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css'
})
export class AccueilComponent implements OnInit {

  @ViewChild('trajetChart') chartRef!: ElementRef;
  private chart: any;

  // total
  totalVehicules: number = 0;
  totalConducteur: number = 0;
  totalTrajet: number = 0;
  totalDepensesMois: number = 0;
  // dernier
  dernierTrajet: Trajet | null = null;
  dernierPlein: Carburant | null = null;
  dernierEntretien: Entretien | null = null;
  // Données
  vehicules: Vehicule[] = [];
  conducteurs: Conducteur[] = [];
  trajets: Trajet[] = [];
  carburants: Carburant[] = [];
  entretiens: Entretien[] = [];

  constructor(
    private vehiculeService: VehiculeService,
    private conducteurService: ConducteurService,
    private trajetService: TrajetService,
    private carburantService: CarburantService,
    private entretienService: EntretienService
  ) {}
  
  ngOnInit() {
    // Statistique
    this.loadStatistique();
    // Enregistrer les composants nécessaires
    Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler);
    // Attendre que le template soit complètement chargé
    setTimeout(() => {
      this.createChart();
    }, 100);
  }

  loadStatistique() {
    // Total véhicules
    this.vehiculeService.getVehicules().subscribe({
      next: (data) => {
        this.vehicules = data;
        this.totalVehicules = data.length;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des véhicules :', err);
      }
    });
    // Total conducteurs
    this.conducteurService.getConducteurs().subscribe({
      next: (data) => {
        this.conducteurs = data;
        this.totalConducteur = data.length;
      }
    })
    // Total trajets
    this.trajetService.getTrajets().subscribe({
      next: (data) => {
        this.trajets = data;
        this.totalTrajet = data.length;
        this.dernierTrajet = data[0];
        // Mettre à jour le graphique après chargement des trajets
        setTimeout(() => this.createChart(), 200);
      }
    })
    // Carburant
    this.carburantService.getCarburants().subscribe({
      next: (data) => {
        this.carburants = data;
        this.dernierPlein = data[0];
      }
    })
    // Entretien
    this.entretienService.getEntretiens().subscribe({
      next: (data) => {
        this.entretiens = data;
        this.dernierEntretien = data[0];
      }
    })
    // Total dépense du mois
    this.loadDepensesMois();
  }

  getVehiculeLabel(v: any) {
    return v ? `${v.marque} ${v.immatriculation}` : '';
  }

  getConducteurLabel(c: any) {
    return c ? `${c.nom} ${c.prenom}` : '';
  }

  loadDepensesMois(): void {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let totalCarburant = 0;
    let totalEntretien = 0;

    // --- Carburant ---
    this.carburantService.getCarburants().subscribe({
      next: (carburants: Carburant[]) => {
        carburants.forEach((c) => {
          const date = new Date(c.date);
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            totalCarburant += c.coutTotal || 0;
          }
        });

        // --- Entretien ---
        this.entretienService.getEntretiens().subscribe({
          next: (entretiens: Entretien[]) => {
            entretiens.forEach((e) => {
              const date = new Date(e.date);
              if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                totalEntretien += e.cout || 0;
              }
            });

            this.totalDepensesMois = totalCarburant + totalEntretien;
          },
          error: (err) => console.error('Erreur chargement entretiens :', err)
        });
      },
      error: (err) => console.error('Erreur chargement carburants :', err)
    });
  }

  createChart() {
    const ctx = this.chartRef.nativeElement.getContext('2d');

    // --- Préparer les 7 derniers jours ---
    const daysLabels: string[] = [];
    const daysData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      daysLabels.push(label);
      daysData.push(0);
    }

    // --- Agréger les distances depuis tes trajets ---
    this.trajets.forEach((t) => {
      if (!t.date || !t.distanceParcourue) return;
      const trajetDate = new Date(t.date);
      const diffDays = Math.floor((new Date().getTime() - trajetDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        const dayIndex = 6 - diffDays;
        daysData[dayIndex] += t.distanceParcourue;
      }
    });

    // Détruire l'ancien graphique s'il existe
    if (this.chart) {
      this.chart.destroy();
    }

    // --- Créer le graphique ---
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: daysLabels,
        datasets: [
          {
            label: 'Distance parcourue (km)',
            data: daysData,
            backgroundColor: 'rgba(220, 53, 69, 0.1)', // Rouge doux semi-transparent
            borderColor: '#dc3545',                     // Rouge Bootstrap
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#dc3545',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#dc3545',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#444', // Texte gris foncé pour lisibilité
              font: {
                size: 13,
                family: 'Poppins, sans-serif',
              },
            },
          },
          title: {
            display: true,
            text: 'Évolution du kilométrage total (7 derniers jours)',
            color: '#222',
            font: {
              size: 16,
              weight: 'bold',
              family: 'Poppins, sans-serif',
            },
          },
          tooltip: {
            backgroundColor: '#fff',
            titleColor: '#dc3545',
            bodyColor: '#333',
            borderColor: '#dc3545',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#555',
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(220, 53, 69, 0.1)', // Lignes rouges très claires
            },
            ticks: {
              color: '#555',
              callback: (value) => value + ' km',
            },
          },
        },
      },
    });

  }

  // Mettre à jour les données
  updateData(newData: number[]) {
    this.chart.data.datasets[0].data = newData;
    this.chart.update();
  }
}