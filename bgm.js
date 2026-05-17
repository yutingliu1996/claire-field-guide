// Claire's Parlor · floating BGM pod
// Plays 网易云歌单 (Claire 喜欢的音乐 · 播客开头结尾背景音乐)
// 默认展开；用户可 ▼ 收起成圆球 / ✕ 完全关闭。状态走 localStorage。
// 浏览器自动播放限制：iframe 用 auto=1 请求播放，浏览器会等用户首次交互后才真正发声。

(function () {
  'use strict';

  var PLAYLIST_ID = '7247223624';
  var STORAGE_KEY = 'cp-bgm-state';   // 'open' | 'minimized' | 'closed'
  var DEFAULT_STATE = 'open';

  // ——————————————————————————————————————————————
  // CSS (inline 注入，避免新增 CSS 文件)
  // ——————————————————————————————————————————————
  var CSS = [
    '.cp-bgm-pod {',
    '  position: fixed; bottom: 20px; right: 20px; z-index: 9000;',
    '  width: 340px; max-width: calc(100vw - 32px);',
    '  background: rgba(255,255,255,0.96);',
    '  -webkit-backdrop-filter: saturate(180%) blur(18px);',
    '  backdrop-filter: saturate(180%) blur(18px);',
    '  border-radius: 22px;',
    '  padding: 12px 12px 10px;',
    '  box-shadow: 0 20px 44px rgba(0,0,0,0.14), 0 6px 14px rgba(0,0,0,0.08);',
    '  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;',
    '  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s ease, height 0.3s ease, padding 0.3s ease, border-radius 0.3s ease;',
    '  transform: translateY(0);',
    '}',
    '.cp-bgm-pod.is-closed { display: none; }',
    '.cp-bgm-pod.is-minimized {',
    '  width: 56px; height: 56px;',
    '  padding: 0; border-radius: 50%;',
    '  cursor: pointer;',
    '  display: grid; place-items: center;',
    '  background: #1a1a1a; color: #fff;',
    '}',
    '.cp-bgm-pod.is-minimized:hover { transform: translateY(-2px) scale(1.05); }',
    '.cp-bgm-pod.is-minimized .cp-bgm-tools,',
    '.cp-bgm-pod.is-minimized .cp-bgm-iframe-wrap { display: none; }',
    '.cp-bgm-pod .cp-bgm-min-icon { display: none; font-size: 26px; }',
    '.cp-bgm-pod.is-minimized .cp-bgm-min-icon {',
    '  display: block; animation: cpBgmSpin 4s linear infinite;',
    '  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));',
    '}',
    '@keyframes cpBgmSpin { to { transform: rotate(360deg); } }',
    '.cp-bgm-tools {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  margin-bottom: 8px;',
    '}',
    '.cp-bgm-label {',
    '  font-family: ui-monospace, "SF Mono", "Menlo", monospace;',
    '  font-size: 10.5px; letter-spacing: 0.16em;',
    '  text-transform: uppercase;',
    '  font-weight: 800; color: #1a1a1a;',
    '  display: inline-flex; align-items: center; gap: 8px;',
    '}',
    '.cp-bgm-label .vinyl { font-size: 14px; animation: cpBgmSpin 4s linear infinite; line-height: 1; }',
    '.cp-bgm-buttons { display: flex; gap: 6px; }',
    '.cp-bgm-btn {',
    '  width: 26px; height: 26px;',
    '  border-radius: 999px; border: none;',
    '  background: rgba(0,0,0,0.06); color: #1a1a1a;',
    '  cursor: pointer; font-size: 13px;',
    '  display: grid; place-items: center;',
    '  font-family: inherit; padding: 0;',
    '  transition: background 0.15s ease, transform 0.15s ease;',
    '}',
    '.cp-bgm-btn:hover { background: rgba(0,0,0,0.12); transform: scale(1.08); }',
    '.cp-bgm-btn:focus-visible { outline: 2px solid #4361EE; outline-offset: 2px; }',
    '.cp-bgm-iframe-wrap {',
    '  border-radius: 14px; overflow: hidden;',
    '  background: #f4f4f4;',
    '  line-height: 0;',
    '}',
    '.cp-bgm-iframe-wrap iframe {',
    '  display: block; width: 100%; height: 86px; border: 0;',
    '}',
    '@media (max-width: 700px) {',
    '  .cp-bgm-pod {',
    '    bottom: 12px; right: 12px; left: 12px;',
    '    width: auto; max-width: none;',
    '    padding: 10px 10px 8px;',
    '  }',
    '  .cp-bgm-pod.is-minimized {',
    '    left: auto; width: 52px; height: 52px;',
    '  }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .cp-bgm-label .vinyl,',
    '  .cp-bgm-pod.is-minimized .cp-bgm-min-icon { animation: none; }',
    '  .cp-bgm-pod { transition: none; }',
    '}'
  ].join('\n');

  // ——————————————————————————————————————————————
  // helpers
  // ——————————————————————————————————————————————
  function readState() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_STATE; }
    catch (e) { return DEFAULT_STATE; }
  }
  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, s); } catch (e) {}
  }

  // ——————————————————————————————————————————————
  // mount
  // ——————————————————————————————————————————————
  function mount() {
    // 防重复挂载（万一脚本被加载两次）
    if (document.getElementById('cpBgmPod')) return;

    var style = document.createElement('style');
    style.id = 'cpBgmStyle';
    style.textContent = CSS;
    document.head.appendChild(style);

    var pod = document.createElement('div');
    pod.className = 'cp-bgm-pod';
    pod.id = 'cpBgmPod';
    pod.setAttribute('role', 'region');
    pod.setAttribute('aria-label', "Claire's Parlor 背景音乐");
    pod.innerHTML = [
      '<div class="cp-bgm-min-icon" aria-hidden="true">🎧</div>',
      '<div class="cp-bgm-tools">',
      '  <span class="cp-bgm-label"><span class="vinyl" aria-hidden="true">💿</span> Parlor · BGM</span>',
      '  <div class="cp-bgm-buttons">',
      '    <button class="cp-bgm-btn" data-act="min" type="button" aria-label="收起播放器" title="收起">▾</button>',
      '    <button class="cp-bgm-btn" data-act="close" type="button" aria-label="关闭播放器" title="关闭">✕</button>',
      '  </div>',
      '</div>',
      '<div class="cp-bgm-iframe-wrap">',
      '  <iframe',
      '    src="//music.163.com/outchain/player?type=0&id=' + PLAYLIST_ID + '&auto=1&height=66"',
      '    width="100%" height="86"',
      '    frameborder="no" border="0"',
      '    marginwidth="0" marginheight="0"',
      '    loading="lazy"',
      '    title="Claire\'s Parlor 背景歌单"></iframe>',
      '</div>'
    ].join('\n');

    document.body.appendChild(pod);

    function applyState(state) {
      pod.classList.remove('is-minimized', 'is-closed');
      if (state === 'minimized') pod.classList.add('is-minimized');
      if (state === 'closed') pod.classList.add('is-closed');
    }
    function setState(state) {
      saveState(state);
      applyState(state);
    }

    // 按钮事件
    pod.querySelector('[data-act="min"]').addEventListener('click', function (e) {
      e.stopPropagation();
      setState('minimized');
    });
    pod.querySelector('[data-act="close"]').addEventListener('click', function (e) {
      e.stopPropagation();
      setState('closed');
    });
    // 圆球态点击 → 展开
    pod.addEventListener('click', function () {
      if (pod.classList.contains('is-minimized')) setState('open');
    });

    applyState(readState());

    // 公开 API：给 #tunes section 的"重新打开 BGM"按钮用
    window.cpBgmReopen = function () { setState('open'); };
    window.cpBgmMinimize = function () { setState('minimized'); };
    window.cpBgmClose = function () { setState('closed'); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
