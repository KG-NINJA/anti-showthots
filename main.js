// 歩きスマホ検知アプリ
// 加速度センサー＋画面ONで警告

const statusEl = document.getElementById('status');
const testBtn = document.getElementById('testBtn');
const permissionWrap = document.getElementById('permissionWrap');
const motionPermissionBtn = document.getElementById('motionPermissionBtn');
const permissionMsg = document.getElementById('permissionMsg');
const mainUI = document.getElementById('mainUI');
const wakeLockBtn = document.getElementById('wakeLockBtn');
const wakeLockState = document.getElementById('wakeLockState');

// Wake Lock API
let wakeLock = null;
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLockState.textContent = '画面ON維持中';
      wakeLockBtn.textContent = '画面ON維持を解除';
      wakeLock.addEventListener('release', () => {
        wakeLockState.textContent = '解除されました';
        wakeLockBtn.textContent = '画面ON維持（Wake Lock）';
      });
    } catch (e) {
      wakeLockState.textContent = 'Wake Lock取得失敗';
    }
  } else {
    wakeLockState.textContent = 'Wake Lock非対応端末';
  }
}
function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
    wakeLockState.textContent = '解除されました';
    wakeLockBtn.textContent = '画面ON維持（Wake Lock）';
  }
}
if (wakeLockBtn) {
  wakeLockBtn.addEventListener('click', () => {
    if (!wakeLock) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  });
}
// ページ非表示でWake Lock解除
if (typeof document.visibilityState !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wakeLock && document.visibilityState !== 'visible') {
      releaseWakeLock();
    }
  });
}

function enableMainUI() {
  if (permissionWrap) permissionWrap.style.display = 'none';
  if (mainUI) mainUI.style.display = '';
  startMotionWatch();
}

function startMotionWatch() {
  // 加速度センサーイベント登録
  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', handleMotion);
  } else {
    if(statusEl) statusEl.textContent = '加速度センサー非対応の端末です。';
  }
}

// iOS13+ の場合はユーザー操作で許可が必要
function isIOS() {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

if (motionPermissionBtn) {
  motionPermissionBtn.addEventListener('click', async () => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      try {
        const r = await DeviceMotionEvent.requestPermission();
        if (r === 'granted') {
          enableMainUI();
        } else {
          if(permissionMsg) permissionMsg.textContent = 'センサー利用が許可されませんでした。';
        }
      } catch(e) {
        if(permissionMsg) permissionMsg.textContent = 'センサー利用許可リクエストに失敗しました。';
      }
    }
  });
}

// 非iOSや許可不要な場合は自動でUI表示
if (
  typeof DeviceMotionEvent === 'undefined' ||
  typeof DeviceMotionEvent.requestPermission !== 'function' ||
  !isIOS()
) {
  enableMainUI();
}

let moving = false;
let moveTimer = null;
let lastAccel = {x: null, y: null, z: null};
let alertActive = false;

let pendingAlertTimer = null;

// 感度スライダー
let sensitivity = parseFloat(localStorage.getItem('sensitivity')) || 1.0;
const sensitivitySlider = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
if (sensitivitySlider && sensitivityValue) {
  sensitivitySlider.value = sensitivity;
  sensitivityValue.textContent = sensitivity;
  sensitivitySlider.addEventListener('input', e => {
    sensitivity = parseFloat(e.target.value);
    sensitivityValue.textContent = sensitivity;
    localStorage.setItem('sensitivity', sensitivity);
  });
}

// 通知許可リクエスト（初回）
if (window.Notification && Notification.permission === 'default') {
  Notification.requestPermission();
}

// 歩きスマホ警告を発動
function triggerAlert() {
  if (alertActive) return;
  alertActive = true;
  statusEl.textContent = '歩きスマホ注意！';
  statusEl.classList.add('alert');
  // Web Push通知
  if (window.Notification && Notification.permission === 'granted') {
    new Notification('歩きスマホ注意', {
      body: '歩きスマホは危険です。周囲に注意しましょう。',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/9/99/OOjs_UI_icon_alert-yellow.svg'
    });
  }
  // バイブ
  if (navigator.vibrate) navigator.vibrate([400,200,400]);
  // 音声
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance('歩きスマホは危険です。周囲に注意しましょう。');
    utter.lang = 'ja-JP';
    window.speechSynthesis.speak(utter);
  }
  // ビープ音
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYwAAAB///8AAP//AAD//wAA//8AAP//AAD//wAA');
    audio.play();
  } catch(e) {}
  setTimeout(() => { alertActive = false; }, 5000);
}

// テストボタン
if (testBtn) {
  testBtn.addEventListener('click', triggerAlert);
}

// 加速度センサーで「端末が動いている」か判定
function handleMotion(event) {
  const { x, y, z } = event.accelerationIncludingGravity;
  if (lastAccel.x === null) {
    lastAccel = {x, y, z};
    return;
  }
  const dx = Math.abs(x - lastAccel.x);
  const dy = Math.abs(y - lastAccel.y);
  const dz = Math.abs(z - lastAccel.z);
  lastAccel = {x, y, z};
  // 動きが大きければ「移動中」とみなす
  if (dx > sensitivity || dy > sensitivity || dz > sensitivity) {
    if (!moving) {
      moving = true;
      // 3秒間動きが継続したら警告
      if (pendingAlertTimer) clearTimeout(pendingAlertTimer);
      pendingAlertTimer = setTimeout(() => {
        if (moving) triggerAlert();
      }, 3000);
    }
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      moving = false;
      if (pendingAlertTimer) {
        clearTimeout(pendingAlertTimer);
        pendingAlertTimer = null;
      }
    }, 2000);
  }
}

// 画面ONかどうかはWebでは明示的には取れないが、画面がアクティブな間のみ監視
function checkWalkingSmartphone() {
  if (moving && document.visibilityState === 'visible') {
    triggerAlert();
  } else {
    statusEl.textContent = '端末の動きを検知中...';
    statusEl.classList.remove('alert');
  }
}

// 加速度センサーイベント登録
if (window.DeviceMotionEvent) {
  window.addEventListener('devicemotion', handleMotion);
} else {
  statusEl.textContent = '加速度センサー非対応の端末です。';
}

// 1秒ごとに歩きスマホ状態をチェック
setInterval(checkWalkingSmartphone, 1000);
