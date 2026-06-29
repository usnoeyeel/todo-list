let todos = [];
let groups = [];
let currentTab = 'all';
let groupViewEnabled = false;
let expandedTodos = new Set();

// ── Group ───────────────────────────────────────────────

function addGroup() {
  const input = document.getElementById('groupInput');
  const name = input.value.trim();
  if (!name) return;
  if (groups.find(g => g.name === name)) return;
  groups.push({ id: Date.now(), name });
  input.value = '';
  renderGroups();
}

document.getElementById('groupInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addGroup();
});

function deleteGroup(id) {
  groups = groups.filter(g => g.id !== id);
  todos = todos.map(t => t.groupId === id ? { ...t, groupId: null } : t);
  renderGroups();
  render();
}

function renderGroups() {
  const chips = document.getElementById('groupChips');
  if (groups.length === 0) {
    chips.innerHTML = '<span class="no-groups">아직 그룹이 없습니다.</span>';
  } else {
    chips.innerHTML = groups.map(g => `
      <span class="group-chip">
        ${escapeHtml(g.name)}
        <button class="chip-delete" onclick="deleteGroup(${g.id})">×</button>
      </span>
    `).join('');
  }

  const select = document.getElementById('todoGroup');
  select.innerHTML = '<option value="">그룹 없음</option>' +
    groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
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

function toggleGroupView() {
  groupViewEnabled = !groupViewEnabled;
  document.getElementById('groupViewBtn').classList.toggle('active', groupViewEnabled);
  render();
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

function renderTodoItem(todo, showGroupBadge) {
  const isExpanded = expandedTodos.has(todo.id);
  const hasDesc = !!todo.description;
  const groupName = showGroupBadge ? getGroupName(todo.groupId) : null;

  return `
    <li class="todo-item ${todo.done ? 'done' : ''}">
      <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleDone(${todo.id})" />
      <div class="todo-content"${hasDesc ? ` onclick="toggleDescription(${todo.id})"` : ''} style="${hasDesc ? 'cursor:pointer' : ''}">
        <div class="todo-main">
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          ${groupName ? `<span class="todo-group-badge">${escapeHtml(groupName)}</span>` : ''}
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

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">항목이 없습니다.</li>';
    return;
  }

  if (groupViewEnabled) {
    const sections = [];
    groups.forEach(g => {
      const items = filtered.filter(t => t.groupId === g.id);
      if (items.length) sections.push({ name: g.name, items });
    });
    const ungrouped = filtered.filter(t => !t.groupId);
    if (ungrouped.length) sections.push({ name: '미분류', items: ungrouped });

    if (sections.length === 0) {
      list.innerHTML = '<li class="empty-msg">항목이 없습니다.</li>';
      return;
    }

    list.innerHTML = sections.map(sec => `
      <li class="group-section-header">${escapeHtml(sec.name)}</li>
      ${sec.items.map(t => renderTodoItem(t, false)).join('')}
    `).join('');
  } else {
    list.innerHTML = filtered.map(t => renderTodoItem(t, true)).join('');
  }
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
