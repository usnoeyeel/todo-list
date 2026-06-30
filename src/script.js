import { supabase } from './supabase-client.js'
import { showAuthOverlay, hideAuthOverlay } from './auth.js'

let todos = [];
let groups = [];
let currentTab = 'all';
let currentGroup = null;
let expandedTodos = new Set();
let editingGroupTodo = null;
let currentUserId = null;

const GROUP_COLORS = [
  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  { bg: '#fdf4ff', text: '#9333ea', border: '#e9d5ff' },
  { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  { bg: '#f0fdfa', text: '#0d9488', border: '#99f6e4' },
  { bg: '#fefce8', text: '#ca8a04', border: '#fde68a' },
  { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
];

// ── Auth ─────────────────────────────────────────────────

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    currentUserId = session.user.id
    document.getElementById('userEmail').textContent = session.user.email
    hideAuthOverlay()
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      await loadData()
    }
  } else {
    currentUserId = null
    todos = []
    groups = []
    currentGroup = null
    showAuthOverlay()
    renderGroups()
    render()
  }
})

window.handleSignOut = async function () {
  await supabase.auth.signOut({ scope: 'local' })
}

// ── Data ─────────────────────────────────────────────────

async function loadData() {
  const [{ data: groupsData, error: gErr }, { data: todosData, error: tErr }] = await Promise.all([
    supabase.from('groups').select('*').order('created_at'),
    supabase.from('todos').select('*').order('created_at'),
  ]);
  if (gErr) console.error('groups fetch error:', gErr);
  if (tErr) console.error('todos fetch error:', tErr);

  groups = (groupsData || []).map(g => ({
    id: g.id,
    name: g.name,
    colorIndex: g.color_index,
  }));
  todos = (todosData || []).map(t => ({
    id: t.id,
    text: t.text,
    description: t.description || '',
    groupId: t.group_id,
    done: t.done,
    completedAt: t.completed_at,
  }));

  renderGroups()
  render()
}

// ── Group ────────────────────────────────────────────────

async function addGroup() {
  const input = document.getElementById('groupInput');
  const name = input.value.trim();
  if (!name) return;
  if (groups.find(g => g.name === name)) return;

  const colorIndex = groups.length % GROUP_COLORS.length;
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, color_index: colorIndex, user_id: currentUserId })
    .select()
    .single();
  if (error) { console.error(error); return; }

  groups.push({ id: data.id, name: data.name, colorIndex: data.color_index });
  input.value = '';
  renderGroups();
  render();
}

document.getElementById('groupInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addGroup();
});

async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) { console.error(error); return; }

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
  const chips = document.getElementById('groupChips');
  if (groups.length === 0) {
    chips.innerHTML = '<span class="no-groups">아직 그룹이 없습니다.</span>';
  } else {
    chips.innerHTML = groups.map(g => {
      const c = GROUP_COLORS[g.colorIndex];
      return `
        <span class="group-chip" style="background:${c.bg};color:${c.text};border-color:${c.border}">
          ${escapeHtml(g.name)}
          <button class="chip-delete" onclick="deleteGroup('${g.id}')" style="color:${c.border}">×</button>
        </span>`;
    }).join('');
  }

  const select = document.getElementById('todoGroup');
  select.innerHTML = '<option value="">그룹 없음</option>' +
    groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

  const row = document.getElementById('groupTabsRow');
  if (groups.length === 0) { row.innerHTML = ''; return; }
  row.innerHTML =
    `<button class="group-tab-btn ${currentGroup === null ? 'active' : ''}" onclick="switchGroup(null)">전체</button>` +
    groups.map(g => {
      const c = GROUP_COLORS[g.colorIndex];
      const isActive = currentGroup === g.id;
      const style = isActive
        ? `background:${c.text};color:#fff;border-color:${c.text}`
        : `background:#fff;color:${c.text};border-color:${c.border}`;
      return `<button class="group-tab-btn" onclick="switchGroup('${g.id}')" style="${style}">${escapeHtml(g.name)}</button>`;
    }).join('');
}

// ── Todo ─────────────────────────────────────────────────

function toggleDescInput() {
  const area = document.getElementById('descInputArea');
  const btn = document.getElementById('descAddBtn');
  const opening = !area.classList.contains('visible');
  area.classList.toggle('visible', opening);
  btn.classList.toggle('active', opening);
  btn.textContent = opening ? '− 설명 접기' : '+ 설명 추가';
  if (!opening) document.getElementById('todoDesc').value = '';
}

