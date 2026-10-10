/**
 * dashboard.js — Dashboard page rendering
 *
 * Responsibilities:
 *  - Render the four stat cards (Today's Tasks, Pending, Completed, Productivity)
 *  - Render the task overview list on the dashboard
 *  - Update the header task-count badge
 *  - Provide shared helpers used by app.js for task item HTML and empty states:
 *      buildTaskItemHTML(task, context)
 *      attachTaskItemListeners(container)
 *      buildEmptyState(icon, heading, message)
 *
 * Depends on: tasks.js (must be loaded before this file)
 * Loaded before: analytics.js, ai-assistant.js, app.js
 */

// ================================================================
// STAT CARDS
// ================================================================

/**
 * Populate the four stat-card values on the dashboard page.
 */
function renderStatCards() {
  const stats = getStats();

  const todayEl        = document.getElementById('stat-today');
  const pendingEl      = document.getElementById('stat-pending');
  const completedEl    = document.getElementById('stat-completed');
  const productivityEl = document.getElementById('stat-productivity');

  if (todayEl)        todayEl.textContent        = stats.todayTasks.length;
  if (pendingEl)      pendingEl.textContent       = stats.pending.length;
  if (completedEl)    completedEl.textContent     = stats.completed.length;
  if (productivityEl) productivityEl.textContent  = stats.productivity + '%';
}

// ================================================================
// TASK COUNT BADGE (header)
// ================================================================

/**
 * Update the task-count badge in the app header.
 * Shows the number of incomplete tasks.
 */
function updateTaskCountBadge() {
  const badge = document.getElementById('task-count-badge');
  if (!badge) return;
  const pending = getAllTasks().filter(t => !t.completed).length;
  badge.textContent = pending + (pending === 1 ? ' task' : ' tasks');
}

// ================================================================
// SHARED HTML BUILDER HELPERS
// ================================================================

/**
 * Priority badge HTML.
 * @param {'high'|'medium'|'low'} priority
 * @returns {string}
 */
function buildPriorityBadge(priority) {
  const map = {
    high:   'bg-danger',
    medium: 'bg-warning text-dark',
    low:    'bg-success',
  };
  const cls = map[priority] || 'bg-secondary';
  const label = priority
    ? priority.charAt(0).toUpperCase() + priority.slice(1)
    : 'Medium';
  return `<span class="badge ${cls} ms-1">${label}</span>`;
}

/**
 * Build the HTML for a single task item row.
 * Used both on the dashboard and on the Tasks page.
 *
 * @param {Object} task     — task object from tasks.js
 * @param {string} context  — "dashboard" | "tasks"  (controls action buttons)
 * @returns {string} HTML string
 */
function buildTaskItemHTML(task, context) {
  const overdue    = isOverdue(task);
  const dueDateStr = task.dueDate ? formatDueDate(task.dueDate) : '';
  const dueBadge   = dueDateStr
    ? `<span class="badge ${overdue ? 'bg-danger' : 'bg-light text-muted border'} ms-1">
         <i class="bi bi-calendar2 me-1"></i>${dueDateStr}
       </span>`
    : '';

  const titleClass = task.completed ? 'text-decoration-line-through text-muted' : '';

  const editBtn = context !== 'dashboard'
    ? `<button class="btn btn-sm btn-outline-secondary task-edit-btn" data-id="${task.id}" title="Edit task">
         <i class="bi bi-pencil"></i>
       </button>`
    : '';

  const deleteBtn = `<button class="btn btn-sm btn-outline-danger task-delete-btn" data-id="${task.id}" title="Delete task">
    <i class="bi bi-trash"></i>
  </button>`;

  return `
    <div class="task-item d-flex align-items-start gap-2 py-2 border-bottom${task.completed ? ' opacity-75' : ''}">
      <div class="pt-1">
        <input
          type="checkbox"
          class="form-check-input task-toggle-check"
          data-id="${task.id}"
          ${task.completed ? 'checked' : ''}
          title="${task.completed ? 'Mark incomplete' : 'Mark complete'}"
        />
      </div>
      <div class="flex-grow-1 overflow-hidden">
        <div class="d-flex flex-wrap align-items-center gap-1">
          <span class="fw-semibold text-truncate ${titleClass}">${escapeHtml(task.title)}</span>
          ${buildPriorityBadge(task.priority)}
          ${dueBadge}
        </div>
        ${task.description
          ? `<div class="text-muted small text-truncate mt-1">${escapeHtml(task.description)}</div>`
          : ''}
      </div>
      <div class="d-flex gap-1 flex-shrink-0">
        ${editBtn}
        ${deleteBtn}
      </div>
    </div>`;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build an empty-state placeholder HTML block.
 * @param {string} icon     — Bootstrap icon class e.g. "bi-inbox"
 * @param {string} heading  — Short heading text
 * @param {string} message  — Longer description
 * @returns {string}
 */
function buildEmptyState(icon, heading, message) {
  return `
    <div class="text-center py-5 text-muted">
      <i class="bi ${icon} fs-1 d-block mb-2 opacity-50"></i>
      <div class="fw-semibold mb-1">${escapeHtml(heading)}</div>
      <small>${escapeHtml(message)}</small>
    </div>`;
}

/**
 * Attach event listeners for toggle, edit, and delete actions
 * to all task items inside the given container element.
 * Uses event delegation via direct child queries to avoid leaks.
 *
 * @param {HTMLElement} container
 */
function attachTaskItemListeners(container) {
  // Toggle completion
  container.querySelectorAll('.task-toggle-check').forEach(cb => {
    cb.addEventListener('change', function () {
      toggleTask(this.dataset.id);
      onTaskDataChanged();
    });
  });

  // Edit button (Tasks page only)
  container.querySelectorAll('.task-edit-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      openTaskModal(this.dataset.id);
    });
  });

  // Delete button
  container.querySelectorAll('.task-delete-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      openDeleteModal(this.dataset.id);
    });
  });
}

// ================================================================
// DASHBOARD PAGE RENDER
// ================================================================

/**
 * Main entry point: render all dashboard widgets.
 * Called by app.js when the Dashboard page is shown or data changes.
 */
function renderDashboard() {
  renderStatCards();
  updateTaskCountBadge();

  const container = document.getElementById('dashboard-task-list');
  if (!container) return;

  let list = getAllTasks();

  if (list.length === 0) {
    container.innerHTML = buildEmptyState(
      'bi-clipboard-plus',
      'No tasks yet',
      'Click "Add Task" to create your first task.'
    );
    return;
  }

  // Sort: incomplete first, then by due date (soonest first), then by priority
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return  1;
    return (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1);
  });

  // Show at most 8 tasks on the dashboard overview
  const preview = list.slice(0, 8);
  const overflow = list.length - preview.length;

  container.innerHTML =
    preview.map(t => buildTaskItemHTML(t, 'dashboard')).join('') +
    (overflow > 0
      ? `<div class="text-center pt-3 pb-1">
           <small class="text-muted">${overflow} more task${overflow !== 1 ? 's' : ''} — </small>
           <a href="#" class="small dash-view-all-link">View all</a>
         </div>`
      : '');

  attachTaskItemListeners(container);

  // "View all" link navigates to Tasks page
  const viewAllLink = container.querySelector('.dash-view-all-link');
  if (viewAllLink) {
    viewAllLink.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo('tasks');
    });
  }
}
