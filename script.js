let todos = [];
let groups = [];
let currentTab = 'all';
let currentGroup = null;
let expandedTodos = new Set();
let editingGroupTodo = null;

const GROUP_COLORS = [
  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }, // 파랑
  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }, // 초록
  { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' }, // 주황
  { bg: '#fdf4ff', text: '#9333ea', border: '#e9d5ff' }, // 보라
  { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' }, // 빨강
  { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4' }, // 청록
  { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' }, // 노랑
  { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' }, // 분홍
];

// ── Group ───────────────────────────────────────────────

function addGroup() {
  const input = document.getElementById('groupInput');
  const name = input.value.trim();
  if (!name) return;
  if (groups.find(g => g.name === name)) return;
  const colorIndex = groups.length % GROUP_COLORS.length;
  groups.push({ id: Date.now(), name, colorIndex });
  input.value = '';
  renderGroups();
  render();
}

document.getElementById('groupInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addGroup();
});

function deleteGroup(id) {
  groups = groups.filter(g => g.id !== id);
  todos = todos.map(t => t.groupId === id ? { ...t, groupId: null } : t);
  if (currentGroup === id) currentGroup = null;
  renderGroups();
  render();
}

function switchGroup(groupId) {
  currentGroup = groupId;
  renderGroups();
  render();
}

function renderGroups() {
  // 그룹 칩
  const chips = document.getElementById('groupChips');
  if (groups.length === 0) {
    chips.innerHTML = '<span class="no-groups">아직 그룹이 없습니다.</span>';
  } else {
    chips.innerHTML = groups.map(g => {
      const c = GROUP_COLORS[g.colorIndex];
      return `
        <span class="group-chip" style="background:${c.bg};color:${c.text};border-color:${c.border}">
          ${escapeHtml(g.name)}
          <button class="chip-delete" onclick="deleteGroup(${g.id})" style="color:${c.border}">×</button>
        </span>`;
    }).join('');
  }

  // 그룹 select
  const select = document.getElementById('todoGroup');
  select.innerHTML = '<option value="">그룹 없음</option>' +
    groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

  // 그룹 탭
  const row = document.getElementById('groupTabsRow');
  if (groups.length === 0) {
    row.innerHTML = '';
    return;
  }
  row.innerHTML =
    `<button class="group-tab-btn ${currentGroup === null ? 'active' : ''}" onclick="switchGroup(null)">전체</button>` +
    groups.map(g => {
      const c = GROUP_COLORS[g.colorIndex];
      const isActive = currentGroup === g.id;
      const style = isActive
        ? `background:${c.text};color:#fff;border-color:${c.text}`
        : `background:#fff;color:${c.text};border-color:${c.border}`;
      return `<button class="group-tab-btn" onclick="switchGroup(${g.id})" style="${style}">${escapeHtml(g.name)}</button>`;
    }).join('');
}

// ── Todo ────────────────────────────────────────────────

function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;

  const desc = document.getElementById('todoDesc').value.trim();
  const groupIdRaw = document.getElementById('todoGroup').value;
  const groupId = groupIdRaw ? Number(groupIdRaw) : null;

  todos.push({ id: Date.now(), text, description: desc, groupId, done: false, completedAt: null });
  input.value = '';
  document.getElementById('todoDesc').value = '';
  render();
}

document.getElementById('todoInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addTodo();
});

function toggleDone(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    todo.completedAt = todo.done ? new Date().toISOString() : null;
  }
  render();
}

function toggleDescription(id) {
  if (expandedTodos.has(id)) {
    expandedTodos.delete(id);
  } else {
    expandedTodos.add(id);
  }
  render();
}

function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function startEditGroup(todoId) {
  editingGroupTodo = todoId;
  render();
  setTimeout(() => {
    const sel = document.querySelector('.todo-group-select');
    if (sel) sel.focus();
  }, 0);
}

function assignGroup(todoId, groupIdRaw) {
  const todo = todos.find(t => t.id === todoId);
  if (todo) todo.groupId = groupIdRaw ? Number(groupIdRaw) : null;
  editingGroupTodo = null;
  render();
}

function cancelEditGroup() {
  if (editingGroupTodo !== null) {
    editingGroupTodo = null;
    render();
  }
}

function deleteCompleted() {
  todos = todos.filter(t => !t.done);
  render();
}

// ── Render ──────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getGroupName(groupId) {
  const g = groups.find(g => g.id === groupId);
  return g ? g.name : null;
}

function renderTodoItem(todo) {
  const isExpanded = expandedTodos.has(todo.id);
  const hasDesc = !!todo.description;
  const group = currentGroup === null ? groups.find(g => g.id === todo.groupId) : null;

  let badgeHtml = '';
  if (editingGroupTodo === todo.id) {
    const opts = `<option value="" ${!todo.groupId ? 'selected' : ''}>그룹 없음</option>` +
      groups.map(g => `<option value="${g.id}" ${todo.groupId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
    badgeHtml = `<select class="todo-group-select" onchange="assignGroup(${todo.id},this.value)" onblur="cancelEditGroup()" onclick="event.stopPropagation()">${opts}</select>`;
  } else if (group) {
    const c = GROUP_COLORS[group.colorIndex];
    badgeHtml = `<span class="todo-group-badge" style="background:${c.bg};color:${c.text};cursor:pointer" title="그룹 변경" onclick="event.stopPropagation();startEditGroup(${todo.id})">${escapeHtml(group.name)}</span>`;
  } else if (groups.length > 0) {
    badgeHtml = `<span class="todo-group-unset" onclick="event.stopPropagation();startEditGroup(${todo.id})">+ 그룹</span>`;
  }

  return `
    <li class="todo-item ${todo.done ? 'done' : ''}">
      <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleDone(${todo.id})" />
      <div class="todo-content"${hasDesc ? ` onclick="toggleDescription(${todo.id})"` : ''} style="${hasDesc ? 'cursor:pointer' : ''}">
        <div class="todo-main">
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          ${badgeHtml}
          ${hasDesc ? `<span class="desc-toggle">${isExpanded ? '▲' : '▼'}</span>` : ''}
        </div>
        ${todo.done && todo.completedAt ? `<span class="todo-completed-at">완료: ${formatDate(todo.completedAt)}</span>` : ''}
        ${isExpanded && hasDesc ? `<p class="todo-desc">${escapeHtml(todo.description)}</p>` : ''}
      </div>
    </li>
  `;
}

function render() {
  const list = document.getElementById('todoList');
  const remaining = todos.filter(t => !t.done).length;
  document.getElementById('remainingCount').innerHTML =
    `남은 할 일 <span>${remaining}</span>개`;

  let filtered;
  if (currentTab === 'all') filtered = todos;
  else if (currentTab === 'active') filtered = todos.filter(t => !t.done);
  else filtered = todos.filter(t => t.done);

  if (currentGroup !== null) {
    filtered = filtered.filter(t => t.groupId === currentGroup);
  }

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">항목이 없습니다.</li>';
    return;
  }

  list.innerHTML = filtered.map(renderTodoItem).join('');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

renderGroups();
render();
