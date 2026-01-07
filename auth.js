import { 
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from './firebase-config.js';

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
  'auth/email-already-in-use': 'Este email ya está registrado',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
  'auth/invalid-email': 'Email inválido',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'auth/invalid-credential': 'Credenciales inválidas',
  'default': 'Ocurrió un error. Por favor, inténtalo de nuevo.'
};

// State
let isLogin = true;
let currentUser = null;

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    onLoginSuccess(user);
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
  
  try {
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'Procesando...';
    authError.textContent = '';
    
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    
    // Reset form
    authForm.reset();
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = errorMessages[error.code] || errorMessages['default'];
    authError.textContent = errorMessage;
    authError.style.display = 'block';
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isLogin ? 'Iniciar Sesión' : 'Registrarse';
  }
});

// Toggle between login and register
authToggleBtn.addEventListener('click', () => {
  isLogin = !isLogin;
  
  if (isLogin) {
    authSubmitBtn.textContent = 'Iniciar Sesión';
    authToggleBtn.textContent = '¿No tienes cuenta? Regístrate';
    authEmailInput.setAttribute('autocomplete', 'email');
    authPasswordInput.setAttribute('autocomplete', 'current-password');
  } else {
    authSubmitBtn.textContent = 'Registrarse';
    authToggleBtn.textContent = '¿Ya tienes cuenta? Inicia Sesión';
    authEmailInput.setAttribute('autocomplete', 'email');
    authPasswordInput.setAttribute('autocomplete', 'new-password');
  }
  
  authError.textContent = '';
  authError.style.display = 'none';
});

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