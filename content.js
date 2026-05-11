(() => {
  let hostEl = null;
  let shadow = null;
  let overlay = null;
  let isMinimized = false;

  function initOverlay() {
    if (hostEl) return;

    hostEl = document.createElement('div');
    hostEl.id = 'teachme-shadow-host';
    hostEl.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(hostEl);

    shadow = hostEl.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; }

      #overlay {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 380px;
        max-height: 75vh;
        background: #1a1a2e;
        border: 1px solid #4a90d9;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,144,217,0.2);
        font-family: 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif;
        font-size: 14px;
        color: #e0e0e0;
        display: flex;
        flex-direction: column;
        pointer-events: all;
        transition: box-shadow 0.2s;
        user-select: none;
      }

      #overlay.dragging {
        box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 0 0 2px rgba(74,144,217,0.5);
        opacity: 0.95;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: linear-gradient(135deg, #1e3a5f, #2d6a9f);
        border-radius: 11px 11px 0 0;
        cursor: grab;
        gap: 8px;
      }

      .header:active { cursor: grabbing; }

      .header-title {
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.3px;
        flex: 1;
      }

      .header-controls {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .ctrl-btn {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
        color: #fff;
      }

      .ctrl-btn.minimize {
        background: rgba(255,255,255,0.15);
      }
      .ctrl-btn.minimize:hover { background: rgba(255,255,255,0.3); }

      .ctrl-btn.close {
        background: rgba(220,50,50,0.6);
      }
      .ctrl-btn.close:hover { background: rgba(220,50,50,0.9); }

      .body {
        overflow-y: auto;
        padding: 14px;
        flex: 1;
        line-height: 1.65;
        scrollbar-width: thin;
        scrollbar-color: #4a90d9 #1a1a2e;
      }

      .body::-webkit-scrollbar { width: 6px; }
      .body::-webkit-scrollbar-track { background: #1a1a2e; }
      .body::-webkit-scrollbar-thumb { background: #4a90d9; border-radius: 3px; }

      .loading {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        color: #7eb8f7;
      }

      .spinner {
        width: 22px;
        height: 22px;
        border: 3px solid rgba(74,144,217,0.2);
        border-top-color: #4a90d9;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin { to { transform: rotate(360deg); } }

      .error-box {
        background: rgba(180,40,40,0.15);
        border: 1px solid rgba(220,60,60,0.4);
        border-radius: 8px;
        padding: 12px;
        color: #ff8080;
        line-height: 1.6;
      }

      .answer-box { color: #dde8f5; }

      .answer-box h1, .answer-box h2 {
        color: #7eb8f7;
        margin: 14px 0 6px;
        font-size: 15px;
        border-bottom: 1px solid rgba(74,144,217,0.3);
        padding-bottom: 4px;
      }
      .answer-box h1:first-child,
      .answer-box h2:first-child { margin-top: 0; }

      .answer-box h3 {
        color: #a8d0f5;
        margin: 10px 0 4px;
        font-size: 14px;
      }

      .answer-box p { margin: 6px 0; }

      .answer-box strong { color: #ffd080; }

      .answer-box em { color: #b0d8ff; font-style: normal; }

      .answer-box code {
        background: rgba(255,255,255,0.08);
        padding: 1px 5px;
        border-radius: 3px;
        font-family: 'Consolas', monospace;
        font-size: 13px;
        color: #90e0a0;
      }

      .answer-box pre {
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        padding: 10px;
        overflow-x: auto;
        margin: 8px 0;
      }

      .answer-box pre code {
        background: none;
        padding: 0;
        font-size: 13px;
      }

      .answer-box hr {
        border: none;
        border-top: 1px solid rgba(255,255,255,0.1);
        margin: 10px 0;
      }

      .answer-box ul, .answer-box ol {
        padding-left: 20px;
        margin: 6px 0;
      }

      .answer-box li { margin: 3px 0; }

      #overlay.minimized .body { display: none; }
      #overlay.minimized { border-radius: 12px; }
    `;

    overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.innerHTML = `
      <div class="header">
        <span class="header-title">🎓 TeachMe AI</span>
        <div class="header-controls">
          <button class="ctrl-btn minimize" title="最小化">−</button>
          <button class="ctrl-btn close" title="閉じる">×</button>
        </div>
      </div>
      <div class="body"></div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(overlay);

    overlay.querySelector('.minimize').addEventListener('click', () => {
      isMinimized = !isMinimized;
      overlay.classList.toggle('minimized', isMinimized);
      overlay.querySelector('.minimize').textContent = isMinimized ? '+' : '−';
    });

    overlay.querySelector('.close').addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    makeDraggable(overlay, shadow);
  }

  function makeDraggable(el, root) {
    const header = el.querySelector('.header');
    let dragging = false;
    let ox = 0, oy = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      const rect = el.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      el.classList.add('dragging');
      el.style.right = 'auto';
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';
      e.preventDefault();
    });

    root.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - oy));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - oy));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });

    const stopDrag = () => {
      dragging = false;
      el.classList.remove('dragging');
    };
    document.addEventListener('mouseup', stopDrag);
    root.addEventListener('mouseup', stopDrag);
  }

  function setBody(html) {
    initOverlay();
    overlay.style.display = 'flex';
    if (isMinimized) {
      isMinimized = false;
      overlay.classList.remove('minimized');
      overlay.querySelector('.minimize').textContent = '−';
    }
    overlay.querySelector('.body').innerHTML = html;
  }

  function renderMarkdown(text) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped
      .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(?!<[h|u|o|p|l|h])/gm, '')
      .replace(/^(.+?)(<br>|$)/gm, (_, line) => {
        if (/^<[h1-6|ul|ol|li|hr|pre]/.test(line)) return line;
        return `<p>${line}</p>`;
      });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TM_LOADING') {
      setBody(`<div class="loading"><div class="spinner"></div><span>Gemini AIが解析中...</span></div>`);
    } else if (message.type === 'TM_ANSWER') {
      setBody(`<div class="answer-box">${renderMarkdown(message.content)}</div>`);
    } else if (message.type === 'TM_ERROR') {
      setBody(`<div class="error-box">⚠️ ${message.content}</div>`);
    }
  });
})();
