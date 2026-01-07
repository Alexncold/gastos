// Expense Management Module
const Expenses = (() => {
  // DOM Elements
  const expenseForm = document.getElementById('expense-form');
  const expenseIdInput = document.getElementById('expense-id');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expenseDateInput = document.getElementById('expense-date');
  const expenseDescriptionInput = document.getElementById('expense-description');
  const expenseCategorySelect = document.getElementById('expense-category');
  const expenseSubmitBtn = document.getElementById('expense-submit-btn');
  const expenseCancelBtn = document.getElementById('expense-cancel-btn');
  const expenseFormTitle = document.getElementById('expense-form-title');
  const expensesTbody = document.getElementById('expenses-tbody');
  const totalAmountElement = document.getElementById('total-amount');
  const expenseSearchInput = document.getElementById('expense-search');
  const categoryFilterSelect = document.getElementById('category-filter');
  
  // State
  let expenses = [];
  let isEditing = false;
  
  // Initialize the module
  function init() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;
    
    // Load expenses from localStorage
    loadExpenses();
    
    // Add event listeners
    setupEventListeners();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Form submission
    expenseForm.addEventListener('submit', handleSubmit);
    
    // Cancel button
    expenseCancelBtn.addEventListener('click', resetForm);
    
    // Search input
    expenseSearchInput.addEventListener('input', debounce(renderExpenses, 300));
    
    // Category filter
    categoryFilterSelect.addEventListener('change', renderExpenses);
    
    // Format amount input
    expenseAmountInput.addEventListener('input', formatCurrencyInput);
    expenseAmountInput.addEventListener('blur', formatCurrencyOnBlur);
    expenseAmountInput.addEventListener('focus', formatCurrencyOnFocus);
    
    // Listen for fixed expenses updates
    document.addEventListener('fixedExpensesUpdated', () => {
      // Recalculate and update the total amount
      const total = expenses.reduce((sum, exp) => sum + exp.monto, 0);
      updateTotalAmount(total);
    });
  }
  
  // Handle form submission
  function handleSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!expenseForm.checkValidity()) {
      return;
    }
    
    // Format the amount correctly
    let amountValue = expenseAmountInput.value;
    // Remove any existing formatting
    amountValue = amountValue.replace(/[^0-9.]/g, '');
    // Convert to number and ensure it's a valid number
    const amount = parseFloat(amountValue);
    
    if (isNaN(amount)) {
      showNotification('Por favor ingrese un monto válido', 'error');
      return;
    }
    
    const expenseData = {
      id: isEditing ? expenseIdInput.value : Date.now().toString(),
      fecha: expenseDateInput.value,
      detalle: expenseDescriptionInput.value.trim(),
      categoria: expenseCategorySelect.value,
      monto: amount
    };
    
    if (isEditing) {
      updateExpense(expenseData);
    } else {
      addExpense(expenseData);
    }
    
    resetForm();
  }
  
  // Add a new expense
  function addExpense(expense) {
    expenses.unshift(expense);
    saveExpenses();
    renderExpenses();
    showNotification('Gasto agregado correctamente', 'success');
  }
  
  // Update an existing expense
  function updateExpense(updatedExpense) {
    const index = expenses.findIndex(exp => exp.id === updatedExpense.id);
    if (index !== -1) {
      expenses[index] = updatedExpense;
      saveExpenses();
      renderExpenses();
      showNotification('Gasto actualizado correctamente', 'success');
    }
  }
  
  // Delete an expense
  function deleteExpense(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
      expenses = expenses.filter(exp => exp.id !== id);
      saveExpenses();
      renderExpenses();
      showNotification('Gasto eliminado correctamente', 'success');
    }
  }
  
  // Edit an expense
  function editExpense(id) {
    const expense = expenses.find(exp => exp.id === id);
    if (expense) {
      isEditing = true;
      
      // Fill the form with expense data
      expenseIdInput.value = expense.id;
      expenseAmountInput.value = expense.monto.toFixed(2).replace('.', ',');
      expenseDateInput.value = expense.fecha;
      expenseDescriptionInput.value = expense.detalle;
      expenseCategorySelect.value = expense.categoria;
      
      // Update UI
      expenseFormTitle.textContent = 'Editar Gasto';
      expenseSubmitBtn.textContent = 'Actualizar Gasto';
      expenseCancelBtn.style.display = 'inline-flex';
      expenseForm.parentElement.classList.add('editing');
      
      // Scroll to form
      expenseForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  // Reset the form
  function resetForm() {
    expenseForm.reset();
    expenseIdInput.value = '';
    isEditing = false;
    
    // Reset UI
    expenseFormTitle.textContent = 'Nuevo Gasto';
    expenseSubmitBtn.textContent = 'Agregar Gasto';
    expenseCancelBtn.style.display = 'none';
    expenseForm.parentElement.classList.remove('editing');
    
    // Reset date to today
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;
  }
  
  // Render expenses in the table
  function renderExpenses() {
    const searchTerm = expenseSearchInput.value.toLowerCase();
    const categoryFilter = categoryFilterSelect.value;
    
    // Filter expenses
    let filteredExpenses = expenses.filter(expense => {
      const matchesSearch = expense.detalle.toLowerCase().includes(searchTerm) ||
                          expense.categoria.includes(searchTerm) ||
                          expense.monto.toString().includes(searchTerm);
      
      const matchesCategory = categoryFilter === 'all' || expense.categoria === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
    
    // Clear the table
    expensesTbody.innerHTML = '';
    
    // Show empty state if no expenses
    if (filteredExpenses.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = `
        <td colspan="5" class="text-center">No se encontraron gastos</td>
      `;
      expensesTbody.appendChild(emptyRow);
      updateTotalAmount(0);
      return;
    }
    
    // Add expenses to the table
    filteredExpenses.forEach(expense => {
      const row = document.createElement('tr');
      
      // Format date
      const date = new Date(expense.fecha);
      const formattedDate = date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Format amount
      const formattedAmount = formatCurrency(expense.monto);
      
      // Create row HTML
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${escapeHtml(expense.detalle)}</td>
        <td><span class="category-badge category-${expense.categoria}">${formatCategory(expense.categoria)}</span></td>
        <td class="text-right">${formattedAmount}</td>
        <td class="text-center">
          <div class="action-buttons">
            <button type="button" class="btn-icon btn-edit" data-id="${expense.id}" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-delete" data-id="${expense.id}" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </td>
      `;
      
      expensesTbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        editExpense(id);
      });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteExpense(id);
      });
    });
    
    // Update total amount
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.monto, 0);
    updateTotalAmount(total);
  }
  
  // Update the total amount display
  function updateTotalAmount(amount) {
    // Get fixed expenses from localStorage
    const fixedExpenses = parseFloat(localStorage.getItem('fixedExpenses')) || 0;
    // Add fixed expenses to the total amount
    const totalWithFixed = amount + fixedExpenses;
    totalAmountElement.textContent = formatCurrency(totalWithFixed);
    
    // Update the dashboard to reflect the new total including fixed expenses
    document.dispatchEvent(new Event('expensesUpdated'));
  }
  
  // Format currency
  function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount;
    if (isNaN(num)) return '$0.00';
    return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  // Format category name
  function formatCategory(category) {
    const categories = {
      'comida': 'Comida',
      'transporte': 'Transporte',
      'servicios': 'Servicios',
      'otros': 'Otros'
    };
    return categories[category] || category;
  }
  
  // Format currency input
  function formatCurrencyInput(e) {
    // Get the input value and cursor position
    let value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    // Remove all non-digit characters except the first decimal point
    let newValue = '';
    let decimalPointFound = false;
    
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char >= '0' && char <= '9') {
        newValue += char;
      } else if (char === '.' && !decimalPointFound) {
        newValue += '.';
        decimalPointFound = true;
      }
    }
    
    // If there's a decimal point, limit to 2 decimal places
    const decimalIndex = newValue.indexOf('.');
    if (decimalIndex !== -1) {
      const integerPart = newValue.substring(0, decimalIndex);
      let decimalPart = newValue.substring(decimalIndex + 1);
      
      // Limit to 2 decimal places
      if (decimalPart.length > 2) {
        decimalPart = decimalPart.substring(0, 2);
      }
      
      newValue = integerPart + (decimalPart ? '.' + decimalPart : '');
    }
    
    // Update the input value
    e.target.value = newValue;
    
    // Restore cursor position
    const positionChange = newValue.length - value.length;
    e.target.setSelectionRange(cursorPosition + positionChange, cursorPosition + positionChange);
  }
  
  // Format currency on blur
  function formatCurrencyOnBlur(e) {
    let value = e.target.value;
    if (value === '' || value === '.') {
      e.target.value = '0.00';
      return;
    }
    
    // If the value ends with a decimal point, add two zeros
    if (value.endsWith('.')) {
      e.target.value = value + '00';
      return;
    }
    
    // If there's no decimal point, add .00
    if (value.indexOf('.') === -1) {
      e.target.value = value + '.00';
      return;
    }
    
    // If there's a decimal point, ensure exactly 2 decimal places
    const parts = value.split('.');
    if (parts.length === 2) {
      if (parts[1].length === 0) {
        e.target.value = parts[0] + '.00';
      } else if (parts[1].length === 1) {
        e.target.value = parts[0] + '.' + parts[1] + '0';
      } else {
        e.target.value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
  }
  
  // Format currency on focus
  function formatCurrencyOnFocus(e) {
    let value = e.target.value.replace(/\./g, '').replace(',', '.');
    const number = parseFloat(value) || 0;
    e.target.value = number.toString().replace('.', ',');
  }
  
  // Save expenses to localStorage
  function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    // Dispatch event to notify other components
    document.dispatchEvent(new Event('expensesUpdated'));
  }
  
  // Load expenses from localStorage
  function loadExpenses() {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      expenses = JSON.parse(savedExpenses);
      renderExpenses();
    }
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      document.body.appendChild(notification);
      
      // Auto-remove notification after 3 seconds
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }
    
    notification.textContent = message;
    notification.className = `notification notification-${type} show`;
  }
  
  // Utility function to escape HTML
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Debounce function to limit the rate at which a function can fire
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Public API
  return {
    init,
    addExpense,
    updateExpense,
    deleteExpense,
    editExpense,
    renderExpenses
  };
})();

// Initialize the expenses module when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  Expenses.init();
});
