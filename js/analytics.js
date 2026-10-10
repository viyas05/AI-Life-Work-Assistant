/**
 * analytics.js — Analytics page with Chart.js charts
 *
 * Responsibilities:
 *  - Task Completion over the last 7 days (line chart)
 *  - Priority breakdown (doughnut chart)
 *  - Completion rate, streak, total completed metrics
 *
 * Depends on: tasks.js, Chart.js CDN
 *
 * NOTE: Completion history is derived from completedAt timestamps stored
 * in localStorage. If tasks were completed before this app was installed,
 * or on a different device, those completions will not appear.
 * Streak is estimated from available local history.
 */

// Chart instances — kept to allow clean destroy/re-init on refresh
let completionChart = null;
let priorityChart   = null;

/**
 * Main entry point: render all analytics widgets.
 * Called when the Analytics page becomes visible and after task changes.
 */
function renderAnalytics() {
  renderCompletionChart();
  renderPriorityChart();
  renderAnalyticsSummary();
}

// ================================================================
// COMPLETION LINE CHART — last 7 days
// ================================================================

/**
 * Build an array of the last 7 days as "YYYY-MM-DD" strings.
 */
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

/**
 * Count how many tasks were completed on each of the last 7 days.
 * Uses the completedAt timestamp stored on each task.
 */
function getCompletionCountsPerDay(days) {
  const all = getAllTasks();
  return days.map(day => {
    return all.filter(t => {
      if (!t.completedAt) return false;
      // Extract date portion of the ISO timestamp in LOCAL time
      const dt = new Date(t.completedAt);
      const yyyy = dt.getFullYear();
      const mm   = String(dt.getMonth() + 1).padStart(2, '0');
      const dd   = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}` === day;
    }).length;
  });
}

/**
 * Render (or update) the task-completion line chart.
 */
function renderCompletionChart() {
  const canvas = document.getElementById('chart-completion');
  if (!canvas) return;

  const days   = getLast7Days();
  const counts = getCompletionCountsPerDay(days);

  // Friendly day labels e.g. "Mon 3"
  const labels = days.map(d => {
    const [y, m, day] = d.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  });

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#8896ab' : '#5a6474';

  if (completionChart) {
    completionChart.destroy();
    completionChart = null;
  }

  completionChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Tasks Completed',
        data: counts,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.10)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#0d6efd',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: labelColor,
            font: { size: 11 },
            stepSize: 1,
            precision: 0
          },
          grid: { color: gridColor }
        }
      }
    }
  });
}

// ================================================================
// PRIORITY DOUGHNUT CHART
// ================================================================

/**
 * Render (or update) the priority breakdown doughnut chart.
 */
function renderPriorityChart() {
  const canvas = document.getElementById('chart-priority');
  if (!canvas) return;

  const all = getAllTasks();
  const highCount   = all.filter(t => t.priority === 'high').length;
  const mediumCount = all.filter(t => t.priority === 'medium').length;
  const lowCount    = all.filter(t => t.priority === 'low').length;

  if (priorityChart) {
    priorityChart.destroy();
    priorityChart = null;
  }

  // If no tasks, show a placeholder
  const isEmpty = all.length === 0;

  priorityChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: isEmpty ? ['No tasks yet'] : ['High', 'Medium', 'Low'],
      datasets: [{
        data: isEmpty ? [1] : [highCount, mediumCount, lowCount],
        backgroundColor: isEmpty
          ? ['#e5e7eb']
          : ['#dc3545', '#fd7e14', '#198754'],
        borderWidth: 2,
        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1c2130' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#8896ab' : '#5a6474',
            font: { size: 12 },
            padding: 16
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => isEmpty
              ? ' No tasks'
              : ` ${ctx.label}: ${ctx.raw} task${ctx.raw !== 1 ? 's' : ''}`
          }
        }
      }
    }
  });
}

// ================================================================
// SUMMARY METRICS
// ================================================================

/**
 * Calculate the consecutive-day completion streak.
 * A "day" counts if at least one task was completed that day.
 * Streak ends as soon as a day (going backwards from today) has 0 completions.
 *
 * NOTE: This is estimated from locally-stored completedAt data only.
 */
function calculateStreak() {
  const all = getAllTasks().filter(t => t.completedAt);
  if (all.length === 0) return 0;

  // Collect all unique completion dates
  const completedDates = new Set(
    all.map(t => {
      const dt = new Date(t.completedAt);
      return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    })
  );

  let streak = 0;
  const check = new Date();

  // Start from today; go backwards while dates exist
  for (let i = 0; i < 365; i++) {
    const yyyy = check.getFullYear();
    const mm   = String(check.getMonth() + 1).padStart(2, '0');
    const dd   = String(check.getDate()).padStart(2, '0');
    const key  = `${yyyy}-${mm}-${dd}`;

    if (completedDates.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Update the three summary metric boxes.
 */
function renderAnalyticsSummary() {
  const stats = getStats();

  const rateEl = document.getElementById('analytics-completion-rate');
  if (rateEl) rateEl.textContent = stats.productivity + '%';

  const streakEl = document.getElementById('analytics-streak');
  if (streakEl) {
    const s = calculateStreak();
    streakEl.textContent = s === 0 ? '—' : `${s} day${s !== 1 ? 's' : ''}`;
  }

  const totalEl = document.getElementById('analytics-total-completed');
  if (totalEl) totalEl.textContent = stats.completed.length;
}
