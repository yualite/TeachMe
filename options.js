const apiKeyInput = document.getElementById('apiKeyInput');
const toggleBtn = document.getElementById('toggleVisibility');
const saveBtn = document.getElementById('saveBtn');
const messageEl = document.getElementById('message');

chrome.storage.sync.get('apiKey', ({ apiKey }) => {
  if (apiKey) apiKeyInput.value = apiKey;
});

toggleBtn.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleBtn.textContent = isPassword ? '🙈' : '👁';
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showMessage('APIキーを入力してください', 'error');
    return;
  }
  if (!key.startsWith('AIza')) {
    showMessage('APIキーの形式が正しくないようです（"AIza"で始まるはずです）', 'error');
    return;
  }
  chrome.storage.sync.set({ apiKey: key }, () => {
    showMessage('✅ 保存しました！', 'success');
  });
});

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  clearTimeout(messageEl._timer);
  messageEl._timer = setTimeout(() => {
    messageEl.className = 'message';
  }, 3500);
}
