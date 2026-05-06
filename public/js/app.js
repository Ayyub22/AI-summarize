// ===== CONFIG =====
const SUPABASE_URL = 'https://xdrvayphhxspelrgjagw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcnZheXBoaHhzcGVscmdqYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjQzNDUsImV4cCI6MjA5MzQ0MDM0NX0.1Z_rAZIwykJNJGzspUKUh77IztlXZHXKau-zNpXSiS4';
// API base URL — if opened via Live Server (port 5500), redirect API calls to Express server (port 3000)
const API_BASE = window.location.port === '5500' ? 'http://localhost:3000' : '';

// ===== INIT =====
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ===== STATE =====
let currentUser = null;
let currentDocText = '';
let currentDocId = null;
let currentDocName = '';
let chatHistory = [];
let isProcessing = false;

// ===== DOM ELEMENTS =====
const $ = id => document.getElementById(id);
const uploadArea = $('uploadArea');
const documentView = $('documentView');
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const chatMessages = $('chatMessages');
const chatInput = $('chatInput');
const sendBtn = $('sendBtn');
const loadingOverlay = $('loadingOverlay');
const loadingText = $('loadingText');
const authModal = $('authModal');
const authForm = $('authForm');
const authError = $('authError');
const summaryContent = $('summaryContent');
const summarySection = $('summarySection');
const documentList = $('documentList');
const sidebarEmpty = $('sidebarEmpty');

// ===== AUTH =====
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    showLoggedInUI();
    loadDocuments();
  }
}

function showLoggedInUI() {
  $('loginBtn').classList.add('hidden');
  $('registerBtn').classList.add('hidden');
  $('guestBadge').classList.add('hidden');
  $('userInfo').classList.remove('hidden');
  $('userEmail').textContent = currentUser.email;
  $('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();
  sidebarEmpty.querySelector('span').textContent = 'Upload dokumen pertamamu!';
}

function showLoggedOutUI() {
  $('loginBtn').classList.remove('hidden');
  $('registerBtn').classList.remove('hidden');
  $('guestBadge').classList.remove('hidden');
  $('userInfo').classList.add('hidden');
  $('userEmail').textContent = '';
  sidebarEmpty.querySelector('span').textContent = 'Login untuk menyimpan riwayat';
  documentList.innerHTML = '';
  documentList.appendChild(sidebarEmpty);
  sidebarEmpty.style.display = '';
}

let authMode = 'login';
$('loginBtn').addEventListener('click', () => { authMode = 'login'; openAuthModal(); });
$('registerBtn').addEventListener('click', () => { authMode = 'register'; openAuthModal(); });
$('closeModalBtn').addEventListener('click', closeAuthModal);
$('authSwitchLink').addEventListener('click', e => {
  e.preventDefault();
  authMode = authMode === 'login' ? 'register' : 'login';
  updateAuthModal();
});

function openAuthModal() {
  updateAuthModal();
  authModal.classList.remove('hidden');
  $('authEmail').focus();
}

function closeAuthModal() {
  authModal.classList.add('hidden');
  authError.classList.add('hidden');
  authForm.reset();
}

function updateAuthModal() {
  if (authMode === 'login') {
    $('modalTitle').textContent = 'Masuk ke DocuMind AI';
    $('modalSubtitle').textContent = 'Simpan riwayat dokumen & chat kamu';
    $('authSubmitBtn').textContent = 'Masuk';
    $('authSwitch').innerHTML = 'Belum punya akun? <a href="#" id="authSwitchLink">Daftar di sini</a>';
  } else {
    $('modalTitle').textContent = 'Daftar Akun Baru';
    $('modalSubtitle').textContent = 'Gratis! Simpan semua riwayat dokumenmu';
    $('authSubmitBtn').textContent = 'Daftar';
    $('authSwitch').innerHTML = 'Sudah punya akun? <a href="#" id="authSwitchLink">Masuk di sini</a>';
  }
  $('authSwitchLink').addEventListener('click', e => {
    e.preventDefault();
    authMode = authMode === 'login' ? 'register' : 'login';
    updateAuthModal();
  });
}

authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  authError.classList.add('hidden');
  $('authSubmitBtn').disabled = true;
  $('authSubmitBtn').textContent = 'Memproses...';

  try {
    let result;
    if (authMode === 'login') {
      result = await sb.auth.signInWithPassword({ email, password });
    } else {
      result = await sb.auth.signUp({ email, password });
    }
    if (result.error) throw result.error;
    currentUser = result.data.user;
    if (authMode === 'register' && !result.data.session) {
      showToast('Cek email kamu untuk verifikasi!', 'success');
    } else {
      showToast('Berhasil masuk!', 'success');
      showLoggedInUI();
      loadDocuments();
    }
    closeAuthModal();
  } catch (err) {
    authError.textContent = err.message || 'Terjadi kesalahan';
    authError.classList.remove('hidden');
  } finally {
    $('authSubmitBtn').disabled = false;
    $('authSubmitBtn').textContent = authMode === 'login' ? 'Masuk' : 'Daftar';
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  currentUser = null;
  showLoggedOutUI();
  resetToUpload();
  showToast('Berhasil keluar', 'success');
});

authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });

// ===== FILE UPLOAD =====
$('selectFileBtn').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
$('newDocBtn').addEventListener('click', resetToUpload);
$('backToUploadBtn').addEventListener('click', resetToUpload);
dropzone.addEventListener('click', (e) => { if (e.target === dropzone || e.target.closest('.upload-icon-wrapper') || e.target.tagName === 'H2' || e.target.tagName === 'P') fileInput.click(); });

dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

async function handleFile(file) {
  if (file.type !== 'application/pdf') { showToast('Hanya file PDF yang diterima!', 'error'); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('Ukuran file maksimal 10MB!', 'error'); return; }

  showLoading('Membaca dokumen PDF...');
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n\n';
    }
    if (!text.trim()) { hideLoading(); showToast('PDF tidak memiliki teks yang bisa dibaca!', 'error'); return; }

    currentDocText = text;
    currentDocName = file.name;
    chatHistory = [];
    currentDocId = null;

    setLoadingText('AI sedang merangkum dokumen...');
    const res = await fetch(API_BASE + '/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: currentDocText })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Save to Supabase if logged in
    if (currentUser) {
      const { data: doc, error } = await sb.from('documents').insert({
        user_id: currentUser.id, filename: currentDocName,
        text_content: currentDocText.substring(0, 500000), summary: data.summary
      }).select().single();
      if (!error && doc) { currentDocId = doc.id; loadDocuments(); }
    }

    showDocumentView(currentDocName, data.summary);
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error(err);
    showToast('Gagal memproses dokumen: ' + err.message, 'error');
  }
}

// ===== DOCUMENT VIEW =====
function showDocumentView(name, summary) {
  uploadArea.classList.add('hidden');
  documentView.classList.remove('hidden');
  $('activeDocName').textContent = name;
  summaryContent.innerHTML = markdownToHTML(summary);
  summarySection.classList.remove('collapsed');
  chatMessages.innerHTML = `
    <div class="chat-welcome">
      <div class="chat-welcome-icon">💬</div>
      <h3>Tanya seputar dokumen ini</h3>
      <p>AI akan menjawab berdasarkan isi dokumen yang kamu upload</p>
      <div class="suggested-questions" id="suggestedQuestions">
        <button class="suggestion-chip" data-q="Apa inti utama dari dokumen ini?">Apa inti utama dokumen ini?</button>
        <button class="suggestion-chip" data-q="Jelaskan poin-poin penting secara detail">Jelaskan poin penting secara detail</button>
        <button class="suggestion-chip" data-q="Apa kesimpulan dari dokumen ini?">Apa kesimpulan dokumen ini?</button>
      </div>
    </div>`;
  bindSuggestions();
}

function resetToUpload() {
  uploadArea.classList.remove('hidden');
  documentView.classList.add('hidden');
  currentDocText = '';
  currentDocId = null;
  currentDocName = '';
  chatHistory = [];
  fileInput.value = '';
  // Deselect sidebar items
  document.querySelectorAll('.doc-item.active').forEach(el => el.classList.remove('active'));
}

// ===== SIDEBAR DOCUMENTS =====
async function loadDocuments() {
  if (!currentUser) return;
  const { data, error } = await sb.from('documents')
    .select('id, filename, summary, created_at')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  renderDocumentList(data || []);
}

function renderDocumentList(docs) {
  if (!docs.length) {
    documentList.innerHTML = '';
    documentList.appendChild(sidebarEmpty);
    sidebarEmpty.style.display = '';
    return;
  }
  sidebarEmpty.style.display = 'none';
  const html = docs.map(doc => `
    <div class="doc-item ${doc.id === currentDocId ? 'active' : ''}" data-id="${doc.id}">
      <span class="doc-item-icon">📄</span>
      <div class="doc-item-info">
        <div class="doc-item-name" title="${doc.filename}">${doc.filename}</div>
        <div class="doc-item-date">${formatDate(doc.created_at)}</div>
      </div>
      <button class="doc-item-delete" data-id="${doc.id}" title="Hapus">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  `).join('');
  // Keep sidebarEmpty in DOM but hidden
  documentList.innerHTML = html;
  documentList.appendChild(sidebarEmpty);

  // Click handlers
  document.querySelectorAll('.doc-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.doc-item-delete')) return;
      loadDocument(el.dataset.id);
    });
  });
  document.querySelectorAll('.doc-item-delete').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); deleteDocument(btn.dataset.id); });
  });
}

