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
    analyzeScreen(message.tabId);
  }
});

async function analyzeScreen(tabId) {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (!apiKey || apiKey.trim() === '') {
    chrome.tabs.sendMessage(tabId, {
      type: 'TM_ERROR',
      content: 'APIキーが未設定です。拡張機能を右クリック→オプションで設定してください。'
    }).catch(() => {});
    return;
  }

  // ① オーバーレイが写り込む前にスクリーンショットを撮る
  let screenshot;
  try {
    screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 90 });
  } catch (e) {
    chrome.tabs.sendMessage(tabId, {
      type: 'TM_ERROR',
      content: `スクリーンショットの取得に失敗しました: ${e.message}`
    }).catch(() => {});
    return;
  }

  // ② スクショ撮影後にローディングオーバーレイを表示
  chrome.tabs.sendMessage(tabId, { type: 'TM_LOADING' }).catch(() => {});

  // ③ 高DPI対策: OffscreenCanvas で最大1280px幅にリサイズ
  const raw = screenshot.replace(/^data:image\/jpeg;base64,/, '');
  const base64Image = await resizeToMax(raw, 1280);

  // ④ Gemini API 呼び出し
  let response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000
        }
      })
    });
  } catch (e) {
    chrome.tabs.sendMessage(tabId, { type: 'TM_ERROR', content: `ネットワークエラー: ${e.message}` }).catch(() => {});
    return;
  }

  if (!response.ok) {
    let errMsg = `APIエラー (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || errMsg;
    } catch (_) {}
    chrome.tabs.sendMessage(tabId, { type: 'TM_ERROR', content: errMsg }).catch(() => {});
    return;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    chrome.tabs.sendMessage(tabId, { type: 'TM_ERROR', content: 'Gemini APIから応答を取得できませんでした。' }).catch(() => {});
    return;
  }

  chrome.tabs.sendMessage(tabId, { type: 'TM_ANSWER', content: text }).catch(() => {});
}

/**
 * OffscreenCanvas を使って画像を maxWidth px 以内にリサイズする。
 * 高DPI (Retina/4K) 環境で撮影される過大な画像を圧縮し API 転送量を削減する。
 */
async function resizeToMax(base64, maxWidth) {
  try {
    const blob = await fetch(`data:image/jpeg;base64,${base64}`).then(r => r.blob());
    const bitmap = await createImageBitmap(blob);

    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.floor(bitmap.width * scale);
    const h = Math.floor(bitmap.height * scale);

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const resizedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
    const buf = await resizedBlob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    // チャンク変換でスタックオーバーフロー防止
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  } catch (_) {
    return base64; // リサイズ失敗時はオリジナルをそのまま使用
  }
}
