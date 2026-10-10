/**
 * tasks.js — Task data layer
 *
 * Responsibilities:
 *  - CRUD operations: create, read, update, delete tasks
 *  - Persistence: every change is saved to localStorage immediately
 *  - Filtering and search helpers
 *  - Sample-data seeding (first launch only)
 *
 * All task objects have this shape:
 * {
 *   id:          string  — unique identifier (timestamp-based)
 *   title:       string  — required
 *   description: string  — optional
 *   priority:    "high" | "medium" | "low"
 *   dueDate:     string  — "YYYY-MM-DD" local date, or ""
 *   completed:   boolean
 *   createdAt:   string  — ISO timestamp
 *   completedAt: string | null — ISO timestamp when completed
 * }
 */

// ---- Storage key ----
const STORAGE_KEY = 'aiAssistant_tasks';
const SEEDED_KEY  = 'aiAssistant_seeded';

/**
 * Load all tasks from localStorage.
 * Returns an empty array on any parse error.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('tasks.js: Could not read localStorage.', err);
    return [];
  }
}

/**
 * Persist the full task array to localStorage.
 * @param {Array} tasks
 */
function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn('tasks.js: Could not write to localStorage.', err);
    // showToast is defined in app.js which loads after tasks.js;
    // guard against it not being available yet.
    if (typeof showToast === 'function') {
      showToast('Storage error — changes may not persist.', 'danger');
    }
  }
}

/**
 * Generate a unique ID using the current timestamp + random suffix.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Return today's date as a "YYYY-MM-DD" string in LOCAL time.
 * Avoids the UTC-shift bug that Date.toISOString() can cause.
 */
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---- In-memory task list (single source of truth) ----
let tasks = loadTasks();

// ---- Seed sample tasks on first launch ----
(function seedSampleTasks() {
  if (localStorage.getItem(SEEDED_KEY)) return; // already seeded

  const today = todayString();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const tomorrow = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const nextWeek = (() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  const samples = [
    {
      id: generateId(), title: 'Review project proposal',
      description: 'Go through the Q3 proposal deck and add comments.',
      priority: 'high', dueDate: today,
      completed: false, createdAt: new Date().toISOString(), completedAt: null
    },
    {
      id: generateId(), title: 'Set up weekly stand-up meeting',
      description: 'Schedule recurring calendar event with the team.',
      priority: 'medium', dueDate: tomorrow,
      completed: false, createdAt: new Date().toISOString(), completedAt: null
    },
    {
      id: generateId(), title: 'Read IBM SkillsBuild documentation',
      description: 'Explore the AI and Cloud modules available on IBM SkillsBuild.',
      priority: 'low', dueDate: nextWeek,
      completed: false, createdAt: new Date().toISOString(), completedAt: null
    },
    {
      id: generateId(), title: 'Prepare demo script',
      description: 'Write a short walkthrough for the portfolio demo.',
      priority: 'high', dueDate: tomorrow,
      completed: true,  createdAt: new Date().toISOString(), completedAt: new Date().toISOString()
    },
    {
      id: generateId(), title: 'Update LinkedIn profile',
      description: 'Add recent IBM SkillsBuild certificate and new project.',
      priority: 'medium', dueDate: nextWeek,
      completed: false, createdAt: new Date().toISOString(), completedAt: null
    },
    {
      id: generateId(), title: 'Submit expense report',
      description: '',
      priority: 'high', dueDate: yesterday,
      completed: false, createdAt: new Date().toISOString(), completedAt: null
    },
  ];

  tasks = samples;
  saveTasks(tasks);
  localStorage.setItem(SEEDED_KEY, '1');
})();

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Return a shallow copy of all tasks.
 */
function getAllTasks() {
  return [...tasks];
}

/**
 * Add a new task.
 * @param {{ title, description, priority, dueDate }} data
 * @returns {Object} the new task object
 */
function addTask(data) {
  if (!data.title || !data.title.trim()) {
    throw new Error('Task title is required.');
  }
  const task = {
    id:          generateId(),
    title:       data.title.trim(),
    description: (data.description || '').trim(),
    priority:    data.priority || 'medium',
    dueDate:     data.dueDate || '',
    completed:   false,
    createdAt:   new Date().toISOString(),
    completedAt: null
  };
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

/**
 * Update an existing task by id.
 * @param {string} id
 * @param {Object} updates — partial task fields
 * @returns {Object|null} updated task, or null if not found
 */
function updateTask(id, updates) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;

  // Merge updates into the existing task
  tasks[idx] = { ...tasks[idx], ...updates };
  saveTasks(tasks);
  return tasks[idx];
}

/**
 * Delete a task by id.
 * @param {string} id
 * @returns {boolean} true if deleted
 */
function deleteTask(id) {
  const before = tasks.length;
  tasks = tasks.filter(t => t.id !== id);
  if (tasks.length === before) return false;
  saveTasks(tasks);
  return true;
}

/**
 * Toggle the completed state of a task.
 * Also records / clears completedAt timestamp.
 * @param {string} id
 * @returns {Object|null}
 */
function toggleTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;

  tasks[idx].completed = !tasks[idx].completed;
  tasks[idx].completedAt = tasks[idx].completed ? new Date().toISOString() : null;
  saveTasks(tasks);
  return tasks[idx];
}

/**
 * Get a single task by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
function getTaskById(id) {
  return tasks.find(t => t.id === id);
}

// ================================================================
// FILTER & SEARCH HELPERS
// ================================================================

/**
 * Apply a named filter to a task array.
 * @param {Array}  taskArray
 * @param {string} filter — "all" | "today" | "pending" | "completed" | "overdue"
 * @returns {Array}
 */
function filterTasks(taskArray, filter) {
  const today = todayString();
  switch (filter) {
    case 'today':
      return taskArray.filter(t => t.dueDate === today);
    case 'pending':
      return taskArray.filter(t => !t.completed);
    case 'completed':
      return taskArray.filter(t => t.completed);
    case 'overdue':
      return taskArray.filter(t => !t.completed && t.dueDate && t.dueDate < today);
    default: // 'all'
      return taskArray;
  }
}

/**
 * Search tasks by title or description (case-insensitive).
 * @param {Array}  taskArray
 * @param {string} query
 * @returns {Array}
 */
function searchTasks(taskArray, query) {
  if (!query || !query.trim()) return taskArray;
  const q = query.trim().toLowerCase();
  return taskArray.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  );
}

/**
 * Determine if a task is overdue.
 * @param {Object} task
 * @returns {boolean}
 */
function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate < todayString();
}

/**
 * Format a "YYYY-MM-DD" date string for display.
 * Returns a human-friendly label ("Today", "Tomorrow", "Yesterday", or locale date).
 * @param {string} dateStr
 * @returns {string}
 */
function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const today     = todayString();
  const tomorrow  = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  if (dateStr === today)     return 'Today';
  if (dateStr === tomorrow)  return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';

  // Parse as local date to avoid UTC shift
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ================================================================
// STATISTICS HELPERS (used by dashboard + analytics)
// ================================================================

/**
 * Returns statistics object.
 */
function getStats() {
  const today = todayString();
  const all       = tasks;
  const completed = all.filter(t => t.completed);
  const pending   = all.filter(t => !t.completed);
  const todayTasks = all.filter(t => t.dueDate === today);
  const overdue   = all.filter(t => !t.completed && t.dueDate && t.dueDate < today);
  const productivity = all.length ? Math.round((completed.length / all.length) * 100) : 0;

  return { all, completed, pending, todayTasks, overdue, productivity };
}
