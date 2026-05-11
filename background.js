const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT = `あなたは優秀な家庭教師です。
画面に表示されている問題・質問を見つけて、丁寧に解説してください。

以下の形式で答えてください：

## 📋 問題の概要
（何を求めているか簡潔に）

## 🔍 解き方・アプローチ
（ステップバイステップの解説。数学なら計算過程、英語なら文法解説など）

## ✅ 答え
（最終的な答えを明確に）

---
問題が画面に見当たらない場合は「画面に解答すべき問題が見つかりませんでした」とだけ答えてください。`;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ANALYZE_SCREEN') {
    analyzeScreen(message.tabId).then(result => {
      const type = result.error ? 'TM_ERROR' : 'TM_ANSWER';
      const content = result.error ?? result.answer;
      chrome.tabs.sendMessage(message.tabId, { type, content }).catch(() => {});
    });
  }
});

async function analyzeScreen(tabId) {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (!apiKey || apiKey.trim() === '') {
    return { error: 'APIキーが未設定です。拡張機能のオプションページ（右クリック→オプション）で設定してください。' };
  }

  let screenshot;
  try {
    screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 });
  } catch (e) {
    return { error: `スクリーンショットの取得に失敗しました: ${e.message}` };
  }

  const base64Image = screenshot.replace(/^data:image\/jpeg;base64,/, '');

  let response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000
        }
      })
    });
  } catch (e) {
    return { error: `ネットワークエラー: ${e.message}` };
  }

  if (!response.ok) {
    let errMsg = `APIエラー (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || errMsg;
    } catch (_) {}
    return { error: errMsg };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return { error: 'Gemini APIから応答を取得できませんでした。' };
  }

  return { answer: text };
}
