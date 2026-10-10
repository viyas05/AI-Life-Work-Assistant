/**
 * ai-assistant.js — Rule-based Demo AI Assistant
 *
 * ⚠️  DEMO MODE: This assistant uses rule-based pattern matching and
 * live task data — it is NOT connected to any real AI model or API.
 *
 * For real AI integration, a secure backend proxy is required to avoid
 * exposing API keys in frontend code. Never hardcode credentials here.
 *
 * Depends on: tasks.js (loaded before this file)
 */

// ================================================================
// RESPONSE ENGINE
// ================================================================

/**
 * Generate an assistant response given the user's message and current tasks.
 * @param {string} message — the user's input (lower-cased externally)
 * @returns {string} HTML-safe response string
 */
function generateAssistantResponse(rawMessage) {
  const msg   = rawMessage.toLowerCase().trim();
  const stats = getStats();
  const all   = getAllTasks();

  // ---- Plan my day ----
  if (msg.includes('plan') && (msg.includes('day') || msg.includes('today'))) {
    return buildPlanMyDayResponse(stats);
  }

  // ---- What should I do next / next task ----
  if (msg.includes('next') || (msg.includes('what') && msg.includes('do'))) {
    return buildNextTaskResponse(stats);
  }

  // ---- Prioritize ----
  if (msg.includes('prioriti') || msg.includes('important') || msg.includes('urgent')) {
    return buildPrioritizeResponse(stats);
  }

  // ---- Break down a task ----
  if (msg.includes('break') || msg.includes('smaller') || msg.includes('steps') || msg.includes('sub')) {
    return buildBreakDownResponse(all);
  }

  // ---- Overdue ----
  if (msg.includes('overdue') || msg.includes('late') || msg.includes('missed')) {
    return buildOverdueResponse(stats);
  }

  // ---- Stats / summary ----
  if (msg.includes('stat') || msg.includes('summar') || msg.includes('how am i doing') || msg.includes('progress')) {
    return buildSummaryResponse(stats);
  }

  // ---- Greeting ----
  if (msg.match(/^(hi|hello|hey|good\s?(morning|afternoon|evening))/)) {
    return buildGreeting(stats);
  }

  // ---- Help ----
  if (msg.includes('help') || msg.includes('what can you')) {
    return buildHelp();
  }

  // ---- Motivational fallback ----
  return buildMotivational(stats);
}

// ================================================================
// RESPONSE BUILDERS
// ================================================================

function buildGreeting(stats) {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const pending = stats.pending.length;
  return `Good ${time}! 👋<br><br>
You currently have <strong>${pending}</strong> pending task${pending !== 1 ? 's' : ''}.
${stats.todayTasks.length > 0
  ? `<br>You have <strong>${stats.todayTasks.length}</strong> task${stats.todayTasks.length !== 1 ? 's' : ''} due today.`
  : ''}
<br><br>How can I help you be more productive today?`;
}

function buildPlanMyDayResponse(stats) {
  const today = stats.todayTasks.filter(t => !t.completed);
  const overdue = stats.overdue;
  const highPending = stats.pending.filter(t => t.priority === 'high').slice(0, 3);

  let resp = `📅 <strong>Here's a suggested plan for your day:</strong><br><br>`;

  if (overdue.length > 0) {
    resp += `🚨 <strong>First — Overdue (${overdue.length}):</strong><br>`;
    overdue.slice(0, 3).forEach(t => {
      resp += `&nbsp;&nbsp;• ${escapeHtml(t.title)}<br>`;
    });
    resp += '<br>';
  }

  if (today.length > 0) {
    resp += `📌 <strong>Due Today (${today.length}):</strong><br>`;
    today.forEach(t => {
      resp += `&nbsp;&nbsp;• [${t.priority.toUpperCase()}] ${escapeHtml(t.title)}<br>`;
    });
    resp += '<br>';
  }

  if (highPending.length > 0 && today.length === 0 && overdue.length === 0) {
    resp += `⚡ <strong>High-priority tasks to focus on:</strong><br>`;
    highPending.forEach(t => {
      resp += `&nbsp;&nbsp;• ${escapeHtml(t.title)}<br>`;
    });
    resp += '<br>';
  }

  if (today.length === 0 && overdue.length === 0 && highPending.length === 0) {
    resp += `✅ Nothing urgent today! Great time to get ahead on upcoming tasks or take a break.<br>`;
  }

  resp += `<br><em>Tip: Tackle overdue tasks first, then today's tasks before anything else.</em>`;
  return resp;
}

