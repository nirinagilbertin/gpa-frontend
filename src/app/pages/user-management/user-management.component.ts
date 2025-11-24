import { Component, OnInit } from '@angular/core';
import { User, UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = []; // ← AJOUTÉ pour la recherche
  searchTerm: string = ''; // ← AJOUTÉ pour la recherche
  
  userForm: any = { username: '', email: '', phone: '', role: 'user', password: '' };
  modalInstance: any;
  editingUserId: string | null = null;
  userInfo: any; // info du profil connecté

  constructor(private userService: UserService, private authService: AuthService) {}

  ngOnInit() {
    // Récupérer le profil utilisateur
    this.authService.getUserProfile()?.subscribe({
      next: (data: any) => {
        this.userInfo = data;
        console.log('👤 Profil utilisateur reçu:', this.userInfo);

        // ✅ VÉRIFIER LE RÔLE AVANT de charger les users
        if (this.userInfo?.role !== 'admin') {
          console.log('❌ Accès refusé - Rôle:', this.userInfo?.role);
          alert('Accès interdit : Admin requis. Rôle actuel: ' + this.userInfo?.role);
          return; // ← IMPORTANT : ne pas continuer
        }

        // ✅ Seulement si admin, charger les utilisateurs
        console.log('✅ Accès admin autorisé, chargement des users...');
        this.loadUsers();
      },
      error: (err) => {
        console.error('❌ Erreur récupération profil', err);
        alert('Impossible de récupérer le profil, vous devez vous reconnecter.');
      }
    });
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: data => {
        console.log('✅ Utilisateurs chargés:', data);
        this.users = data;
        this.filteredUsers = data; // ← INITIALISER filteredUsers
      },
      error: err => {
        console.error('❌ Erreur chargement utilisateurs', err);
        if (err.status === 403) {
          alert('Accès refusé par le serveur. Vérifiez que vous êtes administrateur.');
        }
      }
    });
  }

  // ← NOUVELLE MÉTHODE : Recherche en temps réel
  onSearchChange() {
    if (!this.searchTerm) {
      this.filteredUsers = this.users;
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.username.toLowerCase().includes(term) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.phone && user.phone.includes(term)) ||
      (user.role && user.role.toLowerCase().includes(term))
    );
  }

  openModal(user?: User) {
    const modalElement = document.getElementById('userModal');
    this.modalInstance = new (window as any).bootstrap.Modal(modalElement);

    if (user) {
      this.editingUserId = user._id ?? null;
      this.userForm = { ...user, password: '' };
    } else {
      this.resetForm();
    }

    this.modalInstance.show();
  }

  closeModal() {
    this.modalInstance.hide();
    this.resetForm(); // ← AJOUTÉ pour reset à la fermeture
  }

  saveUser() {
    if (this.editingUserId) {
      // Mise à jour - ne pas envoyer le password s'il est vide
      const payload = { ...this.userForm };
      if (!payload.password) {
        delete payload.password;
      }
      
      this.userService.updateUser(this.editingUserId, payload).subscribe({
        next: () => { 
          this.loadUsers(); 
          this.closeModal(); 
        },
        error: err => console.error('Erreur mise à jour utilisateur', err)
      });
    } else {
      // Création
      this.userService.createUser(this.userForm).subscribe({
        next: () => { 
          this.loadUsers(); 
          this.closeModal(); 
        },
        error: err => console.error('Erreur création utilisateur', err)
      });
    }
  }

  deleteUser(id: string) {
    if (confirm('Supprimer cet utilisateur ?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => this.loadUsers(),
        error: err => console.error('Erreur suppression utilisateur', err)
      });
    }
  }

  resetForm() {
    this.userForm = { username: '', email: '', phone: '', role: 'user', password: '' };
    this.editingUserId = null;
  }
}