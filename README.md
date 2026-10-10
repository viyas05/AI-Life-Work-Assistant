# AI Life & Work Assistant

A complete, polished, beginner-friendly productivity web application built as an IBM SkillsBuild project demonstration and portfolio showcase.

---

## Features

### Dashboard
- Live statistics: Today's tasks, Pending, Completed, Productivity %
- Sorted task overview (incomplete first, by due date and priority)
- Quick "Add Task" button
- Responsive stat cards

### Task Management
- **Create** tasks with title, description, priority, and due date
- **Edit** any task via a clean modal form
- **Delete** tasks with a confirmation prompt
- **Complete / uncomplete** tasks with a checkbox
- **Filters**: All · Today · Pending · Completed · Overdue
- **Search** by title or description
- All data persisted to **localStorage** — survives page refresh
- Sample tasks seeded on first launch only (not repeated on refresh)
- Overdue tasks highlighted with a red left border

### AI Assistant (Demo Mode)
- Chat-style interface with typing indicator
- Quick-action buttons: Plan my day · What's next? · Prioritize tasks · Break down a task
- Rule-based assistant that reads your **live task data** to give contextual advice
- ⚠️ **Clearly labelled as Demo Mode** — no real AI API is connected
- For real AI: a secure backend proxy is required (see [AI Integration](#ai-integration))

### Analytics
- **Line chart**: Task completions over the last 7 days (Chart.js)
- **Doughnut chart**: Priority breakdown (High / Medium / Low)
- Overall completion rate, completion streak, total completed
- Charts update automatically when task data changes
- Graceful handling of empty datasets
- Metrics labelled as estimated where applicable

### UX & Polish
- Light / Dark theme toggle (persisted)
- Mobile-responsive layout (collapsible sidebar with overlay)
- Toast notifications for all mutations
- Accessible HTML (labels, ARIA, keyboard navigation)
- No build tools or server required — open `index.html` in a browser

---

## Project Structure

```
AI-Life-Work-Assistant/
├── index.html          — Single-page application shell, all HTML
├── css/
│   └── style.css       — All custom styles, CSS variables, dark theme
├── js/
│   ├── tasks.js        — Data layer: CRUD, localStorage, filters, stats
│   ├── dashboard.js    — Dashboard widgets, task-item HTML builder
│   ├── analytics.js    — Chart.js charts and analytics metrics
│   ├── ai-assistant.js — Rule-based chat assistant, chat UI
│   └── app.js          — App bootstrap, navigation, modals, theme, events
├── assets/             — Optional folder for local images/icons
└── README.md
```

---

## Setup Instructions

1. **Download / clone** the repository (or unzip the project folder).
2. Open `index.html` in any modern browser:
   - **Windows**: double-click `index.html`, or right-click → Open With → Chrome/Edge/Firefox
   - **macOS**: double-click `index.html`
   - **VS Code**: install the _Live Server_ extension and click **Go Live**
3. No npm, no Node.js, no build step required.

> **CDN resources**: The app uses Bootstrap 5, Bootstrap Icons, and Chart.js from jsDelivr CDN.
> An internet connection is required for first load (or if the browser cache has expired).
> The task data layer works offline as all persistence is local.

---

## Testing Guide

| Test | Steps | Expected Result |
|------|-------|-----------------|
| First launch sample tasks | Clear localStorage, open app | 6 sample tasks appear; not recreated on refresh |
| Add task | Tasks → New Task → fill form → Save | Task appears in list; toast shown |
| Title required | Open modal, leave title blank, Save | Red validation message; modal stays open |
| Edit task | Click pencil icon → change title → Save | Task title updated; toast shown |
| Delete task | Click trash icon → confirm | Task removed; toast shown |
| Complete task | Check the checkbox | Task strikes through; stats update |
| Filter: Today | Tasks → Today button | Only tasks due today shown |
| Filter: Overdue | Tasks → Overdue button | Only incomplete past-due tasks shown |
| Search | Type in search box | List narrows in real time |
| Refresh persistence | Add a task, press F5 | Task still present after reload |
| Dashboard stats | Add/complete tasks | Numbers update on Dashboard |
| Analytics charts | Navigate to Analytics | Line + doughnut charts render |
| Theme toggle | Click moon/sun icon in header | UI switches light ↔ dark; persists on reload |
| Mobile sidebar | Resize to < 992px width | Hamburger button appears; sidebar overlays |
| AI Assistant | Type "Plan my day" | Contextual plan using real task data |
| AI Demo label | Open AI Assistant page | "Demo Mode" badge visible |

---

## Limitations

- **No real AI**: The assistant uses rule-based pattern matching, not a language model.
- **localStorage only**: Data is per-browser, per-device. Clearing browser data removes all tasks.
- **No user accounts or sync**: Multiple users share the same browser storage.
- **Completion history**: The analytics streak and 7-day chart rely on `completedAt` timestamps stored locally. Tasks completed before installing the app (or on another device) are not reflected.
- **CDN dependency**: Charts and Bootstrap require an internet connection unless files are downloaded locally.

---

## AI Integration

To connect a real AI model, you need a **secure backend proxy** to protect your API credentials.

```
Browser ──► Your Backend Server ──► IBM watsonx Assistant / OpenAI API
```

**Never put API keys directly in frontend JavaScript** — they are visible to anyone who opens DevTools.

Steps to integrate IBM watsonx Assistant:
1. Create an IBM Cloud account and provision a watsonx Assistant instance.
2. Build a backend endpoint (Node.js, Python Flask, etc.) that holds your API key securely.
3. In `ai-assistant.js`, replace `generateAssistantResponse()` with a `fetch()` call to your proxy.
4. Pass the user message and relevant task context in the request body.

---

## Portfolio Demo Script

Use this walkthrough when presenting the project:

1. **Open `index.html`** — point out the clean dashboard with live statistics.
2. **Add a new task**: Title = "Prepare IBM presentation", Priority = High, Due = today.
3. **Show filters**: Click "Today" → the new task appears. Click "Overdue" → shows the expired sample.
4. **Complete a task**: Check the checkbox. Watch the Completed counter increment on the dashboard.
5. **Open AI Assistant**: Click "Plan my day" quick action. Walk through the contextual response.
6. **Open Analytics**: Show the doughnut chart with priority breakdown and the completion line chart.
7. **Toggle theme**: Click the moon icon. The whole UI transitions to dark mode instantly.
8. **Refresh the page**: All tasks and the theme preference survive the reload — demonstrating localStorage persistence.

Key talking points:
- Pure frontend — HTML, CSS, JavaScript, Bootstrap 5, Chart.js
- Clean, modular code with comments suitable for a learning context
- Follows web accessibility best practices
- Demonstrates data persistence without a server
- Shows how an AI assistant UI can be built, with a clear path to real AI integration

---

*Built for IBM SkillsBuild — AI & Cloud Fundamentals Portfolio Project*
