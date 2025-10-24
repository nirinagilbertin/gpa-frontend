import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Vehicule } from '../../services/vehicule.service';
import { Alerte, NotificationService } from '../../services/notification.service';
import { EntretienProgramme, EntretienProgrammeService } from '../../services/entretien-programme.service';

@Component({
  selector: 'app-alerter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alerter.component.html',
  styleUrls: ['./alerter.component.css']
})
export class AlerterComponent implements OnInit {
  alertes: Alerte[] = [];
  alertesNonLues: number = 0;

  entretiens: EntretienProgramme[] = [];
  vehicules: Vehicule[] = [];

  categories = ['Vidange', 'Révision', 'Freins', 'Pneus', 'Autre'];

  form: FormGroup;
  messageSuccess: string = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private notificationService: NotificationService,
    private entretienService: EntretienProgrammeService
  ) {
    this.form = this.fb.group({
      vehiculeId: ['', Validators.required],
      categorie: ['', Validators.required],
      typeCondition: ['date', Validators.required],
      datePrevue: [''],
      seuilKilometrage: ['']
    });
  }

  ngOnInit(): void {
    this.loadVehicules();
    this.loadAlertes();
    this.loadEntretiens();

    this.notificationService.getAlertesAutoRefresh().subscribe(alertes => {
      this.alertes = alertes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.alertesNonLues = alertes.filter(a => !a.lue).length;
    });

    this.form.get('typeCondition')?.valueChanges.subscribe(value => {
      if (value === 'date') {
        this.form.get('datePrevue')?.setValidators([Validators.required]);
        this.form.get('seuilKilometrage')?.clearValidators();
      } else {
        this.form.get('seuilKilometrage')?.setValidators([Validators.required]);
        this.form.get('datePrevue')?.clearValidators();
      }
      this.form.get('datePrevue')?.updateValueAndValidity();
      this.form.get('seuilKilometrage')?.updateValueAndValidity();
    });
  }

  loadAlertes() {
    this.notificationService.getAlertes().subscribe((alertes: any) => {
      this.alertes = alertes;
      this.alertesNonLues = alertes.filter((a: { lue: any; }) => !a.lue).length;
    });
  }

  loadEntretiens() {
    this.entretienService.getEntretiens().subscribe((data: any) => {
      this.entretiens = data;
    });
  }

  loadVehicules() {
    this.http.get<Vehicule[]>('http://localhost:5000/api/vehicules').subscribe(data => this.vehicules = data);
  }

  marquerAlerteLue(alerte: Alerte) {
    this.notificationService.marquerLue(alerte._id).subscribe(() => {
      alerte.lue = true;
      this.alertesNonLues = this.alertes.filter(a => !a.lue).length;
    });
  }

  marquerEntretienTermine(entretien: EntretienProgramme) {
    if (!entretien._id) return;
    this.entretienService.marquerTermine(entretien._id).subscribe(() => {
      entretien.statut = 'terminee';
    });
  }

  supprimerEntretien(entretien: EntretienProgramme) {
    if (!entretien._id) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet entretien programmé ?')) {
      this.entretienService.supprimerEntretien(entretien._id).subscribe({
        next: () => {
          this.entretiens = this.entretiens.filter(e => e._id !== entretien._id);
          this.messageSuccess = 'Entretien programmé supprimé avec succès !';
          
          setTimeout(() => {
            this.messageSuccess = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression de l\'entretien');
        }
      });
    }
  }

  openModal() {
    const modalElement = document.getElementById('epModal');
    if (modalElement) {
      // CORRECTION: Utiliser l'instance Bootstrap directement
      const bsModal = new (window as any).bootstrap.Modal(modalElement);
      bsModal.show();
    }
  }

  closeModal() {
    const modalElement = document.getElementById('epModal');
    if (modalElement) {
      // CORRECTION: Récupérer l'instance existante et la fermer
      const bsModal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (bsModal) {
        bsModal.hide();
      }
    }
  }

  resetForm() {
    this.form.reset({ 
      typeCondition: 'date',
      categorie: ''
    });
    this.messageSuccess = '';
  }

  submit() {
    if (this.form.invalid) return;

    const entretien = {
      vehiculeId: this.form.value.vehiculeId,
      categorie: this.form.value.categorie,
      typeCondition: this.form.value.typeCondition,
      datePrevue: this.form.value.datePrevue,
      seuilKilometrage: this.form.value.seuilKilometrage
    };

    this.entretienService.creerEntretien(entretien).subscribe(() => {
      this.messageSuccess = 'Entretien programmé créé avec succès !';
      this.resetForm();
      this.loadEntretiens();
      
      // CORRECTION: Fermer le modal directement avec la bonne méthode
      this.closeModal();
    });
  }
}