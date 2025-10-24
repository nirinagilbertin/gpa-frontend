import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, ViewChild, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-statistique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistique.component.html',
  styleUrl: './statistique.component.css'
})
export class StatistiqueComponent implements OnInit {

  // Données fictives
  vehicleTypes = ['Voiture', 'Moto', 'Camion', 'Utilitaire'];
  vehicleDistributionData = [65, 20, 10, 5];
  vehicleDistributionColors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'];

  months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  fuelConsumptionData = {
    voiture: [45, 52, 48, 55, 60, 65, 70, 68, 62, 58, 50, 47],
    moto: [15, 18, 16, 20, 22, 25, 28, 26, 23, 20, 17, 15],
    camion: [120, 125, 118, 130, 135, 140, 145, 142, 138, 132, 125, 120],
    utilitaire: [80, 85, 82, 88, 92, 95, 98, 96, 93, 90, 85, 82]
  };

  maintenanceCosts = [
    { vehicle: 'Toyota Corolla', cost: 1200 },
    { vehicle: 'Honda Civic', cost: 950 },
    { vehicle: 'Ford F-150', cost: 1800 },
    { vehicle: 'BMW Série 3', cost: 2200 },
    { vehicle: 'Harley Davidson', cost: 800 },
    { vehicle: 'Yamaha MT-07', cost: 650 }
  ];

  activityRates = [
    { vehicle: 'Toyota Corolla', trips: 45 },
    { vehicle: 'Honda Civic', trips: 38 },
    { vehicle: 'Ford F-150', trips: 28 },
    { vehicle: 'BMW Série 3', trips: 32 },
    { vehicle: 'Harley Davidson', trips: 22 },
    { vehicle: 'Yamaha MT-07', trips: 18 }
  ];

  totalCostData = {
    labels: ['Toyota Corolla', 'Honda Civic', 'Ford F-150', 'BMW Série 3', 'Harley Davidson', 'Yamaha MT-07'],
    fuel: [3200, 2800, 4500, 3800, 1200, 1000],
    maintenance: [1200, 950, 1800, 2200, 800, 650],
    other: [600, 500, 800, 1000, 300, 250]
  };

  ngOnInit(): void {
    this.createVehicleDistributionChart();
    this.createFuelConsumptionChart();
    this.createMaintenanceCostChart();
    this.createActivityRateChart();
    this.createTotalCostChart();
  }

  // --- KPI Calculations ---
  get totalVehicles(): number {
    return this.vehicleDistributionData.reduce((a,b)=>a+b,0);
  }

  get mostUsedVehicle(): string {
    return this.activityRates.sort((a,b)=>b.trips - a.trips)[0].vehicle;
  }

  get highestMaintenance(): string {
    return this.maintenanceCosts.sort((a,b)=>b.cost - a.cost)[0].vehicle;
  }

  get totalAnnualCost(): number {
    const fuel = this.totalCostData.fuel.reduce((a,b)=>a+b,0);
    const maintenance = this.totalCostData.maintenance.reduce((a,b)=>a+b,0);
    const other = this.totalCostData.other.reduce((a,b)=>a+b,0);
    return fuel + maintenance + other;
  }

  // --- Chart methods ---
  createVehicleDistributionChart(): void {
    const ctx = document.getElementById('vehicleDistributionChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'pie',
      data: { labels: this.vehicleTypes, datasets: [{ data: this.vehicleDistributionData, backgroundColor: this.vehicleDistributionColors }] },
      options: { responsive:true, plugins:{ title:{ display:true, text:'Répartition du parc' }, legend:{ position:'bottom' } } }
    });
  }

  createFuelConsumptionChart(): void {
    const ctx = document.getElementById('fuelConsumptionChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type:'bar',
      data:{
        labels:this.months,
        datasets:[
          {label:'Voiture', data:this.fuelConsumptionData.voiture, backgroundColor:'rgba(52, 152, 219,0.7)', borderColor:'rgba(52,152,219,1)', borderWidth:1},
          {label:'Moto', data:this.fuelConsumptionData.moto, backgroundColor:'rgba(46,204,113,0.7)', borderColor:'rgba(46,204,113,1)', borderWidth:1},
          {label:'Camion', data:this.fuelConsumptionData.camion, backgroundColor:'rgba(231,76,60,0.7)', borderColor:'rgba(231,76,60,1)', borderWidth:1},
          {label:'Utilitaire', data:this.fuelConsumptionData.utilitaire, backgroundColor:'rgba(243,156,18,0.7)', borderColor:'rgba(243,156,18,1)', borderWidth:1}
        ]
      },
      options:{
        responsive:true,
        plugins:{ title:{ display:true, text:'Consommation de carburant (L/mois)' } },
        scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } }
      }
    });
  }

  createMaintenanceCostChart(): void {
    const ctx = document.getElementById('maintenanceCostChart') as HTMLCanvasElement;
    const sorted = [...this.maintenanceCosts].sort((a,b)=>b.cost-a.cost);
    new Chart(ctx,{ type:'bar', data:{ labels:sorted.map(d=>d.vehicle), datasets:[{ label:"Coût d'entretien (€)", data:sorted.map(d=>d.cost), backgroundColor:'rgba(155,89,182,0.7)', borderColor:'rgba(155,89,182,1)', borderWidth:1 }] },
      options:{ indexAxis:'y', responsive:true, plugins:{ title:{ display:true, text:'Coûts de maintenance' } }, scales:{ x:{ beginAtZero:true } } }
    });
  }

  createActivityRateChart(): void {
    const ctx = document.getElementById('activityRateChart') as HTMLCanvasElement;
    const sorted = [...this.activityRates].sort((a,b)=>b.trips-a.trips);
    new Chart(ctx,{ type:'bar', data:{ labels:sorted.map(d=>d.vehicle), datasets:[{ label:'Nombre de trajets / mois', data:sorted.map(d=>d.trips), backgroundColor:'rgba(52,73,94,0.7)', borderColor:'rgba(52,73,94,1)', borderWidth:1 }] },
      options:{ responsive:true, plugins:{ title:{ display:true, text:'Taux d\'activité' } }, scales:{ y:{ beginAtZero:true } } }
    });
  }

  createTotalCostChart(): void {
    const ctx = document.getElementById('totalCostChart') as HTMLCanvasElement;
    new Chart(ctx,{ type:'bar', data:{ labels:this.totalCostData.labels, datasets:[
      { label:'Carburant', data:this.totalCostData.fuel, backgroundColor:'rgba(52,152,219,0.7)', borderColor:'rgba(52,152,219,1)', borderWidth:1 },
      { label:'Maintenance', data:this.totalCostData.maintenance, backgroundColor:'rgba(231,76,60,0.7)', borderColor:'rgba(231,76,60,1)', borderWidth:1 },
      { label:'Autres coûts', data:this.totalCostData.other, backgroundColor:'rgba(46,204,113,0.7)', borderColor:'rgba(46,204,113,1)', borderWidth:1 }
    ] }, options:{ responsive:true, plugins:{ title:{ display:true, text:'Coût total de possession (TCO) - €/an' } }, scales:{ x:{ stacked:true }, y:{ stacked:true, beginAtZero:true } } } });
  }
}
