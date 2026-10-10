import './style.css';
import { generateMaze, createRun, movePlayer, sizeForLevel } from './maze.js';
import { createProgressStore, isUnlocked } from './progress.js';
import { MazeRenderer } from './renderer.js';

const $ = selector => document.querySelector(selector);
const store = createProgressStore();
const renderer = new MazeRenderer($('#home-stage'));
const names = ['First light', 'A little wander', 'Round the bend', 'Side streets', 'New directions', 'The detour', 'Crossroads', 'Off the path', 'Loose ends', 'Halfway home', 'Deep in thought', 'The long way', 'Into the quiet', 'Lost & found', 'Further still', 'The labyrinth', 'Twists of fate', 'Almost nowhere', 'One last turn', 'The way home'];
const pad = value => String(value).padStart(2, '0');
const difficulty = level => level <= 4 ? 'EASY' : level <= 8 ? 'EXPLORER' : level <= 12 ? 'CHALLENGING' : level <= 16 ? 'DIFFICULT' : 'EXPERT';
const lockIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="5" y="9" width="10" height="8" rx="2"/><path d="M7 9V6a3 3 0 0 1 6 0v3"/><circle cx="10" cy="13" r=".7"/></svg>';
let run = null;
let screen = 'home';
let holdTimer;
let lastMove = 0;

function updateStorageWarning() { $('#storage-warning').hidden = store.persistent; }

function drawHome() {
  const { completed } = store.progress;
  const next = Math.min(completed + 1, 20);
  $('#completed-count').textContent = pad(completed);
  $('#progress-fill').style.width = `${completed * 5}%`;
  $('.progress-track').setAttribute('aria-valuenow', completed);
  $('#continue-label').textContent = completed === 20 ? 'Revisit the mazes' : completed ? `Continue · Level ${pad(next)}` : 'Enter the maze';
  $('#preview-level').textContent = `LEVEL ${pad(next)} / 20`;
  $('#level-grid').innerHTML = names.map((name, index) => {
    const level = index + 1;
    const done = level <= completed;
    const locked = !isUnlocked(store.progress, level);
    const state = done ? 'COMPLETED' : locked ? 'LOCKED' : 'READY TO EXPLORE';
    return `<button class="level-card ${done ? 'completed' : locked ? 'locked' : 'available'}" data-level="${level}" ${locked ? 'disabled' : ''} aria-label="Level ${level}: ${name}. ${state.toLowerCase()}. ${sizeForLevel(level)} by ${sizeForLevel(level)} maze"><span class="card-top"><span class="level-number">${pad(level)}</span><span class="card-icon">${done ? '✓' : locked ? lockIcon : '↗'}</span></span><span class="level-name">${name}</span><span class="card-details"><span>${sizeForLevel(level)} × ${sizeForLevel(level)}</span><span class="difficulty-bars" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.ceil(level / 4) ? 'filled' : ''}"></i>`).join('')}</span></span><span class="card-state">${!done && !locked ? '<i class="status-dot"></i>' : ''}${state}</span></button>`;
  }).join('');
  renderer.attach($('#home-stage'));
  renderer.build(generateMaze(store.progress.seed, next));
  updateStorageWarning();
}

function stopHold() { clearInterval(holdTimer); holdTimer = undefined; }

function showHome(focus = true) {
  stopHold();
  screen = 'home';
  run = null;
  $('#game').hidden = true;
  $('#home').hidden = false;
  document.body.classList.remove('playing');
  drawHome();
  if (focus) $('#continue').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function startLevel(level) {
  if (!isUnlocked(store.progress, level)) return;
  stopHold();
  screen = 'game';
  run = createRun(generateMaze(store.progress.seed, level));
  lastMove = 0;
  $('#home').hidden = true;
  $('#game').hidden = false;
  document.body.classList.add('playing');
  $('#game-level').textContent = `LEVEL ${pad(level)} / 20`;
  $('#game-title').textContent = names[level - 1];
  $('#game-difficulty').textContent = `${difficulty(level)} · ${run.maze.size} × ${run.maze.size}`;
  $('#moves').textContent = '000';
  $('#move-status').textContent = `Level ${level}. Find the exit ring.`;
  renderer.attach($('#game-stage'));
  renderer.build(run.maze);
  $('#game-stage').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function move(direction) {
  if (screen !== 'game' || !run || run.completed || document.querySelector('dialog[open]')) return;
  const now = performance.now();
  if (now - lastMove < 90) return;
  if (!movePlayer(run, direction)) return;
  lastMove = now;
  renderer.move(run.position);
  $('#moves').textContent = String(run.moves).padStart(3, '0');
  if (run.completed) {
    stopHold();
    store.complete(run.maze.level);
    updateStorageWarning();
    const final = run.maze.level === 20;
    $('#win-eyebrow').textContent = final ? '20 MAZES. YOU FOUND THEM ALL.' : `LEVEL ${pad(run.maze.level)} COMPLETE`;
    $('#win-title').textContent = final ? 'Feels like home.' : 'You found your way.';
    $('#win-description').textContent = final ? `The final turn, in ${run.moves} moves. Every maze is complete. Come back and wander whenever you like.` : `${names[run.maze.level - 1]}, solved in ${run.moves} moves. Level ${pad(run.maze.level + 1)} is ready when you are.`;
    $('#next-level').hidden = final;
    $('#win-dialog').showModal();
    (final ? $('#win-home') : $('#next-level')).focus();
  }
}

$('#continue').addEventListener('click', () => startLevel(Math.min(store.progress.completed + 1, 20)));
$('#level-grid').addEventListener('click', event => {
  const card = event.target.closest('[data-level]');
  if (card) startLevel(Number(card.dataset.level));
});
$('#back-home').addEventListener('click', () => showHome());
$('#brand-home').addEventListener('click', event => { event.preventDefault(); showHome(); });
$('#restart').addEventListener('click', () => { if (run) startLevel(run.maze.level); });
$('#next-level').addEventListener('click', () => {
  const next = run.maze.level + 1;
  $('#win-dialog').close();
  startLevel(next);
});
$('#win-home').addEventListener('click', () => { $('#win-dialog').close(); showHome(); });
$('#win-dialog').addEventListener('cancel', event => {
  event.preventDefault();
  $('#win-dialog').close();
  showHome();
});
$('#reset-open').addEventListener('click', () => { stopHold(); $('#reset-dialog').showModal(); });
$('#reset-dialog').addEventListener('close', () => {
  if ($('#reset-dialog').returnValue !== 'reset') return;
  store.reset();
  showHome();
  $('#reset-dialog').returnValue = '';
});

const keyDirections = { ArrowUp: 0, w: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3 };
window.addEventListener('keydown', event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (screen !== 'game' || event.altKey || event.ctrlKey || event.metaKey || keyDirections[key] === undefined || document.querySelector('dialog[open]')) return;
  event.preventDefault();
  move(keyDirections[key]);
});
document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    stopHold();
    button.setPointerCapture(event.pointerId);
    const direction = Number(button.dataset.direction);
    move(direction);
    if (!run?.completed) holdTimer = setInterval(() => move(direction), 140);
  });
  button.addEventListener('pointerup', stopHold);
  button.addEventListener('pointercancel', stopHold);
  button.addEventListener('lostpointercapture', stopHold);
  button.addEventListener('click', event => { if (event.detail === 0) move(Number(button.dataset.direction)); });
});
window.addEventListener('blur', stopHold);
document.addEventListener('visibilitychange', stopHold);
showHome(false);
