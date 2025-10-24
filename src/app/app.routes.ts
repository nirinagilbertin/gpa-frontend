import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { VehiculesComponent } from './pages/vehicules/vehicules.component';
import { ConducteursComponent } from './pages/conducteurs/conducteurs.component';
import { VehiculeDetailComponent } from './pages/vehicule-detail/vehicule-detail.component';
import { TrajetsComponent } from './pages/trajets/trajets.component';
import { CarburantsComponent } from './pages/carburants/carburants.component';
import { EntretiensComponent } from './pages/entretiens/entretiens.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { AlerterComponent } from './pages/alerter/alerter.component';
import { StatistiqueComponent } from './pages/statistique/statistique.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'accueil', component: AccueilComponent },
      { path: 'vehicules', component: VehiculesComponent },
      { path: 'vehicules/:id', component: VehiculeDetailComponent },
      { path: 'conducteurs', component: ConducteursComponent },
      { path: 'trajets', component: TrajetsComponent },
      { path: 'carburants', component: CarburantsComponent },
      { path: 'entretiens', component: EntretiensComponent },
      { path: 'alerter', component: AlerterComponent},
      { path: 'statistique', component: StatistiqueComponent},
      { path: '', redirectTo: '/accueil', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/login' },
    // { path: 'login', component: LoginComponent },
    // { path: 'accueil', component: AccueilComponent, canActivate: [AuthGuard]},
    // { path: '', redirectTo: '/login', pathMatch: 'full' },
    // { path: 'vehicules', component: VehiculesComponent },
    // { path: 'conducteurs', component: ConducteursComponent },
    // { path: 'vehicules/:id', component: VehiculeDetailComponent},
    // { path: 'trajets', component: TrajetsComponent},
    // { path: 'carburants', component: CarburantsComponent},
    // { path: 'entretiens', component: EntretiensComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
