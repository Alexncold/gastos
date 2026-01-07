// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Set default active tab from URL hash or default to 'expenses'
const defaultTab = window.location.hash.substring(1) || 'expenses';

// State
let currentUserId = null;
let unsubscribeConfig = null;

// Initialize the app
function initApp() {
  // Set up tab switching
  setupTabs();
  
  // Set the initial active tab
  setActiveTab(defaultTab);
  
  // Add event listeners
  setupEventListeners();
  
  // Set current year in footer if exists
  updateFooterYear();
}

// Set up tab switching functionality
function setupTabs() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      setActiveTab(tabId);
      
      // Update URL hash without page reload
      window.history.pushState(null, null, `#${tabId}`);
    });
  });
}

// Set the active tab and update UI
function setActiveTab(tabId) {
  // Hide all tab contents
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // Deactivate all tab buttons
  tabButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // Show the selected tab content
  const activeTabContent = document.getElementById(tabId);
  if (activeTabContent) {
    activeTabContent.classList.add('active');
  } else {
    // Fallback to expenses if tab doesn't exist
    document.getElementById('expenses').classList.add('active');
  }
  
  // Activate the clicked tab button
  const activeButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

// Set up event listeners
function setupEventListeners() {
  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const tabId = window.location.hash.substring(1) || 'expenses';
    setActiveTab(tabId);
  });
  
  // Prevent default form submission and handle configuration form
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveConfiguration();
    });
  }
  
  // Handle configuration input changes (auto-save on change)
  const monthlyBudgetInput = document.getElementById('monthly-budget');
  const fixedExpenseInput = document.getElementById('fixed-expense');
  const spendingLimitInput = document.getElementById('spending-limit');
  
  if (monthlyBudgetInput) {
    monthlyBudgetInput.addEventListener('change', async () => {
      const amount = parseFloat(monthlyBudgetInput.value) || 0;
      await saveMonthlyBudget(amount);
    });
  }
  
  if (fixedExpenseInput) {
    fixedExpenseInput.addEventListener('change', async () => {
      const amount = parseFloat(fixedExpenseInput.value) || 0;
      await saveFixedExpenses(amount);
    });
  }
  
  if (spendingLimitInput) {
    spendingLimitInput.addEventListener('change', async () => {
      const amount = parseFloat(spendingLimitInput.value) || 0;
      await saveSpendingLimit(amount);
    });
  }
  
  // Handle reset button clicks
  document.addEventListener('click', async (e) => {
    const resetBtn = e.target.closest('.reset-btn');
    if (!resetBtn) return;

    const targetId = resetBtn.getAttribute('data-target');
    if (!targetId) return;

    const input = document.querySelector(`#${targetId}[type="number"]`);
    if (!input) {
      console.error(`Input element with ID '${targetId}' not found`);
      return;
    }

    console.log('Resetting input:', targetId);
    
    // Set the input value to 0
    input.value = '0';
    
    // Save to Firebase
    const amount = 0;
    if (targetId === 'monthly-budget') {
      await saveMonthlyBudget(amount);
    } else if (targetId === 'fixed-expense') {
      await saveFixedExpenses(amount);
    } else if (targetId === 'spending-limit') {
      await saveSpendingLimit(amount);
    }
    
    // Trigger change event
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('Reset completed for:', targetId);
  });
}

// Update footer year
function updateFooterYear() {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// Initialize configuration for a logged-in user
async function initConfiguration(userId) {
  if (!userId) {
    console.error('No user ID provided to initConfiguration()');
    return;
  }
  
  currentUserId = userId;
  console.log('Initializing configuration for user:', userId);
  
  // Setup real-time listener for configuration
  await setupConfigListener();
}

// Setup real-time listener for configuration from Firestore
async function setupConfigListener() {
  if (!currentUserId) {
    console.error('Cannot setup config listener: no user ID');
    return;
  }
  
  // Unsubscribe from previous listener if exists
  if (unsubscribeConfig) {
    unsubscribeConfig();
  }
  
  try {
    // Dynamically import Firebase functions
    const { getUserConfigDoc, onSnapshot } = await import('./firebase-config.js');
    
    const configDoc = getUserConfigDoc(currentUserId);
    
    unsubscribeConfig = onSnapshot(configDoc, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log('Configuration loaded:', data);
          
          // Update UI with loaded configuration
          updateConfigurationUI(data);
        } else {
          console.log('No configuration document found, using defaults');
          updateConfigurationUI({
            monthlyBudget: 0,
            fixedExpenses: 0,
            spendingLimit: 0
          });
        }
      },
      (error) => {
        console.error('Error getting configuration:', error);
      }
    );
  } catch (error) {
    console.error('Error setting up config listener:', error);
  }
}

// Update configuration UI with loaded data
function updateConfigurationUI(config) {
  const monthlyBudgetInput = document.getElementById('monthly-budget');
  const fixedExpenseInput = document.getElementById('fixed-expense');
  const spendingLimitInput = document.getElementById('spending-limit');
  
  // Update inputs
  if (monthlyBudgetInput && config.monthlyBudget !== undefined) {
    monthlyBudgetInput.value = config.monthlyBudget;
  }
  
  if (fixedExpenseInput && config.fixedExpenses !== undefined) {
    fixedExpenseInput.value = config.fixedExpenses;
  }
  
  if (spendingLimitInput && config.spendingLimit !== undefined) {
    spendingLimitInput.value = config.spendingLimit;
  }
  
  // Update display elements
  updateBudgetDisplay(config.monthlyBudget || 0, 'monthly-budget-amount');
  updateBudgetDisplay(config.fixedExpenses || 0, 'fixed-expenses-amount');
  updateBudgetDisplay(config.spendingLimit || 0, 'spending-limit-amount');
}