async function loadDocument(docId) {
  showLoading('Memuat dokumen...');
  try {
    const { data: doc } = await sb.from('documents').select('*').eq('id', docId).single();
    if (!doc) { hideLoading(); showToast('Dokumen tidak ditemukan', 'error'); return; }

    currentDocId = doc.id;
    currentDocText = doc.text_content;
    currentDocName = doc.filename;

    // Load chat history
    const { data: msgs } = await sb.from('chat_messages')
      .select('*').eq('document_id', docId).order('created_at', { ascending: true });
    chatHistory = (msgs || []).map(m => ({ role: m.role, content: m.content }));

    showDocumentView(doc.filename, doc.summary);
    // Render chat history
    if (chatHistory.length) {
      chatMessages.innerHTML = '';
      chatHistory.forEach(msg => appendBubble(msg.role, msg.content));
    }
    // Highlight sidebar
    document.querySelectorAll('.doc-item').forEach(el => el.classList.toggle('active', el.dataset.id === docId));
    hideLoading();
  } catch (err) {
    hideLoading();
    showToast('Gagal memuat dokumen', 'error');
  }
}

async function deleteDocument(docId) {
  if (!confirm('Hapus dokumen ini beserta riwayat chat-nya?')) return;
  await sb.from('chat_messages').delete().eq('document_id', docId);
  await sb.from('documents').delete().eq('id', docId);
  if (currentDocId === docId) resetToUpload();
  loadDocuments();
  showToast('Dokumen dihapus', 'success');
}

// ===== CHAT =====
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
chatInput.addEventListener('input', () => {
  sendBtn.disabled = !chatInput.value.trim();
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

function bindSuggestions() {
  document.querySelectorAll('.suggestion-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = btn.dataset.q;
      sendBtn.disabled = false;
      sendMessage();
    });
  });
}

async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question || isProcessing || !currentDocText) return;
  isProcessing = true;
  sendBtn.disabled = true;

  // Remove welcome if present
  const welcome = chatMessages.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  appendBubble('user', question);
  chatHistory.push({ role: 'user', content: question });
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  chatMessages.appendChild(typing);
  scrollChat();

  try {
    const res = await fetch(API_BASE + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_text: currentDocText, history: chatHistory.slice(-10), question })
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) throw new Error(data.error);

    appendBubble('assistant', data.reply);
    chatHistory.push({ role: 'assistant', content: data.reply });

    // Save to Supabase if logged in
    if (currentUser && currentDocId) {
      await sb.from('chat_messages').insert([
        { document_id: currentDocId, user_id: currentUser.id, role: 'user', content: question },
        { document_id: currentDocId, user_id: currentUser.id, role: 'assistant', content: data.reply }
      ]);
    }
  } catch (err) {
    typing.remove();
    appendBubble('assistant', '❌ Gagal memproses: ' + err.message);
  } finally {
    isProcessing = false;
    sendBtn.disabled = !chatInput.value.trim();
  }
}

function appendBubble(role, content) {
  const div = document.createElement('div');
  div.className = `chat-bubble ${role}`;
  div.innerHTML = role === 'user' ? escapeHTML(content) : markdownToHTML(content);
  const time = document.createElement('span');
  time.className = 'bubble-time';
  time.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  div.appendChild(time);
  chatMessages.appendChild(div);
  scrollChat();
}

function scrollChat() {
  requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
}

// ===== SUMMARY TOGGLE =====
$('summaryToggle').addEventListener('click', () => {
  summarySection.classList.toggle('collapsed');
});

// ===== SIDEBAR TOGGLE =====
$('sidebarToggle').addEventListener('click', () => {
  const sidebar = $('sidebar');
  sidebar.classList.toggle('collapsed');
  sidebar.classList.toggle('open');
});

// ===== HELPERS =====
function showLoading(text) { loadingText.textContent = text; loadingOverlay.classList.remove('hidden'); }
function setLoadingText(text) { loadingText.textContent = text; }
function hideLoading() { loadingOverlay.classList.add('hidden'); }

function showToast(message, type = 'success') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${escapeHTML(message)}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function markdownToHTML(md) {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[hulo])/gm, '')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return match;
    });
}

// ===== INIT =====
checkAuth();
