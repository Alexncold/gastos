import { 
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from './firebase-config.js';

// CONFIGURACIÓN: Email permitido
const ALLOWED_EMAIL = 'gastos@presupuesto.com';

// DOM Elements
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit');
const authToggleBtn = document.getElementById('auth-toggle');
const authError = document.getElementById('auth-error');
const appContainer = document.querySelector('.app-container');
const logoutBtn = document.getElementById('logout-btn');

// Error messages in Spanish
const errorMessages = {
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contraseña incorrecta',
  'auth/invalid-email': 'Email inválido',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'auth/invalid-credential': 'Credenciales inválidas',
  'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
  'default': 'Ocurrió un error. Por favor, inténtalo de nuevo.'
};

// State
let currentUser = null;

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Verificar que el usuario sea el permitido
    if (user.email === ALLOWED_EMAIL) {
      currentUser = user;
      onLoginSuccess(user);
    } else {
      // Si no es el usuario permitido, cerrar sesión
      signOut(auth);
      showAuthUI();
      showError('Acceso no autorizado. Solo el usuario autorizado puede acceder.');
    }
  } else {
    currentUser = null;
    showAuthUI();
  }
});

// Handle form submission
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  
  // Verificar que sea el email permitido
  if (email !== ALLOWED_EMAIL) {
    showError('Acceso no autorizado. Solo el usuario autorizado puede acceder.');
    return;
  }
  
  try {
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'Iniciando sesión...';
    authError.textContent = '';
    
    await signInWithEmailAndPassword(auth, email, password);
    
    // Reset form
    authForm.reset();
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = errorMessages[error.code] || errorMessages['default'];
    showError(errorMessage);
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = 'Iniciar Sesión';
  }
});

// Ocultar el botón de toggle (ya no se puede registrar)
if (authToggleBtn) {
  authToggleBtn.style.display = 'none';
}

// Handle logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showAuthUI();
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Error al cerrar sesión', 'error');
    }
  });
}

// Show auth UI
function showAuthUI() {
  authContainer.style.display = 'flex';
  appContainer.style.display = 'none';
  authForm.reset();
  authError.textContent = '';
  authError.style.display = 'none';
}

// On login success
function onLoginSuccess(user) {
  // Hide auth UI
  authContainer.style.display = 'none';
  
  // Show app
  appContainer.style.display = 'flex';
  
  // Update user info
  const username = user.email.split('@')[0];
  document.querySelector('.username').textContent = username;
  logoutBtn.style.display = 'inline-flex';
  
  // Dispatch event for other modules
  document.dispatchEvent(new CustomEvent('userLoggedIn', {
    detail: { user: { uid: user.uid, email: user.email } }
  }));
}

// Show error in auth form
function showError(message) {
  authError.textContent = message;
  authError.style.display = 'block';
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}