const ideaList = document.getElementById('idea-list');
const emptyState = document.getElementById('empty-state');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const ideaForm = document.getElementById('idea-form');
const ideaIdInput = document.getElementById('idea-id');
const ideaTitleInput = document.getElementById('idea-title');
const ideaDescInput = document.getElementById('idea-desc');
const ideaTagsInput = document.getElementById('idea-tags');
const titleError = document.getElementById('title-error');

document.getElementById('btn-new').addEventListener('click', () => openModal(null));
document.getElementById('btn-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
ideaForm.addEventListener('submit', handleSave);

async function loadIdeas() {
  const ideas = await api('GET', '/api/ideas');
  renderList(ideas);
}

function renderList(ideas) {
  ideaList.innerHTML = '';
  if (ideas.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  ideas.forEach(idea => ideaList.appendChild(buildCard(idea)));
}

function buildCard(idea) {
  const li = document.createElement('li');
  li.className = 'idea-card';
  li.dataset.id = idea.id;

  const excerpt = idea.description.length > 140
    ? idea.description.slice(0, 140) + '…'
    : idea.description;

  const tagsHtml = idea.tags.length
    ? `<div class="tag-list">${idea.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>`
    : '';

  li.innerHTML = `
    <div class="idea-card-body">
      <div class="idea-title">${escHtml(idea.title)}</div>
      ${excerpt ? `<div class="idea-desc">${escHtml(excerpt)}</div>` : ''}
      ${tagsHtml}
    </div>
    <div class="idea-actions">
      <button class="btn-icon edit-btn" title="Edit" aria-label="Edit idea">✏️</button>
      <button class="btn-icon danger delete-btn" title="Delete" aria-label="Delete idea">🗑️</button>
    </div>
  `;

  li.querySelector('.edit-btn').addEventListener('click', () => openModal(idea));
  li.querySelector('.delete-btn').addEventListener('click', () => handleDelete(idea.id, idea.title));
  return li;
}

function openModal(idea) {
  ideaForm.reset();
  titleError.textContent = '';
  ideaTitleInput.classList.remove('invalid');

  if (idea) {
    modalTitle.textContent = 'Edit Idea';
    ideaIdInput.value = idea.id;
    ideaTitleInput.value = idea.title;
    ideaDescInput.value = idea.description;
    ideaTagsInput.value = idea.tags.join(', ');
  } else {
    modalTitle.textContent = 'New Idea';
    ideaIdInput.value = '';
  }

  modalOverlay.hidden = false;
  ideaTitleInput.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
}

async function handleSave(e) {
  e.preventDefault();
  const title = ideaTitleInput.value.trim();

  if (!title) {
    ideaTitleInput.classList.add('invalid');
    titleError.textContent = 'Title is required.';
    ideaTitleInput.focus();
    return;
  }
  ideaTitleInput.classList.remove('invalid');
  titleError.textContent = '';

  const tags = ideaTagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const body = { title, description: ideaDescInput.value.trim(), tags };
  const id = ideaIdInput.value;

  if (id) {
    await api('PUT', `/api/ideas/${id}`, body);
  } else {
    await api('POST', '/api/ideas', body);
  }

  closeModal();
  loadIdeas();
}

async function handleDelete(id, title) {
  if (!confirm(`Delete "${title}"?`)) return;
  await api('DELETE', `/api/ideas/${id}`);
  loadIdeas();
}

async function api(method, url, body) {
  const opts = {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadIdeas();