function buildNextTaskResponse(stats) {
  // Priority: overdue → today → high priority
  const overdue  = stats.overdue;
  const todayInc = stats.todayTasks.filter(t => !t.completed);
  const high     = stats.pending.filter(t => t.priority === 'high');

  let next = null;
  if (overdue.length > 0)  next = overdue[0];
  else if (todayInc.length > 0) next = todayInc[0];
  else if (high.length > 0) next = high[0];
  else if (stats.pending.length > 0) next = stats.pending[0];

  if (!next) {
    return `🎉 <strong>Amazing — you have no pending tasks!</strong><br><br>
Take a moment to celebrate, then consider adding your next goal.`;
  }

  return `🎯 <strong>I recommend working on this next:</strong><br><br>
<strong>${escapeHtml(next.title)}</strong><br>
${next.description ? `<em>${escapeHtml(next.description)}</em><br>` : ''}
Priority: <strong>${next.priority}</strong>${next.dueDate ? ` &nbsp;|&nbsp; Due: <strong>${formatDueDate(next.dueDate)}</strong>` : ''}<br><br>
${isOverdue(next) ? '⚠️ This task is <strong>overdue</strong>. Handle it as soon as possible.' : 'Start with this and work your way through the list.'}`;
}

function buildPrioritizeResponse(stats) {
  const pending = stats.pending;
  if (pending.length === 0) {
    return `✅ <strong>All caught up!</strong> You have no pending tasks right now.`;
  }

  const high   = pending.filter(t => t.priority === 'high');
  const medium = pending.filter(t => t.priority === 'medium');
  const low    = pending.filter(t => t.priority === 'low');

  let resp = `⚡ <strong>Your task priorities:</strong><br><br>`;

  if (high.length) {
    resp += `🔴 <strong>High Priority (${high.length})</strong><br>`;
    high.forEach(t => resp += `&nbsp;&nbsp;• ${escapeHtml(t.title)}${isOverdue(t) ? ' ⚠️' : ''}<br>`);
    resp += '<br>';
  }
  if (medium.length) {
    resp += `🟠 <strong>Medium Priority (${medium.length})</strong><br>`;
    medium.forEach(t => resp += `&nbsp;&nbsp;• ${escapeHtml(t.title)}<br>`);
    resp += '<br>';
  }
  if (low.length) {
    resp += `🟢 <strong>Low Priority (${low.length})</strong><br>`;
    low.forEach(t => resp += `&nbsp;&nbsp;• ${escapeHtml(t.title)}<br>`);
    resp += '<br>';
  }

  resp += `<em>Tip: Use the Eisenhower Matrix — handle Urgent+Important first, schedule Important+Not Urgent, delegate the rest.</em>`;
  return resp;
}

function buildBreakDownResponse(all) {
  const pending = all.filter(t => !t.completed);
  if (pending.length === 0) {
    return `You have no pending tasks to break down right now. Add a task first!`;
  }

  // Pick the highest-priority pending task
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const task = [...pending].sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))[0];

  return `🔧 <strong>Breaking down: "${escapeHtml(task.title)}"</strong><br><br>
Here's a suggested approach:<br>
1. Define the goal clearly — what does "done" look like?<br>
2. List required resources and dependencies<br>
3. Split into 3–5 concrete sub-tasks<br>
4. Estimate time for each sub-task<br>
5. Start with the smallest or most-blocked step first<br><br>
<em>Try adding sub-tasks using the New Task button. Use the description field to note which parent task they belong to.</em>`;
}

function buildOverdueResponse(stats) {
  const overdue = stats.overdue;
  if (overdue.length === 0) {
    return `✅ <strong>Great news — no overdue tasks!</strong> You're on top of your schedule.`;
  }

  let resp = `⚠️ <strong>You have ${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''}:</strong><br><br>`;
  overdue.forEach(t => {
    resp += `• <strong>${escapeHtml(t.title)}</strong> — was due <strong>${formatDueDate(t.dueDate)}</strong><br>`;
  });
  resp += `<br><em>Tip: Address these ASAP or reschedule by editing the task's due date.</em>`;
  return resp;
}

