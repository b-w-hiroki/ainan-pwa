const manifest = await fetch('./animation-manifest.json').then((response) => response.json());
const actor = document.querySelector('#actor');
const poseA = document.querySelector('#poseA');
const poseB = document.querySelector('#poseB');
const shaft = document.querySelector('#rodShaft');
const line = document.querySelector('#fishingLine');
const grip = document.querySelector('#gripMarker');
const phaseLabel = document.querySelector('#phaseLabel');
const stateLabel = document.querySelector('#stateLabel');
const statusState = document.querySelector('#statusState');
const statusRun = document.querySelector('#statusRun');
const statusGuard = document.querySelector('#statusGuard');
const speedControl = document.querySelector('#speed');
const loopControl = document.querySelector('#loop');
const labels = { cast: 'キャスト', fight: '引きに抵抗', joy: '釣れた！', sad: '逃げられた…' };

let selected = 'cast';
let runToken = 0;
let running = false;
let paused = false;
let pauseStarted = 0;
let hiddenPause = 0;
let visibleLayer = 'a';
let activeTimer;

function poseMeta(name) { return manifest.poses[name]; }
function setRod(meta) {
  if (!meta.grip || !meta.rodTip) return;
  const [gx, gy] = meta.grip;
  const [tx, ty] = meta.rodTip;
  shaft.setAttribute('d', `M${gx} ${gy} L${tx} ${ty}`);
  const lineEndX = Math.min(316, Math.max(12, tx + (tx > gx ? 28 : -28)));
  line.setAttribute('d', `M${tx} ${ty} Q${lineEndX} ${(ty + gy) / 2} ${lineEndX} 300`);
  grip.setAttribute('cx', gx);
  grip.setAttribute('cy', gy);
}

function setPose(name, phase = name) {
  const meta = poseMeta(name);
  const next = visibleLayer === 'a' ? poseB : poseA;
  const previous = visibleLayer === 'a' ? poseA : poseB;
  next.src = meta.file;
  next.style.opacity = '1';
  previous.style.opacity = '0';
  visibleLayer = visibleLayer === 'a' ? 'b' : 'a';
  actor.dataset.pose = name;
  actor.classList.toggle('hide-rod', name.startsWith('joy'));
  actor.classList.toggle('show-fish', name === 'joy-hold');
  actor.classList.toggle('shift-left', name === 'fight-left');
  actor.classList.toggle('shift-right', name === 'fight-right');
  setRod(meta);
  phaseLabel.textContent = phase;
  window.dispatchEvent(new CustomEvent('ainan:pose', { detail: { state: selected, pose: name, phase } }));
}

function delay(ms, token) {
  return new Promise((resolve) => {
    const start = performance.now();
    function tick(now) {
      if (token !== runToken) return resolve(false);
      if (paused) { activeTimer = requestAnimationFrame(tick); return; }
      const elapsed = now - start - hiddenPause;
      if (elapsed >= ms / Number(speedControl.value)) return resolve(true);
      activeTimer = requestAnimationFrame(tick);
    }
    hiddenPause = 0;
    activeTimer = requestAnimationFrame(tick);
  });
}

async function play({ restart = false } = {}) {
  if (running && !restart) {
    statusGuard.textContent = '重複を無視';
    return false;
  }
  stop(false);
  const token = ++runToken;
  running = true;
  paused = false;
  statusRun.textContent = '再生中';
  statusGuard.textContent = 'single run';
  const animation = manifest.animations[selected];
  do {
    for (let index = 0; index < animation.phases.length; index += 1) {
      const [pose, duration] = animation.phases[index];
      setPose(pose, ['準備', '主動作', 'フォロースルー', '余韻', '待機へ復帰'][Math.min(index, 4)]);
      if (!await delay(duration, token)) return false;
    }
  } while (token === runToken && (animation.mode === 'loop' || loopControl.checked));
  if (token === runToken) {
    setPose('idle', 'idle');
    running = false;
    statusRun.textContent = '完了 → 待機';
  }
  return true;
}

function stop(showStatus = true) {
  runToken += 1;
  cancelAnimationFrame(activeTimer);
  running = false;
  paused = false;
  setPose('idle', 'idle');
  if (showStatus) statusRun.textContent = '停止 → 待機';
}

function pause() {
  if (!running) return;
  paused = !paused;
  if (paused) { pauseStarted = performance.now(); statusRun.textContent = '一時停止'; }
  else { hiddenPause += performance.now() - pauseStarted; statusRun.textContent = '再生中'; }
}

function selectState(state) {
  stop(false);
  selected = state;
  statusState.textContent = state;
  stateLabel.textContent = labels[state];
  document.querySelectorAll('.state-button').forEach((button) => {
    const active = button.dataset.state === state;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  statusRun.textContent = '選択済み';
}

document.querySelectorAll('.state-button').forEach((button) => button.addEventListener('click', () => selectState(button.dataset.state)));
document.querySelector('#play').addEventListener('click', () => play());
document.querySelector('#pause').addEventListener('click', pause);
document.querySelector('#restart').addEventListener('click', () => play({ restart: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) pause(); });
setPose('idle');

window.animationPrototype = {
  play,
  pause,
  stop,
  selectState,
  snapshot: () => ({ selected, running, paused, pose: actor.dataset.pose, token: runToken }),
};