function collapseDescInput() {
  const area = document.getElementById('descInputArea');
  const btn = document.getElementById('descAddBtn');
  area.classList.remove('visible');
  btn.classList.remove('active');
  btn.textContent = '+ 설명 추가';
  document.getElementById('todoDesc').value = '';
}

async function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;

  const description = document.getElementById('todoDesc').value.trim() || null;
  const groupIdRaw = document.getElementById('todoGroup').value;
  const groupId = groupIdRaw || null;

  const { data, error } = await supabase
    .from('todos')
    .insert({ text, description, group_id: groupId, done: false, user_id: currentUserId })
    .select()
    .single();
  if (error) { console.error(error); return; }

  todos.push({
    id: data.id,
    text: data.text,
    description: data.description || '',
    groupId: data.group_id,
    done: data.done,
    completedAt: data.completed_at,
  });
  input.value = '';
  collapseDescInput();
  render();
}

document.getElementById('todoInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

async function toggleDone(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const done = !todo.done;
  const completedAt = done ? new Date().toISOString() : null;

  const { error } = await supabase
    .from('todos')
    .update({ done, completed_at: completedAt })
    .eq('id', id);
  if (error) { console.error(error); return; }

  todo.done = done;
  todo.completedAt = completedAt;
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

async function assignGroup(todoId, groupIdRaw) {
  const groupId = groupIdRaw || null;
  const { error } = await supabase
    .from('todos')
    .update({ group_id: groupId })
    .eq('id', todoId);
  if (error) { console.error(error); return; }

  const todo = todos.find(t => t.id === todoId);
  if (todo) todo.groupId = groupId;
  editingGroupTodo = null;
  render();
}

function cancelEditGroup() {
  if (editingGroupTodo !== null) {
    editingGroupTodo = null;
    render();
  }
}

async function deleteCompleted() {
  const { error } = await supabase.from('todos').delete().eq('done', true).eq('user_id', currentUserId);
  if (error) { console.error(error); return; }
  todos = todos.filter(t => !t.done);
  render();
}

// ── Render ───────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function renderTodoItem(todo) {
  const isExpanded = expandedTodos.has(todo.id);
  const hasDesc = !!todo.description;
  const group = currentGroup === null ? groups.find(g => g.id === todo.groupId) : null;

  let badgeHtml = '';
  if (editingGroupTodo === todo.id) {
    const opts = `<option value="" ${!todo.groupId ? 'selected' : ''}>그룹 없음</option>` +
      groups.map(g => `<option value="${g.id}" ${todo.groupId === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
    badgeHtml = `<select class="todo-group-select" onchange="assignGroup('${todo.id}',this.value)" onblur="cancelEditGroup()" onclick="event.stopPropagation()">${opts}</select>`;
  } else if (group) {
    const c = GROUP_COLORS[group.colorIndex];
    badgeHtml = `<span class="todo-group-badge" style="background:${c.bg};color:${c.text};cursor:pointer" title="그룹 변경" onclick="event.stopPropagation();startEditGroup('${todo.id}')">${escapeHtml(group.name)}</span>`;
  } else if (groups.length > 0) {
    badgeHtml = `<span class="todo-group-unset" onclick="event.stopPropagation();startEditGroup('${todo.id}')">+ 그룹</span>`;
  }

  return `
    <li class="todo-item ${todo.done ? 'done' : ''}">
      <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleDone('${todo.id}')" />
      <div class="todo-content"${hasDesc ? ` onclick="toggleDescription('${todo.id}')"` : ''} style="${hasDesc ? 'cursor:pointer' : ''}">
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
  document.getElementById('remainingCount').innerHTML = `남은 할 일 <span>${remaining}</span>개`;

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
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── window 노출 (HTML inline onclick 핸들러용) ───────────
window.addGroup = addGroup;
window.deleteGroup = deleteGroup;
window.switchGroup = switchGroup;
window.toggleDescInput = toggleDescInput;
window.addTodo = addTodo;
window.switchTab = switchTab;
window.toggleDone = toggleDone;
window.toggleDescription = toggleDescription;
window.startEditGroup = startEditGroup;
window.assignGroup = assignGroup;
window.cancelEditGroup = cancelEditGroup;
window.deleteCompleted = deleteCompleted;
