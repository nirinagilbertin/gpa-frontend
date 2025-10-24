export interface Vehicule {
  _id?: string;
  immatriculation: string;
  type: string;          // 'moto' ou 'voiture'
  marque: string;
  modele: string;
  typeCarburant: string; // essence, diesel, etc.
  kilometreCompteur: number;
}

export interface Conducteur {
  _id?: string;
  matricule: string;
  nom: string;
  prenom: string;
  nomUtilisateur: string;
  motDePasse: string;
  role: 'chauffeur' | 'coursier' | 'superviseur';
  access: 'simple' | 'total';
}