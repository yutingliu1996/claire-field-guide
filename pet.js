// Claire's Parlor · 铜板儿桌面宠物
// 左下角浮窗。emoji 🐱 占位——未来替换 .cp-pet-emoji 内层为 <img src="tongbar.png"> 即可。
// 行为：idle 浮动 + 偶尔自言自语气泡 + 点击立刻说话。
// 桌面端显示，移动端隐藏（"桌面"宠物，名实相符）。
// localStorage: cp-pet-state = 'on' | 'off'

(function () {
  'use strict';

  var STORAGE_KEY = 'cp-pet-state';
  var DEFAULT_STATE = 'on';

  // 铜板儿可能会说的话（占位文案，可随时改）
  var SAYINGS = [
    '喵——',
    'Claire 在写东西呢...',
    '我是铜板儿，2023 年生 🐾',
    '听 BGM 吗？右下角那个 ♪',
    '今天可以摸我',
    '我在打盹儿... 别吵',
    '梳毛球的时间到了 🪥',
    '猫不会出错，只是按计划躺平',
    '下期 Vol 还没录，Claire 又拖延了',
    '你点点我，我会摇尾巴',
    'Claire 说我会变成 mascot 的',
    '走，去 #bookshelf 转转',
    '工作坊见 ☕',
    '嗷呜...（其实是猫）'
  ];

  var GREET_DELAY_MS = 1800;             // 进站后多久说第一句
  var IDLE_MIN_MS = 25000;               // idle 自语最短间隔
  var IDLE_MAX_MS = 50000;               // idle 自语最长间隔
  var BUBBLE_SHOW_MS = 4500;             // 一句话气泡显示时长

  // ——————————————————————————————————————————————
  // CSS（避开新增文件，自注入 <style>）
  // ——————————————————————————————————————————————
  var CSS = [
    '.cp-pet-pod {',
    '  position: fixed; bottom: 22px; left: 22px;',
    '  z-index: 8500;', /* below BGM (9000), above content */
    '  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;',
    '  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif;',
    '}',
    '.cp-pet-pod.is-hidden { display: none; }',

    '.cp-pet-bubble {',
    '  position: relative;',
    '  background: #1a1a1a; color: #fff;',
    '  padding: 9px 14px 10px;',
    '  border-radius: 16px;',
    '  font-size: 13.5px; line-height: 1.45;',
    '  font-weight: 500;',
    '  max-width: 230px;',
    '  box-shadow: 0 10px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10);',
    '  opacity: 0;',
    '  transform: translateY(8px) scale(0.92);',
    '  pointer-events: none;',
    '  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);',
    '}',
    '.cp-pet-bubble.is-visible {',
    '  opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;',
    '}',
    '.cp-pet-bubble::after {',
    '  content: "";',
    '  position: absolute; left: 24px; bottom: -5px;',
    '  width: 12px; height: 12px;',
    '  background: #1a1a1a;',
    '  transform: rotate(45deg);',
    '  border-radius: 2px;',
    '}',

    '.cp-pet-avatar {',
    '  position: relative;',
    '  width: 64px; height: 64px;',
    '  border-radius: 50%;',
    '  background: radial-gradient(circle at 30% 30%, #FFF1C2 0%, #FFE4E0 70%, #FFD0CC 100%);',
    '  display: grid; place-items: center;',
    '  cursor: pointer;',
    '  box-shadow: 0 14px 30px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.09), inset 0 -4px 0 rgba(0,0,0,0.06);',
    '  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;',
    '  animation: cpPetBob 3.6s ease-in-out infinite;',
    '  user-select: none;',
    '}',
    '.cp-pet-avatar:hover { transform: scale(1.08) rotate(-5deg); box-shadow: 0 18px 36px rgba(0,0,0,0.22), 0 6px 12px rgba(0,0,0,0.10); }',
    '.cp-pet-avatar:active { transform: scale(0.94); animation-play-state: paused; }',

    '.cp-pet-emoji {',
    '  font-size: 38px; line-height: 1;',
    '  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.18));',
    '  display: inline-block;',
    '  transition: transform 0.35s ease;',
    '}',
    '.cp-pet-avatar:active .cp-pet-emoji { transform: scale(1.2) rotate(8deg); }',

    /* 关闭按钮：默认隐藏，hover/focus 时浮出 */
    '.cp-pet-close {',
    '  position: absolute;',
    '  top: -4px; right: -4px;',
    '  width: 22px; height: 22px;',
    '  border-radius: 50%; border: none;',
    '  background: #fff; color: #333;',
    '  display: grid; place-items: center;',
    '  font-size: 10px; font-weight: 900;',
    '  cursor: pointer;',
    '  padding: 0;',
    '  box-shadow: 0 2px 6px rgba(0,0,0,0.22);',
    '  opacity: 0; transform: scale(0.5);',
    '  transition: opacity 0.18s ease, transform 0.18s ease;',
    '  font-family: inherit;',
    '}',
    '.cp-pet-pod:hover .cp-pet-close,',
    '.cp-pet-pod:focus-within .cp-pet-close { opacity: 1; transform: scale(1); }',
    '.cp-pet-close:hover { background: #1a1a1a; color: #fff; }',

    /* idle bobbing */
    '@keyframes cpPetBob {',
    '  0%, 100% { transform: translateY(0); }',
    '  50% { transform: translateY(-5px); }',
    '}',

    /* mobile: 完全隐藏（桌面宠物名副其实） */
    '@media (max-width: 700px) {',
    '  .cp-pet-pod { display: none !important; }',
    '}',

    /* 用户偏好减少动效 */
    '@media (prefers-reduced-motion: reduce) {',
    '  .cp-pet-avatar { animation: none; }',
    '  .cp-pet-bubble { transition: opacity 0.2s ease; }',
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
  function pickSaying(last) {
    // 避免连续两次同一句
    var i = Math.floor(Math.random() * SAYINGS.length);
    if (SAYINGS[i] === last && SAYINGS.length > 1) i = (i + 1) % SAYINGS.length;
    return SAYINGS[i];
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

  // ——————————————————————————————————————————————
  // mount
  // ——————————————————————————————————————————————
  function mount() {
    if (document.getElementById('cpPetPod')) return; // 防重复

    var style = document.createElement('style');
    style.id = 'cpPetStyle';
    style.textContent = CSS;
    document.head.appendChild(style);

    var pod = document.createElement('div');
    pod.className = 'cp-pet-pod';
    pod.id = 'cpPetPod';
    pod.setAttribute('aria-label', '铜板儿 · 桌面宠物');
    pod.innerHTML = [
      '<div class="cp-pet-bubble" id="cpPetBubble" role="status" aria-live="polite"></div>',
      '<div class="cp-pet-avatar" id="cpPetAvatar" role="button" tabindex="0" aria-label="点点铜板儿">',
      '  <span class="cp-pet-emoji">🐱</span>',
      '  <button class="cp-pet-close" data-act="close" type="button" aria-label="收起铜板儿" title="收起">✕</button>',
      '</div>'
    ].join('\n');
    document.body.appendChild(pod);

    var bubble = pod.querySelector('#cpPetBubble');
    var avatar = pod.querySelector('#cpPetAvatar');
    var closeBtn = pod.querySelector('[data-act="close"]');

    var hideTimer = null;
    var idleTimer = null;
    var lastSaid = '';

    function showSaying(text) {
      if (!text) text = pickSaying(lastSaid);
      lastSaid = text;
      bubble.textContent = text;
      bubble.classList.add('is-visible');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        bubble.classList.remove('is-visible');
      }, BUBBLE_SHOW_MS);
      scheduleIdle(); // 说话后重新排队下一句
    }

    function scheduleIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        // 当用户视线不在标签上时也保持静音
        if (document.visibilityState === 'visible') showSaying();
        else scheduleIdle();
      }, rand(IDLE_MIN_MS, IDLE_MAX_MS));
    }

    function applyState(state) {
      pod.classList.toggle('is-hidden', state === 'off');
    }
    function setState(state) {
      saveState(state);
      applyState(state);
      if (state === 'off') {
        if (hideTimer) clearTimeout(hideTimer);
        if (idleTimer) clearTimeout(idleTimer);
      } else {
        scheduleIdle();
      }
    }

    // 点头像：立刻说话
    avatar.addEventListener('click', function (e) {
      if (e.target === closeBtn || closeBtn.contains(e.target)) return;
      showSaying();
    });
    avatar.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSaying(); }
    });
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setState('off');
    });

    // 标签切回前台时，重新排队
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && readState() === 'on') scheduleIdle();
    });

    // 初始状态
    applyState(readState());

    // 进站打招呼 + 启动 idle
    if (readState() === 'on') {
      setTimeout(function () { showSaying('喵——欢迎来 Claire 的客厅 ☕'); }, GREET_DELAY_MS);
    }

    // 公开 API（给未来 settings UI 或者主页"再叫回铜板儿"按钮用）
    window.cpPetReopen = function () { setState('on'); showSaying('我又回来啦 🐾'); };
    window.cpPetClose = function () { setState('off'); };
    window.cpPetSay = function (text) { setState('on'); showSaying(text || pickSaying(lastSaid)); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
