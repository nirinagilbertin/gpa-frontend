import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculeService, Vehicule } from '../../services/vehicule.service';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-vehicules',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vehicules.component.html',
  styleUrl: './vehicules.component.css'
})
export class VehiculesComponent implements OnInit {

  private vehiculeService = inject(VehiculeService);
  private router = inject(Router);

  vehicules: Vehicule[] = [];
  filteredVehicules: Vehicule[] = [];
  // selectedVehicule: Vehicule | null = null;
  selectedVehicule: Vehicule = {
    immatriculation: '',
    type: 'voiture',
    marque: '',
    modele: '',
    typeCarburant: 'essence',
    kilometreCompteur: 0,
  }

  isEditMode = false;

  newVehicule: Vehicule = {
    immatriculation: '',
    type: 'voiture',
    marque: '',
    modele: '',
    typeCarburant: 'essence',
    kilometreCompteur: 0,
  };

  searchTerm: string = '';

  ngOnInit(): void {
    this.loadVehicules();
    // Recharger à chaque navigation vers cette page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadVehicules();
    });
  }

  loadVehicules() {
    this.vehiculeService.getVehicules().subscribe((data) => {
      this.vehicules = data;
      this.applyFilter();
    });
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      // Champ vide : afficher tous les conducteurs
      this.filteredVehicules = [...this.vehicules];
    } else {
      this.filteredVehicules = this.vehicules.filter(v =>
        v.immatriculation.toLowerCase().includes(term) ||
        v.marque.toLowerCase().includes(term) ||
        v.modele.toLowerCase().includes(term) ||
        v.typeCarburant.toLowerCase().includes(term)
      );
    }
  }

  // Filtrer en temps réel à chaque saisie
  onSearchChange() {
    this.applyFilter();
  }

  openModal(vehicule?: Vehicule) {
    if (vehicule) {
      this.selectedVehicule = { ...vehicule };
      this.isEditMode = true;
    } else {
      this.selectedVehicule = { ...this.newVehicule };
      this.isEditMode = false;
    }
    const modal = document.getElementById('vehiculeModal');
    if (modal) {
      new (window as any).bootstrap.Modal(modal).show();
    }
  }

  saveVehicule() {
    if (!this.selectedVehicule) return;

    if (this.isEditMode && this.selectedVehicule._id) {
      this.vehiculeService.updateVehicule(this.selectedVehicule._id, this.selectedVehicule)
        .subscribe(() => this.loadVehicules());
    } else {
      this.vehiculeService.createVehicule(this.selectedVehicule)
        .subscribe(() => this.loadVehicules());
    }
    this.closeModal();
  }

  deleteVehicule(id: string | undefined) {
    if (!id) return;
    if (confirm('Supprimer ce véhicule ?')) {
      this.vehiculeService.deleteVehicule(id).subscribe(() => this.loadVehicules());
    }
  }

  closeModal() {
    const modalEl = document.getElementById('vehiculeModal');
    if (modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      modal.hide();
    }
  }
  
}