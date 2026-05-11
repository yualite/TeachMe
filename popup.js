const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('status');
const apiDot = document.getElementById('apiDot');
const apiStatusText = document.getElementById('apiStatusText');
const optionsLink = document.getElementById('optionsLink');

async function checkApiKey() {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (apiKey && apiKey.trim() !== '') {
    apiDot.className = 'dot ok';
    apiStatusText.textContent = 'APIキー設定済み';
    analyzeBtn.disabled = false;
  } else {
    apiDot.className = 'dot ng';
    apiStatusText.textContent = 'APIキー未設定';
    analyzeBtn.disabled = true;
  }
}

analyzeBtn.addEventListener('click', async () => {
  analyzeBtn.disabled = true;
  setStatus('', '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus('タブの取得に失敗しました', 'error');
    analyzeBtn.disabled = false;
    return;
  }

  // Show loading overlay on the page
  await chrome.tabs.sendMessage(tab.id, { type: 'TM_LOADING' }).catch(() => {});

  setStatus('解析中...', '');
  window.close();

  // Ask background to analyze
  chrome.runtime.sendMessage({ type: 'ANALYZE_SCREEN', tabId: tab.id }, async (result) => {
    if (!result) return;
    if (result.error) {
      await chrome.tabs.sendMessage(tab.id, { type: 'TM_ERROR', content: result.error }).catch(() => {});
    } else {
      await chrome.tabs.sendMessage(tab.id, { type: 'TM_ANSWER', content: result.answer }).catch(() => {});
    }
  });
});

optionsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

checkApiKey();

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (type ? ` ${type}` : '');
}
