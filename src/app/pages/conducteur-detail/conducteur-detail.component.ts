import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Conducteur, ConducteurService } from '../../services/conducteur.service';
import { Trajet, TrajetService } from '../../services/trajet.service';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { Carburant, CarburantService } from '../../services/carburant.service';
import { Entretien, EntretienService } from '../../services/entretien.service';

@Component({
  selector: 'app-conducteur-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './conducteur-detail.component.html',
  styleUrl: './conducteur-detail.component.css'
})
export class ConducteurDetailComponent {

  conducteur: Conducteur | null = null;
  isLoading = true;
  error: string | null = null;

  stats = {
    trajets: 0,
    pleins: 0,
    kmTotal: 0
  };

  historique = {
    trajets: [] as Trajet[],
    pleins: [] as Carburant[],
    entretiens: [] as Entretien[]
  };

  constructor(
    private route: ActivatedRoute,
    private conducteurService: ConducteurService,
    private trajetService: TrajetService,
    private carburantService: CarburantService,
    private entretienService: EntretienService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Identifiant du conducteur manquant dans l’URL.';
      this.isLoading = false;
      return;
    }

    // 1) Charger le conducteur puis lancer les requêtes d'historique en parallèle
    this.conducteurService.getConducteur(id).pipe(
      tap(c => this.conducteur = c),
      switchMap(c =>
        forkJoin({
          trajets: this.trajetService.getTrajets().pipe(
            map(arr => arr.filter(t => {
              // t.conducteur peut être objet ou id -> on normalise
              const tid = (t as any).conducteur?._id ?? (t as any).conducteur;
              const cid = (c as any)._id ?? c;
              return tid === cid;
            }))
          ),
          pleins: this.carburantService.getCarburants().pipe(
            map(arr => arr.filter(p => {
              const pid = (p as any).conducteur?._id ?? (p as any).conducteur;
              const cid = (c as any)._id ?? c;
              return pid === cid;
            }))
          ),
          entretiens: this.entretienService.getEntretiens().pipe(
            map(arr => arr.filter(e => {
              const eid = (e as any).conducteur?._id ?? (e as any).conducteur;
              const cid = (c as any)._id ?? c;
              return eid === cid;
            }))
          )
        })
      ),
      catchError(err => {
        console.error('Erreur chargement conducteur/historique', err);
        this.error = 'Erreur lors du chargement des données.';
        this.isLoading = false;
        // on renvoie des tableaux vides pour que la subscription continue proprement
        return of({ trajets: [], pleins: [], entretiens: [] });
      })
    ).subscribe(result => {
      this.historique.trajets = result.trajets;
      this.historique.pleins = result.pleins;
      this.historique.entretiens = result.entretiens;

      // Stats
      this.stats.trajets = this.historique.trajets.length;
      this.stats.pleins = this.historique.pleins.length;

      // calcul du km total : préférence distanceParcourue, sinon calcul kmArriver-kmDepart
      this.stats.kmTotal = this.historique.trajets.reduce((sum, t) => {
        const dist = (t.distanceParcourue ?? ((t.kmArriver != null && t.kmDepart != null) ? (t.kmArriver - t.kmDepart) : 0));
        return sum + (typeof dist === 'number' ? dist : 0);
      }, 0);

      this.isLoading = false;
    });
  }

  // classes pour badge role
  getRoleBadgeClass(role?: string) {
    switch (role) {
      case 'chauffeur': return 'badge bg-primary';
      case 'coursier': return 'badge bg-info text-dark';
      case 'superviseur': return 'badge bg-success';
      default: return 'badge bg-secondary';
    }
  }

  // classes pour badge access
  getAccessBadgeClass(access?: string) {
    return access === 'total' ? 'badge bg-warning text-dark' : 'badge bg-secondary';
  }

  // utility pour afficher motif (string | string[])
  motifToString(motif: any): string {
    if (!motif) return '—';
    return Array.isArray(motif) ? motif.join(', ') : String(motif);
  }
}