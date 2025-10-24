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

  stats = {
    totalVehicules: 15,
    totalDepenses: 12450,
    vehiculeActif: 'Renault Kangoo',
    prochainEntretien: 'Renault Kangoo'
  };

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
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [{
          label: 'Trajets (km)',
          data: [320, 450, 280, 510, 390, 620, 480],
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          borderColor: '#0d6efd',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + ' km';
              }
            }
          }
        }
      }
    });
  }

  // Mettre à jour les données
  updateData(newData: number[]) {
    this.chart.data.datasets[0].data = newData;
    this.chart.update();
  }
}