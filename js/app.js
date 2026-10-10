/**
 * app.js — Application bootstrap and orchestration
 *
 * Responsibilities:
 *  - Page navigation (SPA-style section switching)
 *  - Header date display
 *  - Light / dark theme toggle
 *  - Task modal (add + edit)
 *  - Delete confirmation modal
 *  - Task list page rendering and filter/search
 *  - Toast notification helper
 *  - Mobile sidebar toggle
 *  - Global "onTaskDataChanged" hook used by all modules
 *
 * Depends on: tasks.js, dashboard.js, analytics.js, ai-assistant.js
 * Must be loaded LAST.
 */

// ================================================================
// NAVIGATION
// ================================================================

const PAGES = {
  dashboard: { sectionId: 'page-dashboard', title: 'Dashboard' },
  tasks:     { sectionId: 'page-tasks',     title: 'Tasks' },
  assistant: { sectionId: 'page-assistant', title: 'AI Assistant' },
  analytics: { sectionId: 'page-analytics', title: 'Analytics' },
};

let currentPage = 'dashboard';

/**
 * Show the named page and update the sidebar active state.
 * @param {string} pageName
 */
function navigateTo(pageName) {
  if (!PAGES[pageName]) pageName = 'dashboard';

  // Hide all sections
  Object.values(PAGES).forEach(p => {
    const el = document.getElementById(p.sectionId);
    if (el) el.style.display = 'none';
  });

  // Show target section
  const target = document.getElementById(PAGES[pageName].sectionId);
  if (target) target.style.display = '';

  // Update sidebar active link
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  // Update header title
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = PAGES[pageName].title;

  currentPage = pageName;

  // Page-specific initialization
  if (pageName === 'dashboard') renderDashboard();
  if (pageName === 'tasks')     renderTaskList();
  if (pageName === 'analytics') renderAnalytics();
  if (pageName === 'assistant') initAssistant();

  // Close mobile sidebar if open
  closeMobileSidebar();
}

// ================================================================
// GLOBAL REFRESH HOOK
// ================================================================

/**
 * Called after any task mutation (add / edit / delete / toggle).
 * Refreshes whichever page is currently visible + common widgets.
 */
function onTaskDataChanged() {
  updateTaskCountBadge();
  if (currentPage === 'dashboard') renderDashboard();
  if (currentPage === 'tasks')     renderTaskList();
  if (currentPage === 'analytics') renderAnalytics();
}

// ================================================================
// TASK LIST PAGE
// ================================================================

let currentFilter = 'all';
let currentSearch = '';

/**
 * Render the Tasks page list, applying the active filter and search query.
 */
function renderTaskList() {
  const container = document.getElementById('task-list-container');
  if (!container) return;

  let list = getAllTasks();
  list = filterTasks(list, currentFilter);
  list = searchTasks(list, currentSearch);

  if (list.length === 0) {
    let msg = 'No tasks match your filter.';
    if (currentFilter === 'all' && !currentSearch) {
      msg = 'No tasks yet. Click "New Task" to get started.';
    } else if (currentFilter === 'completed') {
      msg = 'No completed tasks yet.';
    } else if (currentFilter === 'overdue') {
      msg = 'No overdue tasks — great job!';
    } else if (currentFilter === 'today') {
      msg = 'Nothing due today.';
    }

    container.innerHTML = buildEmptyState('bi-inbox', 'Nothing here', msg);
    return;
  }

  // Sort same as dashboard: incomplete first, by due date, then priority
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1);
  });

  container.innerHTML = list.map(t => buildTaskItemHTML(t, 'tasks')).join('');
  attachTaskItemListeners(container);
}

// ================================================================
// TASK MODAL (Add / Edit)
// ================================================================

let taskModal = null; // Bootstrap modal instance

/**
 * Open the task modal.
 * @param {string|null} taskId — if provided, fills the form for editing
 */
function openTaskModal(taskId = null) {
  const form        = document.getElementById('task-form');
  const titleInput  = document.getElementById('task-title');
  const descInput   = document.getElementById('task-desc');
  const prioritySel = document.getElementById('task-priority');
  const dueInput    = document.getElementById('task-due');
  const idInput     = document.getElementById('task-id');
  const modalTitle  = document.getElementById('taskModalLabel');

  // Reset validation state
  form.classList.remove('was-validated');

  if (taskId) {
    const task = getTaskById(taskId);
    if (!task) return;
    idInput.value       = task.id;
    titleInput.value    = task.title;
    descInput.value     = task.description;
    prioritySel.value   = task.priority;
    dueInput.value      = task.dueDate;
    modalTitle.textContent = 'Edit Task';
  } else {
    idInput.value       = '';
    titleInput.value    = '';
    descInput.value     = '';
    prioritySel.value   = 'medium';
    dueInput.value      = '';
    modalTitle.textContent = 'Add Task';
  }

  taskModal.show();
}

