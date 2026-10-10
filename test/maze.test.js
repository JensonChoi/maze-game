import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze, exploreMaze, nextCell, createRun, movePlayer, sizeForLevel, DIRECTIONS } from '../src/maze.js';

test('all 20 levels across 100 seeds are connected, bounded, and acyclic', () => {
  for (let seed = 0; seed < 100; seed++) {
    let previousSize = 0;
    for (let level = 1; level <= 20; level++) {
      const maze = generateMaze(seed, level);
      const { size, cells } = maze;
      assert.ok(size > previousSize);
      previousSize = size;
      const { reachable, distances } = exploreMaze(maze);
      assert.equal(reachable, size * size);
      assert.equal(distances[maze.exit], Math.max(...distances));
      assert.ok(maze.exit !== maze.start);
      let passages = 0;
      cells.forEach((walls, cell) => {
        const x = cell % size, y = Math.floor(cell / size);
        if (x === 0) assert.ok(walls & 8);
        if (y === 0) assert.ok(walls & 1);
        if (x === size - 1) assert.ok(walls & 2);
        if (y === size - 1) assert.ok(walls & 4);
        DIRECTIONS.forEach(({ dx, dy, opposite }, direction) => {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) return;
          assert.equal(Boolean(walls & (1 << direction)), Boolean(cells[ny * size + nx] & (1 << opposite)));
          if (!(walls & (1 << direction))) passages++;
        });
      });
      assert.equal(passages / 2, cells.length - 1);
    }
  }
});

test('seeded levels stay identical and different campaigns differ', () => {
  for (let level = 1; level <= 20; level++) {
    assert.deepEqual(generateMaze(89334, level), generateMaze(89334, level));
    assert.notDeepEqual(generateMaze(89334, level).cells, generateMaze(89335, level).cells);
  }
});

test('all levels can be completed with actual movement rules, and stop at the exit', () => {
  for (let level = 1; level <= 20; level++) {
    const maze = generateMaze(4294967295, level);
    const { parents } = exploreMaze(maze);
    const path = [];
    for (let cell = maze.exit; cell !== maze.start; cell = parents[cell]) path.unshift(cell);
    const run = createRun(maze);
    for (const next of path) {
      const direction = DIRECTIONS.findIndex((_, direction) => nextCell(maze, run.position, direction) === next);
      assert.equal(movePlayer(run, direction), true);
    }
    assert.equal(run.completed, true);
    assert.equal(run.moves, maze.solutionLength);
    assert.equal(run.position, maze.exit);
    assert.equal(movePlayer(run, 0), false);
    assert.equal(run.moves, maze.solutionLength);
  }
});

test('walls and invalid directions do not move the player or increment moves', () => {
  const maze = generateMaze(93, 1);
  const run = createRun(maze);
  for (const direction of [0, 3, -1, 4, undefined]) assert.equal(movePlayer(run, direction), false);
  assert.equal(run.moves, 0);
  assert.equal(run.position, 0);
  const next = [1, 2].find(direction => nextCell(maze, 0, direction) !== 0);
  movePlayer(run, next);
  assert.equal(run.moves, 1);
  assert.deepEqual(createRun(maze), { maze, position: 0, moves: 0, visited: new Set([0]), completed: false });
});

test('rejects invalid levels', () => {
  for (const level of [0, 21, 1.5, NaN, '1']) assert.throws(() => sizeForLevel(level), RangeError);
});
