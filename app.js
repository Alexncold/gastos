// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Set default active tab from URL hash or default to 'dashboard'
const defaultTab = window.location.hash.substring(1) || 'dashboard';

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
    // Fallback to dashboard if tab doesn't exist
    document.getElementById('dashboard').classList.add('active');
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
    const tabId = window.location.hash.substring(1) || 'dashboard';
    setActiveTab(tabId);
  });
  
  // Prevent form submission for now (will be implemented later)
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Form submission logic will be added later
      console.log('Form submitted:', form.id);
    });
  });
}

// Update footer year
function updateFooterYear() {
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// Budget Management
const BUDGET_STORAGE_KEY = 'monthlyBudget';
const FIXED_EXPENSES_KEY = 'fixedExpenses';
const SPENDING_LIMIT_KEY = 'spendingLimit';

// Format number as currency (simplified version)
function formatNumberAsCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Save budget to localStorage and update display
function saveMonthlyBudget(amount) {
  localStorage.setItem(BUDGET_STORAGE_KEY, amount);
  updateBudgetDisplay(amount, 'monthly-budget-amount');
  
  // Dispatch event to notify other components about budget update
  const event = new CustomEvent('budgetUpdated', { detail: { amount } });
  document.dispatchEvent(event);
  
  return amount;
}

// Save fixed expenses to localStorage and update display
function saveFixedExpenses(amount) {
  localStorage.setItem(FIXED_EXPENSES_KEY, amount);
  updateBudgetDisplay(amount, 'fixed-expenses-amount');
  
  // Dispatch event to notify other components about fixed expenses update
  const event = new CustomEvent('fixedExpensesUpdated', { detail: { amount } });
  document.dispatchEvent(event);
  
  return amount;
}

// Save spending limit to localStorage and update display
function saveSpendingLimit(amount) {
  localStorage.setItem(SPENDING_LIMIT_KEY, amount);
  updateBudgetDisplay(amount, 'spending-limit-amount');
  return amount;
}

// Load budget from localStorage
function loadMonthlyBudget() {
  const budget = localStorage.getItem(BUDGET_STORAGE_KEY);
  return budget !== null ? parseFloat(budget) : 0;
}

// Load fixed expenses from localStorage
function loadFixedExpenses() {
  const fixedExpenses = localStorage.getItem(FIXED_EXPENSES_KEY);
  return fixedExpenses !== null ? parseFloat(fixedExpenses) : 0;
}

// Load spending limit from localStorage
function loadSpendingLimit() {
  const spendingLimit = localStorage.getItem(SPENDING_LIMIT_KEY);
  return spendingLimit !== null ? parseFloat(spendingLimit) : 0;
}

// Update the display for budget or fixed expenses
function updateBudgetDisplay(amount, elementId) {
  const amountElement = document.getElementById(elementId);
  if (amountElement) {
    amountElement.textContent = formatNumberAsCurrency(amount);
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Initialize budget from storage
  const savedBudget = loadMonthlyBudget();
  if (savedBudget > 0) {
    updateBudgetDisplay(savedBudget, 'monthly-budget-amount');
    const budgetInput = document.getElementById('monthly-budget');
    if (budgetInput) {
      budgetInput.value = savedBudget;
    }
  }
  
  // Initialize fixed expenses from storage
  const savedFixedExpenses = loadFixedExpenses();
  if (savedFixedExpenses > 0) {
    updateBudgetDisplay(savedFixedExpenses, 'fixed-expenses-amount');
    const fixedExpensesInput = document.getElementById('fixed-expense');
    if (fixedExpensesInput) {
      fixedExpensesInput.value = savedFixedExpenses;
    }
  } else {
    updateBudgetDisplay(0, 'fixed-expenses-amount');
  }
  
  // Initialize spending limit from storage
  const savedSpendingLimit = loadSpendingLimit();
  if (savedSpendingLimit > 0) {
    updateBudgetDisplay(savedSpendingLimit, 'spending-limit-amount');
    const spendingLimitInput = document.getElementById('spending-limit');
    if (spendingLimitInput) {
      spendingLimitInput.value = savedSpendingLimit;
    }
  } else {
    updateBudgetDisplay(0, 'spending-limit-amount');
  }
});

// Handle input changes when user finishes editing (on change event)
document.addEventListener('change', (e) => {
  if (!e.target) return;
  
  // Handle monthly budget input
  if (e.target.id === 'monthly-budget') {
    const amount = parseFloat(e.target.value) || 0;
    saveMonthlyBudget(amount);
  }
  
  // Handle fixed expenses input
  if (e.target.id === 'fixed-expense') {
    const amount = parseFloat(e.target.value) || 0;
    saveFixedExpenses(amount);
  }
  
  // Handle spending limit input
  if (e.target.id === 'spending-limit') {
    const amount = parseFloat(e.target.value) || 0;
    saveSpendingLimit(amount);
  }
});

// Handle reset button clicks
document.addEventListener('click', (e) => {
  const resetBtn = e.target.closest('.reset-btn');
  if (!resetBtn) return;

  const targetId = resetBtn.getAttribute('data-target');
  if (!targetId) return;

  // Find the input element by ID and type=number
  const input = document.querySelector(`#${targetId}[type="number"]`);
  if (!input) {
    console.error(`Input element with ID '${targetId}' not found`);
    return;
  }

  console.log('Resetting input:', targetId);
  
  // Set the input value to 0
  input.value = '0';
  
  // Force update the display by directly calling the save function
  const amount = 0;
  if (targetId === 'monthly-budget') {
    console.log('Saving monthly budget:', amount);
    saveMonthlyBudget(amount);
  } else if (targetId === 'fixed-expense') {
    console.log('Saving fixed expenses:', amount);
    saveFixedExpenses(amount);
  } else if (targetId === 'spending-limit') {
    console.log('Saving spending limit:', amount);
    saveSpendingLimit(amount);
  }
  
  // Trigger change event to update the display
  input.dispatchEvent(new Event('change', { bubbles: true }));
  
  console.log('Reset completed for:', targetId);
});

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
function formatCurrency(amount, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Export functions for later use (when we add more functionality)
window.app = {
  formatCurrency,
  setActiveTab
};
