// Dashboard Module
const Dashboard = (() => {
  // DOM Elements
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const applyFilterBtn = document.getElementById('apply-filter');
  const monthlyTotalEl = document.getElementById('monthly-total');
  const dailyTotalEl = document.getElementById('daily-total');
  const weeklyTotalEl = document.getElementById('weekly-total');
  const remainingAmountEl = document.getElementById('remaining-amount');
  const monthlyBudgetEl = document.getElementById('monthly-budget-text');
  const budgetProgressEl = document.getElementById('budget-progress');
  const chartCtx = document.getElementById('expenses-chart')?.getContext('2d');
  const chartLegend = document.getElementById('chart-legend');
  const categoriesTbody = document.getElementById('categories-tbody');
  
  // State
  let chart = null;
  let expenses = [];
  let filteredExpenses = [];
  let dateFilter = {
    from: null,
    to: null
  };
  let unsubscribeExpenses = null;
  let unsubscribeConfig = null;
  let currentUserId = null;
  let monthlyBudget = 0;
  let fixedExpenses = 0;
  let spendingLimit = 0;
  
  // Category colors for the chart
  const categoryColors = {
    comida: '#4361ee',
    transporte: '#3f37c9',
    servicios: '#4cc9f0',
    ocio: '#7209b7',
    salud: '#4bb543',
    otros: '#f72585',
    default: '#6c757d'
  };
  
  // Initialize the dashboard
  function init(userId) {
    if (!userId) {
      console.error('No user ID provided to Dashboard.init()');
      return;
    }
    
    currentUserId = userId;
    console.log('Initializing Dashboard for user:', userId);
    
    // Set default date range (current month)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    if (dateFromInput) {
      dateFromInput.valueAsDate = firstDayOfMonth;
      dateToInput.valueAsDate = lastDayOfMonth;
      
      // Set max date to today
      const todayStr = today.toISOString().split('T')[0];
      dateFromInput.max = todayStr;
      dateToInput.max = todayStr;
      
      // Set min date to 1 year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
      dateFromInput.min = oneYearAgoStr;
      dateToInput.min = oneYearAgoStr;
    }
    
    // Set initial date filter
    dateFilter = {
      from: firstDayOfMonth,
      to: lastDayOfMonth
    };
    
    // Add event listeners
    setupEventListeners();
    
    // Setup real-time listeners
    setupExpensesListener();
    setupConfigListener();
    
    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => {
        console.log('Chart.js loaded');
        updateChart();
      };
      document.head.appendChild(script);
    }
  }
  
  // Set up event listeners
  function setupEventListeners() {
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', applyDateFilter);
    }
    
    // Update date inputs when they change
    if (dateFromInput && dateToInput) {
      dateFromInput.addEventListener('change', () => {
        if (new Date(dateFromInput.value) > new Date(dateToInput.value)) {
          dateToInput.value = dateFromInput.value;
        }
      });
      
      dateToInput.addEventListener('change', () => {
        if (new Date(dateToInput.value) < new Date(dateFromInput.value)) {
          dateFromInput.value = dateToInput.value;
        }
      });
    }
    
    // Listen for expense changes from other modules
    document.addEventListener('expensesUpdated', () => {
      console.log('Expenses updated event received');
      updateSummaryCards();
    });
    
    // Listen for budget updates
    document.addEventListener('budgetUpdated', () => {
      console.log('Budget updated event received');
      updateSummaryCards();
    });
    
    // Listen for fixed expenses updates
    document.addEventListener('fixedExpensesUpdated', () => {
      console.log('Fixed expenses updated event received');
      updateSummaryCards();
    });
  }
  
  // Setup real-time listener for expenses from Firestore
  async function setupExpensesListener() {
    if (!currentUserId) {
      console.error('Cannot setup expenses listener: no user ID');
      return;
    }
    
    // Unsubscribe from previous listener if exists
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
    }
    
    try {
      // Dynamically import Firebase functions
      const { getExpensesCollection, onSnapshot, query, orderBy } = await import('./firebase-config.js');
      
      const expensesCollection = getExpensesCollection(currentUserId);
      const expensesQuery = query(expensesCollection, orderBy('fecha', 'desc'));
      
      unsubscribeExpenses = onSnapshot(expensesQuery, 
        (querySnapshot) => {
          expenses = [];
          querySnapshot.forEach((doc) => {
            expenses.push({ 
              id: doc.id, 
              ...doc.data() 
            });
          });
          console.log('Dashboard: Expenses loaded:', expenses.length);
          
          // Filter and update UI
          filterExpensesByDate();
          updateSummaryCards();
          updateChart();
          updateCategoriesBreakdown();
        },
        (error) => {
          console.error('Error getting expenses:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up expenses listener:', error);
    }
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
            monthlyBudget = data.monthlyBudget || 0;
            fixedExpenses = data.fixedExpenses || 0;
            spendingLimit = data.spendingLimit || 0;
            
            console.log('Dashboard: Config loaded:', { monthlyBudget, fixedExpenses, spendingLimit });
            
            // Update UI
            updateSummaryCards();
          } else {
            console.log('Dashboard: No config document found');
            monthlyBudget = 0;
            fixedExpenses = 0;
            spendingLimit = 0;
          }
        },
        (error) => {
          console.error('Error getting config:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up config listener:', error);
    }
  }
  
  // Filter expenses by the selected date range
  function filterExpensesByDate() {
    const { from, to } = dateFilter;
    
    filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.fecha + 'T00:00:00');
      return expenseDate >= from && expenseDate <= to;
    });
    
    console.log('Filtered expenses:', filteredExpenses.length);
  }
  
  // Apply date filter
  function applyDateFilter() {
    if (!dateFromInput || !dateToInput) return;
    
    dateFilter = {
      from: new Date(dateFromInput.value),
      to: new Date(dateToInput.value)
    };
    
    // Reset time to start/end of day
    dateFilter.from.setHours(0, 0, 0, 0);
    dateFilter.to.setHours(23, 59, 59, 999);
    
    filterExpensesByDate();
    updateSummaryCards();
    updateChart();
    updateCategoriesBreakdown();
  }
  
  // Update summary cards with current data
  function updateSummaryCards() {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Calculate totals (regular expenses + fixed expenses)
    const regularExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.monto || 0), 0);
    const totalInPeriod = regularExpenses + fixedExpenses;
    
    // Calculate today's total (only regular expenses, fixed are monthly)
    const todayTotal = filteredExpenses
      .filter(exp => exp.fecha === today)
      .reduce((sum, exp) => sum + parseFloat(exp.monto || 0), 0);
    
    // Calculate weekly total (only regular expenses, fixed are monthly)
    const weeklyTotal = filteredExpenses
      .filter(exp => new Date(exp.fecha + 'T00:00:00') >= oneWeekAgo)
      .reduce((sum, exp) => sum + parseFloat(exp.monto || 0), 0);
    
    // Calculate remaining budget
    const remainingBudget = Math.max(0, monthlyBudget - totalInPeriod);
    const budgetPercentage = monthlyBudget > 0 ? (totalInPeriod / monthlyBudget) * 100 : 0;
    
    // Update DOM
    if (monthlyTotalEl) monthlyTotalEl.textContent = formatCurrency(totalInPeriod);
    if (dailyTotalEl) dailyTotalEl.textContent = formatCurrency(todayTotal);
    if (weeklyTotalEl) weeklyTotalEl.textContent = formatCurrency(weeklyTotal);
    
    if (monthlyBudget > 0) {
  if (remainingAmountEl) remainingAmountEl.textContent = formatCurrency(remainingBudget);
  if (monthlyBudgetEl) monthlyBudgetEl.textContent = `de ${formatCurrency(monthlyBudget)} presupuestados`;
  if (budgetProgressEl) budgetProgressEl.textContent = `${budgetPercentage.toFixed(1)}% del presupuesto utilizado`;
  
  // Update progress bar color based on usage
  const progressBar = document.querySelector('.progress-bar');
  if (progressBar) {
    const percentage = Math.min(100, budgetPercentage);
    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor = getBudgetColor(budgetPercentage);
  }
} else {
  if (remainingAmountEl) remainingAmountEl.textContent = '-';
  if (monthlyBudgetEl) monthlyBudgetEl.textContent = 'Sin límite establecido';
  if (budgetProgressEl) budgetProgressEl.textContent = '';
}
    
    // Check spending limit and show alert if needed
    checkSpendingLimit(totalInPeriod);
  }
  
  // Check spending limit and show callout
  function checkSpendingLimit(totalSpent) {
    const callout = document.getElementById('dashboard-callout');
    
    if (!callout || spendingLimit <= 0) {
      if (callout) callout.style.display = 'none';
      return;
    }
    
    const percentage = (totalSpent / spendingLimit) * 100;
    
    if (percentage >= 80) {
      let message = '';
      let className = 'callout-warning';
      
      if (percentage >= 100) {
        message = `🚨 ¡Límite excedido! Has gastado ${formatCurrency(totalSpent)} de tu límite de ${formatCurrency(spendingLimit)}`;
        className = 'callout-danger';
      } else if (percentage >= 90) {
        message = `⚠️ Cuidado: Estás muy cerca del límite. Has gastado el ${percentage.toFixed(1)}% (${formatCurrency(totalSpent)} de ${formatCurrency(spendingLimit)})`;
        className = 'callout-warning';
      } else {
        message = `⚠️ Atención: Has gastado el ${percentage.toFixed(1)}% de tu límite mensual (${formatCurrency(totalSpent)} de ${formatCurrency(spendingLimit)})`;
        className = 'callout-info';
      }
      
      callout.textContent = message;
      callout.className = `callout ${className}`;
      callout.style.display = 'block';
    } else {
      callout.style.display = 'none';
    }
  }
  
  // Update the chart with current data
  function updateChart() {
    if (!chartCtx || typeof Chart === 'undefined') {
      console.log('Chart.js not ready yet');
      return;
    }
    
    // Clear previous chart
    if (chart) {
      chart.destroy();
      chart = null;
    }
    
    // Handle no data state
    if (filteredExpenses.length === 0) {
      chart = new Chart(chartCtx, {
        type: 'doughnut',
        data: {
          labels: ['Sin datos'],
          datasets: [{
            data: [100],
            backgroundColor: ['rgba(220, 220, 220, 0.3)'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '85%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        },
        plugins: [{
          id: 'no-data-text',
          afterDraw(chart) {
            const { ctx, chartArea: { left, right, top, bottom } } = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '14px Nunito Sans, sans-serif';
            ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
            ctx.fillText('Sin datos', centerX, centerY);
            ctx.restore();
          }
        }]
      });
      
      if (chartLegend) chartLegend.innerHTML = '';
      return;
    }
    
    // Group expenses by category
    const categoryTotals = {};
    
    filteredExpenses.forEach(expense => {
      const category = expense.categoria || 'otros';
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += parseFloat(expense.monto || 0);
    });
    
    // Convert to arrays for Chart.js
    const categories = Object.keys(categoryTotals);
    const data = categories.map(category => categoryTotals[category]);
    const backgroundColors = categories.map(category => categoryColors[category] || categoryColors.default);
    
    // Create new doughnut chart
    chart = new Chart(chartCtx, {
      type: 'doughnut',
      data: {
        labels: categories.map(cat => formatCategory(cat)),
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          hoverOffset: 8,
          borderRadius: 4,
          spacing: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '85%',
        radius: '100%',
        rotation: -90,
        circumference: 360,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        },
        layout: {
          padding: 10
        }
      },
      plugins: [{
        id: 'center-text',
        afterDraw(chart) {
          if (filteredExpenses.length > 0) {
            const { ctx, chartArea: { left, right, top, bottom } } = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            
            const total = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.monto || 0), 0);
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 16px Nunito Sans, sans-serif';
            ctx.fillStyle = '#333';
            ctx.fillText(formatCurrency(total, true), centerX, centerY - 10);
            
            ctx.font = '12px Nunito Sans, sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText('Total', centerX, centerY + 12);
            ctx.restore();
          }
        }
      }]
    });
    
    // Update legend
    updateChartLegend(categories);
  }
  
  // Update the chart legend
  function updateChartLegend(categories) {
    if (!chartLegend) return;
    
    chartLegend.innerHTML = categories.map(category => {
      const color = categoryColors[category] || categoryColors.default;
      return `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${color}"></span>
          <span>${formatCategory(category)}</span>
        </div>
      `;
    }).join('');
  }
  
  // Update the categories breakdown table
  function updateCategoriesBreakdown() {
    if (!categoriesTbody) return;
    
    // Group expenses by category
    const categories = {};
    let totalAmount = 0;
    
    filteredExpenses.forEach(expense => {
      const category = expense.categoria || 'otros';
      const amount = parseFloat(expense.monto || 0);
      
      if (!categories[category]) {
        categories[category] = 0;
      }
      
      categories[category] += amount;
      totalAmount += amount;
    });
    
    // Convert to array and sort by amount (descending)
    const sortedCategories = Object.entries(categories)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Update table
    if (sortedCategories.length === 0) {
      categoriesTbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">No hay gastos en el período seleccionado</td>
        </tr>
      `;
      return;
    }
    
    categoriesTbody.innerHTML = sortedCategories.map(category => {
      const color = categoryColors[category.name] || categoryColors.default;
      return `
        <tr>
          <td>${formatCategory(category.name)}</td>
          <td>${formatCurrency(category.amount)}</td>
          <td>${category.percentage.toFixed(1)}%</td>
          <td>
            <div class="progress-bar-container">
              <div 
                class="progress-bar" 
                style="width: ${category.percentage}%; background-color: ${color}"
              ></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // Helper function to format category names
  function formatCategory(category) {
    if (!category) return 'Sin categoría';
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
  
  // Helper function to format currency
  function formatCurrency(amount, skipSymbol = false) {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return skipSymbol ? '0.00' : '$0.00';
    }
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return skipSymbol ? '0.00' : '$0.00';
    
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return skipSymbol ? formatted : '$' + formatted;
  }
  
  // Helper function to get budget color based on percentage
  function getBudgetColor(percentage) {
    if (percentage < 60) return '#4bb543'; // Green
    if (percentage < 90) return '#f9c74f'; // Yellow
    return '#ef476f'; // Red
  }
  
  // Cleanup function
  function cleanup() {
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }
    if (unsubscribeConfig) {
      unsubscribeConfig();
      unsubscribeConfig = null;
    }
    if (chart) {
      chart.destroy();
      chart = null;
    }
    expenses = [];
    filteredExpenses = [];
    currentUserId = null;
    monthlyBudget = 0;
    fixedExpenses = 0;
    spendingLimit = 0;
  }
  
  // Public API
  return {
    init,
    cleanup
  };
})();

// Initialize the dashboard when the user is logged in
document.addEventListener('userLoggedIn', (e) => {
  console.log('User logged in, initializing Dashboard:', e.detail.user.uid);
  Dashboard.init(e.detail.user.uid);
});

// Cleanup when user logs out
document.addEventListener('userLoggedOut', () => {
  console.log('User logged out, cleaning up Dashboard');
  Dashboard.cleanup();
});