// Save entire configuration to Firestore
async function saveConfiguration() {
  if (!currentUserId) {
    showNotification('Usuario no autenticado', 'error');
    return;
  }
  
  const monthlyBudget = parseFloat(document.getElementById('monthly-budget')?.value) || 0;
  const fixedExpenses = parseFloat(document.getElementById('fixed-expense')?.value) || 0;
  const spendingLimit = parseFloat(document.getElementById('spending-limit')?.value) || 0;
  
  try {
    // Dynamically import Firebase functions
    const { getUserConfigDoc, setDoc } = await import('./firebase-config.js');
    
    const configDoc = getUserConfigDoc(currentUserId);
    
    await setDoc(configDoc, {
      monthlyBudget,
      fixedExpenses,
      spendingLimit,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('Configuration saved:', { monthlyBudget, fixedExpenses, spendingLimit });
    showNotification('Configuración guardada correctamente', 'success');
    
    // Dispatch events for other modules
    document.dispatchEvent(new CustomEvent('budgetUpdated', { detail: { amount: monthlyBudget } }));
    document.dispatchEvent(new CustomEvent('fixedExpensesUpdated', { detail: { amount: fixedExpenses } }));
    document.dispatchEvent(new CustomEvent('spendingLimitUpdated', { detail: { amount: spendingLimit } }));
    
  } catch (error) {
    console.error('Error saving configuration:', error);
    showNotification('Error al guardar la configuración', 'error');
  }
}

// Save monthly budget to Firestore
async function saveMonthlyBudget(amount) {
  if (!currentUserId) {
    console.error('Cannot save budget: no user ID');
    return;
  }
  
  try {
    const { getUserConfigDoc, setDoc } = await import('./firebase-config.js');
    
    const configDoc = getUserConfigDoc(currentUserId);
    
    await setDoc(configDoc, {
      monthlyBudget: amount,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('Monthly budget saved:', amount);
    updateBudgetDisplay(amount, 'monthly-budget-amount');
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('budgetUpdated', { detail: { amount } }));
    
    return amount;
  } catch (error) {
    console.error('Error saving monthly budget:', error);
    showNotification('Error al guardar el presupuesto', 'error');
  }
}

// Save fixed expenses to Firestore
async function saveFixedExpenses(amount) {
  if (!currentUserId) {
    console.error('Cannot save fixed expenses: no user ID');
    return;
  }
  
  try {
    const { getUserConfigDoc, setDoc } = await import('./firebase-config.js');
    
    const configDoc = getUserConfigDoc(currentUserId);
    
    await setDoc(configDoc, {
      fixedExpenses: amount,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('Fixed expenses saved:', amount);
    updateBudgetDisplay(amount, 'fixed-expenses-amount');
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('fixedExpensesUpdated', { detail: { amount } }));
    
    return amount;
  } catch (error) {
    console.error('Error saving fixed expenses:', error);
    showNotification('Error al guardar los gastos fijos', 'error');
  }
}

// Save spending limit to Firestore
async function saveSpendingLimit(amount) {
  if (!currentUserId) {
    console.error('Cannot save spending limit: no user ID');
    return;
  }
  
  try {
    const { getUserConfigDoc, setDoc } = await import('./firebase-config.js');
    
    const configDoc = getUserConfigDoc(currentUserId);
    
    await setDoc(configDoc, {
      spendingLimit: amount,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('Spending limit saved:', amount);
    updateBudgetDisplay(amount, 'spending-limit-amount');
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('spendingLimitUpdated', { detail: { amount } }));
    
    return amount;
  } catch (error) {
    console.error('Error saving spending limit:', error);
    showNotification('Error al guardar el límite de gastos', 'error');
  }
}

// Update the display for budget or fixed expenses
function updateBudgetDisplay(amount, elementId) {
  const amountElement = document.getElementById(elementId);
  if (amountElement) {
    amountElement.textContent = formatNumberAsCurrency(amount);
  }
}

// Format number as currency
function formatNumberAsCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
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

// Handle theme preference
function setThemePreference() {
  const theme = localStorage.getItem('theme') || 'system';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setThemePreference);

// Set initial theme
setThemePreference();

// Utility function to format currency
function formatCurrency(amount, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Cleanup function
function cleanup() {
  if (unsubscribeConfig) {
    unsubscribeConfig();
    unsubscribeConfig = null;
  }
  currentUserId = null;
}

// Export functions for later use
window.app = {
  formatCurrency,
  setActiveTab
};

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Initialize configuration when user logs in
document.addEventListener('userLoggedIn', (e) => {
  console.log('User logged in, initializing app configuration:', e.detail.user.uid);
  initConfiguration(e.detail.user.uid);
});

// Cleanup when user logs out
document.addEventListener('userLoggedOut', () => {
  console.log('User logged out, cleaning up app configuration');
  cleanup();
  
  // Reset UI
  updateConfigurationUI({
    monthlyBudget: 0,
    fixedExpenses: 0,
    spendingLimit: 0
  });
});