import { auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase-config.js';

// DOM Elements
const authContainer = document.createElement('div');
authContainer.className = 'auth-container';
authContainer.style.display = 'none';

authContainer.innerHTML = `
  <div class="auth-card">
    <h2>Control de Gastos</h2>
    <form id="auth-form" class="auth-form">
      <div class="form-group">
        <label for="auth-email">Email</label>
        <input type="email" id="auth-email" required>
      </div>
      <div class="form-group">
        <label for="auth-password">Contraseña</label>
        <input type="password" id="auth-password" required minlength="6">
      </div>
      <button type="submit" id="auth-submit" class="btn btn-primary">Iniciar Sesión</button>
      <button type="button" id="auth-toggle" class="btn btn-link">¿No tienes cuenta? Regístrate</button>
    </form>
    <div id="auth-error" class="auth-error"></div>
  </div>
`;

// Error messages in Spanish
const errorMessages = {
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contraseña incorrecta',
  'auth/email-already-in-use': 'Este email ya está registrado',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
  'auth/invalid-email': 'Email inválido',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'default': 'Ocurrió un error. Por favor, inténtalo de nuevo.'
};

class AuthService {
  constructor() {
    this.isLogin = true; // Toggle between login/register
    this.user = null;
    this.init();
  }

  init() {
    // Add auth UI to the page
    document.body.insertBefore(authContainer, document.body.firstChild);
    
    // Event listeners
    document.getElementById('auth-form').addEventListener('submit', this.handleAuth.bind(this));
    document.getElementById('auth-toggle').addEventListener('click', this.toggleAuthMode.bind(this));
    
    // Check auth state
    this.setupAuthStateListener();
  }

  setupAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.user = user;
        this.onLoginSuccess();
      } else {
        this.user = null;
        this.showAuth();
      }
    });
  }

  async handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit');
    const errorElement = document.getElementById('auth-error');
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Procesando...';
      errorElement.textContent = '';
      
      if (this.isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = errorMessages[error.code] || errorMessages['default'];
      errorElement.textContent = errorMessage;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = this.isLogin ? 'Iniciar Sesión' : 'Registrarse';
    }
  }

  toggleAuthMode() {
    this.isLogin = !this.isLogin;
    const submitBtn = document.getElementById('auth-submit');
    const toggleBtn = document.getElementById('auth-toggle');
    
    if (this.isLogin) {
      submitBtn.textContent = 'Iniciar Sesión';
      toggleBtn.textContent = '¿No tienes cuenta? Regístrate';
    } else {
      submitBtn.textContent = 'Registrarse';
      toggleBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
    }
    
    document.getElementById('auth-error').textContent = '';
  }

  onLoginSuccess() {
    // Hide auth UI
    authContainer.style.display = 'none';
    
    // Show app content
    document.querySelector('.app-container').style.display = 'block';
    
    // Update UI with user info
    this.updateUserInfo();
    
    // Dispatch custom event that other modules can listen to
    document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user: this.user } }));
  }

  updateUserInfo() {
    const userInfo = document.querySelector('.user-info');
    if (userInfo && this.user) {
      const username = this.user.email.split('@')[0];
      userInfo.innerHTML = `
        <span class="username">${username}</span>
        <button id="logout-btn" class="btn-icon" title="Cerrar Sesión">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      `;
      
      // Add logout event listener
      document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    }
  }

  async logout() {
    try {
      await signOut(auth);
      // Reset app state
      document.querySelector('.app-container').style.display = 'none';
      this.showAuth();
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification('Error al cerrar sesión', 'error');
    }
  }

  showAuth() {
    authContainer.style.display = 'flex';
    document.querySelector('.app-container').style.display = 'none';
  }

  showNotification(message, type = 'info') {
    // Use your existing notification system or create a simple one
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Initialize auth service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Hide main app content until user is authenticated
  document.querySelector('.app-container').style.display = 'none';
  
  // Initialize auth service
  const authService = new AuthService();
  
  // Make auth service available globally (for other modules)
  window.authService = authService;
});
