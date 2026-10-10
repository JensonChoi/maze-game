export const LEVEL_COUNT = 20;
export const DIRECTIONS = [
  { dx: 0, dy: -1, opposite: 2 },
  { dx: 1, dy: 0, opposite: 3 },
  { dx: 0, dy: 1, opposite: 0 },
  { dx: -1, dy: 0, opposite: 1 },
];

export function randomFromSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function sizeForLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) {
    throw new RangeError('Level must be between 1 and 20.');
  }
  return level + 4;
}

export function nextCell(maze, cell, direction) {
  const step = DIRECTIONS[direction];
  if (!step || !Number.isInteger(cell) || cell < 0 || cell >= maze.cells.length) return cell;
  if (maze.cells[cell] & (1 << direction)) return cell;
  const x = cell % maze.size + step.dx;
  const y = Math.floor(cell / maze.size) + step.dy;
  if (x < 0 || y < 0 || x >= maze.size || y >= maze.size) return cell;
  return y * maze.size + x;
}

export function exploreMaze(maze, start = 0) {
  const distances = Array(maze.cells.length).fill(-1);
  const parents = Array(maze.cells.length).fill(-1);
  const queue = [start];
  distances[start] = 0;
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (let direction = 0; direction < 4; direction++) {
      const next = nextCell(maze, cell, direction);
      if (distances[next] !== -1) continue;
      parents[next] = cell;
      distances[next] = distances[cell] + 1;
      queue.push(next);
    }
  }
  return { distances, parents, reachable: queue.length };
}

export function generateMaze(campaignSeed, level) {
  const size = sizeForLevel(level);
  const random = randomFromSeed((campaignSeed ^ Math.imul(level, 0x9e3779b9)) >>> 0);
  const cells = Array(size * size).fill(15);
  const visited = new Uint8Array(cells.length);
  const stack = [0];
  visited[0] = 1;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const x = current % size;
    const y = Math.floor(current / size);
    const candidates = [];
    DIRECTIONS.forEach(({ dx, dy }, direction) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size && !visited[ny * size + nx]) {
        candidates.push({ direction, cell: ny * size + nx });
      }
    });
    if (!candidates.length) { stack.pop(); continue; }
    const { direction, cell } = candidates[Math.floor(random() * candidates.length)];
    cells[current] &= ~(1 << direction);
    cells[cell] &= ~(1 << DIRECTIONS[direction].opposite);
    visited[cell] = 1;
    stack.push(cell);
  }
  const maze = { size, cells, start: 0, exit: 0, level };
  const { distances, reachable } = exploreMaze(maze);
  if (reachable !== cells.length) throw new Error('Maze is not fully connected.');
  maze.exit = distances.indexOf(Math.max(...distances));
  maze.solutionLength = distances[maze.exit];
  if (maze.solutionLength < 1) throw new Error('Maze has no valid exit.');
  return maze;
}

export function createRun(maze) {
  return { maze, position: maze.start, moves: 0, visited: new Set([maze.start]), completed: false };
}

export function movePlayer(run, direction) {
  if (run.completed) return false;
  const next = nextCell(run.maze, run.position, direction);
  if (next === run.position) return false;
  run.position = next;
  run.moves += 1;
  run.visited.add(next);
  run.completed = next === run.maze.exit;
  return true;
}
