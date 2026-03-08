// memory.js — the grid of cells that programs fight over

const GRID_W = 80;
const GRID_H = 40;

// Cell: { owner: string|null, instruction: string|null, defense: number }
function createMemory() {
  const cells = [];
  for (let y = 0; y < GRID_H; y++) {
    cells.push([]);
    for (let x = 0; x < GRID_W; x++) {
      cells[y].push({ owner: null, instruction: null, defense: 0 });
    }
  }
  return { cells, width: GRID_W, height: GRID_H };
}

function getCell(memory, x, y) {
  if (x < 0 || x >= memory.width || y < 0 || y >= memory.height) return null;
  return memory.cells[y][x];
}

function setCell(memory, x, y, owner, instruction, defense = 0) {
  const cell = getCell(memory, x, y);
  if (!cell) return false;
  cell.owner = owner;
  cell.instruction = instruction;
  cell.defense = defense;
  return true;
}

function clearCell(memory, x, y) {
  setCell(memory, x, y, null, null, 0);
}

function getAdjacentCells(memory, x, y) {
  return [
    { x: x, y: y - 1, dir: 'N' },
    { x: x, y: y + 1, dir: 'S' },
    { x: x + 1, y: y, dir: 'E' },
    { x: x - 1, y: y, dir: 'W' },
  ].map(d => ({ ...d, cell: getCell(memory, d.x, d.y) }))
    .filter(d => d.cell !== null);
}

function getEmptyAdjacent(memory, cells) {
  const empty = [];
  const owned = new Set(cells.map(([x, y]) => `${x},${y}`));
  for (const [cx, cy] of cells) {
    for (const adj of getAdjacentCells(memory, cx, cy)) {
      if (!adj.cell.owner && !owned.has(`${adj.x},${adj.y}`)) {
        empty.push([adj.x, adj.y]);
      }
    }
  }
  return empty;
}

function getEnemyAdjacent(memory, cells, ownerId) {
  const owned = new Set(cells.map(([x, y]) => `${x},${y}`));
  const enemy = [];
  for (const [cx, cy] of cells) {
    for (const adj of getAdjacentCells(memory, cx, cy)) {
      if (adj.cell.owner && adj.cell.owner !== ownerId && !owned.has(`${adj.x},${adj.y}`)) {
        enemy.push([adj.x, adj.y, adj.cell]);
      }
    }
  }
  return enemy;
}

module.exports = {
  createMemory,
  getCell,
  setCell,
  clearCell,
  getAdjacentCells,
  getEmptyAdjacent,
  getEnemyAdjacent,
  GRID_W,
  GRID_H,
};
