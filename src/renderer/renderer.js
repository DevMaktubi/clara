const $ = (sel) => document.querySelector(sel);
const dirInput = $('#dir');
const extInput = $('#ext');
const startInput = $('#start');
const summary = $('#summary');
const resultsBody = $('#resultsBody');
const logsEl = $('#logs');
const runBtn = $('#run');
const undoBtn = $('#undo');
const toastEl = $('#toast');

let lastOperationId = null;

function appendLog(line) {
  logsEl.textContent += `${line}\n`;
  logsEl.scrollTop = logsEl.scrollHeight;
}

function setSummary(text) {
  summary.textContent = text;
}

function renderResults(items) {
  resultsBody.innerHTML = '';
  for (const item of items) {
    const tr = document.createElement('tr');
    const dateStr = item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-';
    const pageStr = item.page ?? '-';
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${dateStr}</td>
      <td>${pageStr}</td>
    `;
    resultsBody.appendChild(tr);
  }
}

function setRunEnabled(enabled) {
  if (enabled) runBtn.removeAttribute('disabled');
  else runBtn.setAttribute('disabled', 'true');
}

function setUndoEnabled(enabled) {
  if (enabled) undoBtn.removeAttribute('disabled');
  else undoBtn.setAttribute('disabled', 'true');
}

function showToast(text, timeout = 2500) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.hidden = false;
  setTimeout(() => {
    toastEl.hidden = true;
  }, timeout);
}

$('#chooseDir').addEventListener('click', async () => {
  const dir = await window.clara.openDirectory();
  if (dir) dirInput.value = dir;
});

$('#scan').addEventListener('click', async () => {
  const dir = dirInput.value.trim();
  // ext é um <select> já referenciado por extInput
  const extension = extInput.value.trim();
  if (!dir) {
    setSummary('Selecione uma pasta.');
    return;
  }
  setSummary('Analisando...');
  const res = await window.clara.scan({ dir, extension });
  setSummary(`Arquivos totais: ${res.total} | Com data/página: ${res.matched}`);
  renderResults(res.items);
  setRunEnabled(res.matched > 0);
});

$('#run').addEventListener('click', async () => {
  const dir = dirInput.value.trim();
  const extension = extInput.value.trim();
  const startNumber = parseInt(startInput.value, 10) || 1;
  if (!dir) {
    setSummary('Selecione uma pasta.');
    return;
  }
  setSummary('Renomeando...');
  // limpar logs antes de renomear
  logsEl.textContent = '';
  const res = await window.clara.run({ dir, extension, startNumber });
  lastOperationId = res.operationId || null;
  setSummary(`Renomeados: ${res.renamed}`);
  showToast(`Renomeação concluída${res.renamed ? `: ${res.renamed} arquivo(s)` : ''}`);
  setUndoEnabled(!!res.renamed);
  const scan = await window.clara.scan({ dir, extension });
  renderResults(scan.items);
  setRunEnabled(scan.matched > 0);
});

$('#undo').addEventListener('click', async () => {
  const res = await window.clara.undo({ operationId: lastOperationId });
  setSummary(`Desfeitos: ${res.undone}${res.errors?.length ? ` | Erros: ${res.errors.length}` : ''}`);
  // Após desfazer, desativa o botão até nova renomeação
  setUndoEnabled(false);
});

const off = window.clara.onLog((msg) => appendLog(msg));
window.addEventListener('beforeunload', () => off && off());
// Estado inicial seguro
setRunEnabled(false);
setUndoEnabled(false);

// Captura erros não tratados no renderer e mostra nos logs
window.addEventListener('error', (e) => appendLog(`Renderer error: ${e.message}`));
window.addEventListener('unhandledrejection', (e) => appendLog(`Unhandled: ${e.reason?.message || e.reason}`));

// Info modal wiring
const infoBtn = document.querySelector('#infoBtn');
const infoModal = document.querySelector('#infoModal');
const infoOverlay = document.querySelector('#infoOverlay');
const infoClose = document.querySelector('#infoClose');

function openInfo() {
  if (infoOverlay) infoOverlay.hidden = false;
  if (infoModal) {
    infoModal.hidden = false;
    infoModal.focus();
  }
}
function closeInfo() {
  if (infoOverlay) infoOverlay.hidden = true;
  if (infoModal) infoModal.hidden = true;
  if (infoBtn) infoBtn.focus();
}

if (infoBtn && infoModal && infoOverlay && infoClose) {
  infoBtn.addEventListener('click', openInfo);
  infoClose.addEventListener('click', closeInfo);
  infoOverlay.addEventListener('click', closeInfo);
  window.addEventListener('keydown', (e) => {
    if (!infoModal.hidden && e.key === 'Escape') closeInfo();
  });
}