function buildSummaryResponse(stats) {
  return `📊 <strong>Your current progress:</strong><br><br>
• Total tasks: <strong>${stats.all.length}</strong><br>
• Completed: <strong>${stats.completed.length}</strong><br>
• Pending: <strong>${stats.pending.length}</strong><br>
• Due today: <strong>${stats.todayTasks.length}</strong><br>
• Overdue: <strong>${stats.overdue.length}</strong><br>
• Productivity rate: <strong>${stats.productivity}%</strong><br><br>
${stats.productivity >= 80
  ? '🏆 Excellent work! You\'re crushing it.'
  : stats.productivity >= 50
    ? '👍 Good progress. Keep the momentum going!'
    : '💪 Every completed task counts. You\'ve got this!'}`;
}

function buildMotivational(stats) {
  const tips = [
    "Try breaking your biggest task into 3 small steps — small wins build momentum.",
    "The best time to start a task was yesterday. The second best time is now. 💪",
    "Consider using the Pomodoro Technique: 25 min focused work, 5 min break.",
    "Review your high-priority tasks first thing each morning.",
    "Done is better than perfect. Complete the task, then refine it.",
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)];

  const pending = stats.pending.length;
  return `I'm not sure I understood that, but here's something that might help:<br><br>
💡 <em>${tip}</em><br><br>
You have <strong>${pending}</strong> pending task${pending !== 1 ? 's' : ''}.
Try asking me: <em>"Plan my day"</em>, <em>"What's next?"</em>, or <em>"Help prioritize my tasks"</em>.`;
}

function buildHelp() {
  return `👋 <strong>Here's what I can help you with:</strong><br><br>
📅 <strong>"Plan my day"</strong> — get a prioritized daily plan<br>
🎯 <strong>"What should I do next?"</strong> — find your most important task<br>
⚡ <strong>"Help prioritize my tasks"</strong> — see tasks by priority<br>
🔧 <strong>"Break down a task"</strong> — split a complex task into steps<br>
⚠️ <strong>"Show overdue tasks"</strong> — see what's late<br>
📊 <strong>"How am I doing?"</strong> — get a progress summary<br><br>
<em>⚠️ Demo Mode: I use rule-based logic and your local task data — no AI API is connected.</em>`;
}

// ================================================================
// CHAT UI
// ================================================================

let chatInitialized = false;

/**
 * Initialize the chat interface.
 * Should only be called once.
 */
function initAssistant() {
  if (chatInitialized) return;
  chatInitialized = true;

  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  // Send on button click
  sendBtn.addEventListener('click', handleSend);

  // Send on Enter key (Shift+Enter = new line)
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Quick-action buttons
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      input.value = this.dataset.prompt;
      handleSend();
    });
  });

  // Welcome message
  appendMessage('assistant',
    `👋 <strong>Hi! I'm your AI Work Assistant.</strong><br><br>
I can help you plan your day, prioritize tasks, and stay on track — all using your local task data.<br><br>
<em>⚠️ Demo Mode: Rule-based assistant. No real AI API is connected. For production use, a secure backend would proxy calls to IBM watsonx Assistant or another LLM.</em><br><br>
Try one of the quick actions below, or ask me anything!`
  );
}

/**
 * Handle a send action (button click or Enter key).
 */
function handleSend() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendMessage('user', escapeHtml(msg));

  // Show typing indicator
  const typingId = showTypingIndicator();

  // Simulate processing delay (300–800ms) for realism
  const delay = 300 + Math.floor(Math.random() * 500);
  setTimeout(() => {
    removeTypingIndicator(typingId);
    const response = generateAssistantResponse(msg);
    appendMessage('assistant', response);
  }, delay);
}

/**
 * Append a message bubble to the chat.
 * @param {'user'|'assistant'} role
 * @param {string} htmlContent — inner HTML of the bubble
 */
function appendMessage(role, htmlContent) {
  const container = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = htmlContent;
  container.appendChild(bubble);
  // Scroll to the latest message
  container.scrollTop = container.scrollHeight;
}

/**
 * Show the typing indicator and return its element id.
 * @returns {string} id of the typing indicator element
 */
function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = id;
  div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

/**
 * Remove the typing indicator by id.
 * @param {string} id
 */
function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
