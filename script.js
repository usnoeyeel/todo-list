let todos = [];
let currentTab = 'all';
let expandedTodos = new Set();

function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;

  const desc = document.getElementById('todoDesc').value.trim();
  todos.push({ id: Date.now(), text, description: desc, done: false, completedAt: null });
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

function deleteCompleted() {
  todos = todos.filter(t => !t.done);
  render();
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function renderTodoItem(todo) {
  const isExpanded = expandedTodos.has(todo.id);
  const hasDesc = !!todo.description;

  return `
    <li class="todo-item ${todo.done ? 'done' : ''}">
      <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleDone(${todo.id})" />
      <div class="todo-content" ${hasDesc ? `onclick="toggleDescription(${todo.id})"` : ''} style="${hasDesc ? 'cursor:pointer' : ''}">
        <div class="todo-main">
          <span class="todo-text">${escapeHtml(todo.text)}</span>
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

  list.innerHTML = filtered.map(renderTodoItem).join('');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

render();