/**
 * Save a task from the modal form (handles both add and edit).
 */
function saveTaskFromModal() {
  const form        = document.getElementById('task-form');
  const titleInput  = document.getElementById('task-title');
  const idInput     = document.getElementById('task-id');

  // HTML5 validation
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const data = {
    title:       document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    priority:    document.getElementById('task-priority').value,
    dueDate:     document.getElementById('task-due').value,
  };

  const id = idInput.value;
  if (id) {
    // Edit existing
    const result = updateTask(id, data);
    if (result) {
      showToast('Task updated successfully.', 'success');
    }
  } else {
    // New task
    try {
      addTask(data);
      showToast('Task added successfully.', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
      return;
    }
  }

  taskModal.hide();
  onTaskDataChanged();
}

// ================================================================
// DELETE MODAL
// ================================================================

let deleteModal     = null; // Bootstrap modal instance
let pendingDeleteId = null;

/**
 * Open the delete confirmation modal for the given task id.
 * @param {string} taskId
 */
function openDeleteModal(taskId) {
  pendingDeleteId = taskId;
  deleteModal.show();
}

// ================================================================
// TOAST NOTIFICATIONS
// ================================================================

let toastInstance = null;

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'danger'|'info'|'warning'} type
 */
function showToast(message, type = 'info') {
  const toastEl  = document.getElementById('app-toast');
  const msgEl    = document.getElementById('toast-message');

  if (!toastEl || !msgEl) return;

  // Set color class
  toastEl.className = 'toast align-items-center border-0 text-white';
  const colorMap = { success: 'bg-success', danger: 'bg-danger', info: 'bg-primary', warning: 'bg-warning' };
  toastEl.classList.add(colorMap[type] || 'bg-primary');
  if (type === 'warning') toastEl.classList.replace('text-white', 'text-dark');

  msgEl.textContent = message;

  if (!toastInstance) {
    toastInstance = new bootstrap.Toast(toastEl, { delay: 3500 });
  }
  toastInstance.show();
}

// ================================================================
// THEME TOGGLE
// ================================================================

/**
 * Apply the given theme ("light" or "dark") and persist it.
 * @param {string} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('aiAssistant_theme', theme);

  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  }

  // Re-render charts so they pick up new colours
  if (currentPage === 'analytics') renderAnalytics();
}

// ================================================================
// MOBILE SIDEBAR
// ================================================================

function closeMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('visible');
}

// ================================================================
// DATE DISPLAY
// ================================================================

function updateDateDisplay() {
  const el = document.getElementById('current-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ================================================================
// BOOTSTRAP + EVENT BINDING
// ================================================================

document.addEventListener('DOMContentLoaded', function () {

  // ---- Bootstrap modal instances ----
  taskModal   = new bootstrap.Modal(document.getElementById('taskModal'));
  deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

  // ---- Date in header ----
  updateDateDisplay();

  // ---- Sidebar navigation ----
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigateTo(this.dataset.page);
    });
  });

  // ---- Dashboard "Add Task" button ----
  document.getElementById('dash-add-task-btn').addEventListener('click', function () {
    openTaskModal();
  });

  // ---- Tasks page "New Task" button ----
  document.getElementById('add-task-btn').addEventListener('click', function () {
    openTaskModal();
  });

  // ---- Save task button inside modal ----
  document.getElementById('save-task-btn').addEventListener('click', saveTaskFromModal);

  // Also allow Enter key to submit the form within the modal
  document.getElementById('task-form').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      saveTaskFromModal();
    }
  });

  // ---- Confirm delete button ----
  document.getElementById('confirm-delete-btn').addEventListener('click', function () {
    if (pendingDeleteId) {
      const ok = deleteTask(pendingDeleteId);
      if (ok) showToast('Task deleted.', 'info');
      pendingDeleteId = null;
      deleteModal.hide();
      onTaskDataChanged();
    }
  });

  // ---- Filter buttons on Tasks page ----
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTaskList();
    });
  });

  // ---- Search input ----
  document.getElementById('task-search').addEventListener('input', function () {
    currentSearch = this.value;
    renderTaskList();
  });

  // ---- Theme toggle ----
  document.getElementById('theme-toggle').addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ---- Mobile sidebar toggle ----
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar       = document.getElementById('sidebar');

  // Create overlay element dynamically
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  sidebarToggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay.addEventListener('click', closeMobileSidebar);

  // ---- Restore saved theme ----
  const savedTheme = localStorage.getItem('aiAssistant_theme') || 'light';
  applyTheme(savedTheme);

  // ---- Initial render ----
  navigateTo('dashboard');
});
