// 歩きスマホ検知アプリ
// 加速度センサー＋画面ONで警告

const statusEl = document.getElementById('status');
const testBtn = document.getElementById('testBtn');

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
