import { LEVEL_COUNT } from './maze.js';

export const STORAGE_KEY = 'after-hours-maze.progress';
export function freshProgress() {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return { version: 1, seed, completed: 0 };
}

export function validProgress(value) {
  return value !== null && typeof value === 'object' && value.version === 1
    && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 0xffffffff
    && Number.isInteger(value.completed) && value.completed >= 0 && value.completed <= LEVEL_COUNT;
}

export function isUnlocked(progress, level) {
  return Number.isInteger(level) && level >= 1 && level <= LEVEL_COUNT && level <= progress.completed + 1;
}

export function completeLevel(progress, level) {
  if (!isUnlocked(progress, level)) return progress;
  return { ...progress, completed: Math.max(progress.completed, level) };
}

// Accessing localStorage itself can throw in private or restricted contexts.
export function createProgressStore(getStorage = () => window.localStorage) {
  let persistent = true;
  let progress;
  try {
    const stored = JSON.parse(getStorage().getItem(STORAGE_KEY));
    if (validProgress(stored)) progress = { version: 1, seed: stored.seed, completed: stored.completed };
  } catch { persistent = false; }
  progress ??= freshProgress();

  function save(next) {
    progress = next;
    try {
      getStorage().setItem(STORAGE_KEY, JSON.stringify(progress));
      persistent = true;
    } catch { persistent = false; }
    return progress;
  }
  save(progress);
  return {
    get progress() { return progress; },
    get persistent() { return persistent; },
    complete(level) { return save(completeLevel(progress, level)); },
    reset() {
      const next = freshProgress();
      if (next.seed === progress.seed) next.seed = (next.seed + 1) >>> 0;
      return save(next);
    },
  };
}
