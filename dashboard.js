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
  const monthlyBudgetEl = document.getElementById('monthly-budget');
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
  function init() {
    // Set default date range (current month)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
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
    
    // Set initial date filter
    dateFilter = {
      from: firstDayOfMonth,
      to: lastDayOfMonth
    };
    
    // Add event listeners
    setupEventListeners();
    
    // Listen for updates from other modules
    document.addEventListener('expensesUpdated', loadExpenses);
    document.addEventListener('budgetUpdated', updateSummaryCards);
    
    // Load initial data
    loadExpenses();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    applyFilterBtn.addEventListener('click', applyDateFilter);
    
    // Update date inputs when they change
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
    
    // Listen for expense changes
    document.addEventListener('expensesUpdated', loadExpenses);
  }
  
  // Load expenses from the Expenses module
  function loadExpenses() {
    // Get expenses from localStorage
    const expensesData = localStorage.getItem('expenses');
    expenses = expensesData ? JSON.parse(expensesData) : [];
    
    // Filter expenses by date range
    filterExpensesByDate();
    
    // Update UI
    updateSummaryCards();
    updateChart();
    updateCategoriesBreakdown();
  }
  
  // Filter expenses by the selected date range
  function filterExpensesByDate() {
    const { from, to } = dateFilter;
    
    filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.fecha);
      return expenseDate >= from && expenseDate <= to;
    });
  }
  
  // Apply date filter
  function applyDateFilter() {
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
  
  // Reset date filter to current month
  function resetDateFilter() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    dateFromInput.valueAsDate = firstDayOfMonth;
    dateToInput.valueAsDate = lastDayOfMonth;
    
    dateFilter = {
      from: firstDayOfMonth,
      to: lastDayOfMonth
    };
    
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
    
    // Get fixed expenses
    const fixedExpenses = parseFloat(localStorage.getItem('fixedExpenses')) || 0;
    
    // Calculate totals (regular expenses + fixed expenses)
    const regularExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.monto), 0);
    const totalInPeriod = regularExpenses + fixedExpenses;
    
    // Calculate today's total (only regular expenses, fixed are monthly)
    const todayTotal = filteredExpenses
      .filter(exp => exp.fecha === today)
      .reduce((sum, exp) => sum + parseFloat(exp.monto), 0);
    
    // Calculate weekly total (only regular expenses, fixed are monthly)
    const weeklyTotal = filteredExpenses
      .filter(exp => new Date(exp.fecha) >= oneWeekAgo)
      .reduce((sum, exp) => sum + parseFloat(exp.monto), 0);
    
    // Get monthly budget from settings or use 0 if not set
    const monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
    const remainingBudget = Math.max(0, monthlyBudget - totalInPeriod);
    const budgetPercentage = monthlyBudget > 0 ? (totalInPeriod / monthlyBudget) * 100 : 0;
    
    // Update DOM
    monthlyTotalEl.textContent = formatCurrency(totalInPeriod);
    dailyTotalEl.textContent = formatCurrency(todayTotal);
    weeklyTotalEl.textContent = formatCurrency(weeklyTotal);
    
    if (monthlyBudget > 0) {
      remainingAmountEl.textContent = formatCurrency(remainingBudget);
      monthlyBudgetEl.textContent = `de ${formatCurrency(monthlyBudget)} presupuestados`;
      budgetProgressEl.textContent = `${budgetPercentage.toFixed(1)}% del presupuesto utilizado`;
      
      // Update progress bar color based on usage
      const progressBar = document.querySelector('.progress-bar');
      if (progressBar) {
        const percentage = Math.min(100, budgetPercentage);
        progressBar.style.width = `${percentage}%`;
        progressBar.style.backgroundColor = getBudgetColor(budgetPercentage);
      }
    } else {
      remainingAmountEl.textContent = '-';
      monthlyBudgetEl.textContent = 'Sin límite establecido';
      budgetProgressEl.textContent = '';
    }
  }
  
  // Update the chart with current data
  function updateChart() {
    if (!chartCtx) return;
    
    // Clear previous chart
    if (chart) {
      chart.destroy();
      chart = null;
    }
    
    // Handle no data state
    if (filteredExpenses.length === 0) {
      // Create a minimal doughnut chart with gray background
      chart = new Chart(chartCtx, {
        type: 'doughnut',
        data: {
          labels: ['No Data'],
          datasets: [{
            data: [100],
            backgroundColor: ['rgba(220, 220, 220, 0.3)'],
            borderWidth: 0,
            hoverBackgroundColor: ['rgba(200, 200, 200, 0.4)']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '85%',
          radius: '100%',
          rotation: -90, // Start from top
          circumference: 360, // Full circle
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          animation: {
            animateScale: true,
            animateRotate: true
          },
          elements: {
            arc: {
              borderWidth: 0
            }
          }
        },
        plugins: [{
          id: 'no-data-text',
          afterDraw(chart) {
            const { ctx, chartArea: { left, right, top, bottom, width, height } } = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            
            // Add "No Data" text
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '14px Nunito Sans, sans-serif';
            ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
            ctx.fillText('No Data', centerX, centerY);
            ctx.restore();
          }
        }]
      });
      return;
    }
    
    // Group expenses by category
    const categoryTotals = {};
    
    // Calculate total for each category
    filteredExpenses.forEach(expense => {
      const category = expense.categoria || 'otros';
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += parseFloat(expense.monto);
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
        rotation: -90, // Start from top
        circumference: 360, // Full circle
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
        elements: {
          arc: {
            borderWidth: 0
          }
        },
        layout: {
          padding: 10
        }
      },
      plugins: [{
        id: 'center-text',
        afterDraw(chart) {
          if (filteredExpenses.length > 0) {
            const { ctx, chartArea: { left, right, top, bottom, width, height } } = chart;
            const centerX = (left + right) / 2;
            const centerY = (top + bottom) / 2;
            
            // Calculate total
            const total = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.monto), 0);
            
            // Add total amount
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 16px Nunito Sans, sans-serif';
            ctx.fillStyle = '#333';
            ctx.fillText(formatCurrency(total, true), centerX, centerY - 10);
            
            // Add "Total" label
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
      const amount = parseFloat(expense.monto);
      
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
    if (isNaN(amount)) return skipSymbol ? '0.00' : '$0.00';
    
    // Convert to number if it's a string
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return skipSymbol ? '0.00' : '$0.00';
    
    // Format with 2 decimal places and commas as thousand separators
    const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return skipSymbol ? formatted : '$' + formatted;
  }
  
  // Helper function to get budget color based on percentage
  function getBudgetColor(percentage) {
    if (percentage < 60) return '#4bb543'; // Green
    if (percentage < 90) return '#f9c74f'; // Yellow
    return '#ef476f'; // Red
  }
  
  // Public API
  return {
    init,
    loadExpenses
  };
})();

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load Chart.js
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = Dashboard.init;
  document.head.appendChild(script);
  
  // Load Font Awesome for icons
  const fontAwesome = document.createElement('link');
  fontAwesome.rel = 'stylesheet';
  fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
  document.head.appendChild(fontAwesome);
});
