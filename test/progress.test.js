import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, freshProgress, validProgress, isUnlocked, completeLevel, createProgressStore } from '../src/progress.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
}

test('a fresh campaign only unlocks level 1 and saves a stable seed', () => {
  const storage = memoryStorage();
  const first = createProgressStore(() => storage);
  assert.equal(validProgress(first.progress), true);
  assert.equal(isUnlocked(first.progress, 1), true);
  for (let level = 2; level <= 20; level++) assert.equal(isUnlocked(first.progress, level), false);
  assert.deepEqual(createProgressStore(() => storage).progress, first.progress);
});

test('sequential completion unlocks the next level, replay never removes progress', () => {
  let progress = freshProgress();
  assert.deepEqual(completeLevel(progress, 2), progress);
  for (let level = 1; level <= 20; level++) {
    progress = completeLevel(progress, level);
    assert.equal(progress.completed, level);
    assert.equal(isUnlocked(progress, Math.min(level + 1, 20)), true);
    assert.equal(completeLevel(progress, 1).completed, level);
  }
  for (const level of [0, 21, 1.5, NaN, '1']) assert.equal(isUnlocked(progress, level), false);
});

test('completion persists through reload and reset touches only the game key', () => {
  const storage = memoryStorage({ 'another-game': 'keep me' });
  const store = createProgressStore(() => storage);
  store.complete(1);
  store.complete(2);
  assert.equal(createProgressStore(() => storage).progress.completed, 2);
  const originalSeed = store.progress.seed;
  store.reset();
  assert.equal(store.progress.completed, 0);
  assert.notEqual(store.progress.seed, originalSeed);
  assert.equal(storage.getItem('another-game'), 'keep me');
  assert.deepEqual(createProgressStore(() => storage).progress, store.progress);
});

test('invalid and unsupported saved values recover to a playable campaign', () => {
  for (const data of ['{broken', 'null', '[]', '12', '{}', '{"version":2,"seed":1,"completed":3}', '{"version":1,"seed":-1,"completed":3}', '{"version":1,"seed":1,"completed":99}', '{"version":1,"seed":1,"completed":1.5}']) {
    const storage = memoryStorage({ [STORAGE_KEY]: data });
    const store = createProgressStore(() => storage);
    assert.equal(validProgress(store.progress), true);
    assert.equal(store.progress.completed, 0);
    assert.equal(store.persistent, true);
  }
});

test('blocked storage and quota errors preserve playable in-memory progress', () => {
  for (const getStorage of [() => { throw new Error('blocked'); }, () => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } })]) {
    const store = createProgressStore(getStorage);
    assert.equal(store.persistent, false);
    store.complete(1);
    assert.equal(store.progress.completed, 1);
    store.reset();
    assert.equal(store.progress.completed, 0);
    assert.equal(store.persistent, false);
  }
});
