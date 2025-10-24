import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConducteurService, Conducteur } from '../../services/conducteur.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-conducteurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conducteurs.component.html',
  styleUrl: './conducteurs.component.css'
})
export class ConducteursComponent implements OnInit {

  private conducteurService = inject(ConducteurService);
  private router = inject(Router);

  conducteurs: Conducteur[] = [];
  filteredConducteurs: Conducteur[] = [];
  // selectedConducteur: Conducteur | null = null;
  selectedConducteur: Conducteur = {
    matricule: '',
    nom: '',
    prenom: '',
    nomUtilisateur: '',
    motDePasse: '',
    role: 'chauffeur',
    access: 'total'
  };
  isEditMode = false;

  newConducteur: Conducteur = {
    matricule: '',
    nom: '',
    prenom: '',
    nomUtilisateur: '',
    motDePasse: '',
    role: 'chauffeur',
    access: 'total'
  };

  searchTerm: string = '';

  ngOnInit(): void {
    // Charger au premier affichage
    this.loadConducteurs();
    // Recharger à chaque navigation vers cette page
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadConducteurs();
    });
  }

  loadConducteurs() {
    this.conducteurService.getConducteurs().subscribe(data => {
      this.conducteurs = data;
      this.applyFilter();
    });
  }

  applyFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      // Champ vide : afficher tous les conducteurs
      this.filteredConducteurs = [...this.conducteurs];
    } else {
      this.filteredConducteurs = this.conducteurs.filter(c =>
        c.nom.toLowerCase().includes(term) ||
        c.prenom.toLowerCase().includes(term) ||
        c.matricule.toLowerCase().includes(term) ||
        c.nomUtilisateur.toLowerCase().includes(term)
      );
    }
  }

  // Filtrer en temps réel à chaque saisie
  onSearchChange() {
    this.applyFilter();
  }

  openModal(conducteur?: Conducteur) {
    if (conducteur) {
      this.selectedConducteur = { ...conducteur };
      this.isEditMode = true;
    } else {
      this.selectedConducteur = { ...this.newConducteur };
      this.isEditMode = false;
    }
    const modal = document.getElementById('conducteurModal');
    if (modal) {
      new (window as any).bootstrap.Modal(modal).show();
    }
  }

  saveConducteur() {
    if (!this.selectedConducteur) return;

    if (this.isEditMode && this.selectedConducteur._id) {
      this.conducteurService.updateConducteur(this.selectedConducteur._id, this.selectedConducteur)
        .subscribe(() => this.loadConducteurs());
    } else {
      this.conducteurService.createConducteur(this.selectedConducteur)
        .subscribe(() => this.loadConducteurs());
    }
    this.closeModal();
  }

  deleteConducteur(id: string | undefined) {
    if (!id) return;
    if (confirm('Supprimer ce conducteur ?')) {
      this.conducteurService.deleteConducteur(id).subscribe(() => this.loadConducteurs());
    }
  }

  closeModal() {
    const modalEl = document.getElementById('conducteurModal');
    if (modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      modal.hide();
    }
  }

}