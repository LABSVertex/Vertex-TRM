// world.js — main simulation loop

const fs = require('fs');
const path = require('path');
const { createMemory, setCell, clearCell, GRID_W, GRID_H } = require('./memory');
const { createProgram, SPECIES } = require('./programs');
const { executeInstruction, gainEnergy, getRecentEvents, logEvent } = require('./vm');

const STATE_FILE = path.join(__dirname, '..', 'world-state.json');
const TICK_MS = 80;
const SAVE_EVERY = 25; // ticks

let memory = createMemory();
let programs = [];
let tick = 0;
let totalKills = 0;
let extinctions = 0;

// Place a program's initial cells in a region
function placeProgramAt(speciesName, cx, cy, size = 5) {
  const cells = [];
  const offsets = [
    [0, 0], [1, 0], [0, 1], [-1, 0], [0, -1],
    [1, 1], [-1, 1], [1, -1],
  ].slice(0, size);

  for (const [dx, dy] of offsets) {
    const x = Math.max(0, Math.min(GRID_W - 1, cx + dx));
    const y = Math.max(0, Math.min(GRID_H - 1, cy + dy));
    const key = `${x},${y}`;
    if (!cells.find(([cx2, cy2]) => cx2 === x && cy2 === y)) {
      cells.push([x, y]);
    }
  }

  const prog = createProgram(speciesName, cells);
  for (const [x, y] of cells) {
    setCell(memory, x, y, prog.id, prog.genome[0]);
  }
  return prog;
}

function initWorld() {
  // Place 6 species at different positions across the grid
  const placements = [
    ['ember', 10, 8],
    ['shade', 65, 8],
    ['volt',  10, 30],
    ['moss',  65, 30],
    ['frost', 38, 5],
    ['void',  38, 34],
  ];
  for (const [species, x, y] of placements) {
    programs.push(placeProgramAt(species, x, y));
    logEvent(`🌱 ${species} species initialized`);
  }
}

function cosmicRay() {
  // Randomly mutate a cell somewhere in the grid
  const x = Math.floor(Math.random() * GRID_W);
  const y = Math.floor(Math.random() * GRID_H);
  const cell = memory.cells[y][x];
  if (cell.owner) {
    const prog = programs.find(p => p.id === cell.owner);
    if (prog) {
      const instructions = ['NOP', 'MOV', 'EAT', 'ATK', 'CLN', 'MUT', 'SCN', 'DEF'];
      cell.instruction = instructions[Math.floor(Math.random() * instructions.length)];
      logEvent(`☄️  Cosmic ray hit ${prog.id} at (${x},${y})`);
    }
  }
}

function saveState() {
  const speciesCounts = {};
  for (const p of programs) {
    if (p.alive) {
      if (!speciesCounts[p.species]) speciesCounts[p.species] = { count: 0, cells: 0, kills: 0, maxGen: 0 };
      speciesCounts[p.species].count++;
      speciesCounts[p.species].cells += p.cells.length;
      speciesCounts[p.species].kills += p.kills;
      speciesCounts[p.species].maxGen = Math.max(speciesCounts[p.species].maxGen, p.generation);
    }
  }

  // Build flat grid for frontend
  const grid = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const c = memory.cells[y][x];
      grid.push(c.owner ? c.owner.split(':')[0] : null);
    }
  }

  const topPrograms = programs
    .filter(p => p.alive)
    .sort((a, b) => b.cells.length - a.cells.length)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      species: p.species,
      cells: p.cells.length,
      energy: p.energy,
      generation: p.generation,
      kills: p.kills,
      children: p.children,
      age: p.age,
    }));

  const state = {
    tick,
    gridW: GRID_W,
    gridH: GRID_H,
    grid,
    programs: topPrograms,
    speciesCounts,
    totalPrograms: programs.filter(p => p.alive).length,
    totalKills,
    extinctions,
    events: getRecentEvents(8),
    savedAt: Date.now(),
  };

  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (e) {
    // ignore write errors
  }
}

function runTick() {
  tick++;

  // Energy gain phase
  for (const p of programs) {
    if (p.alive) gainEnergy(p);
  }

  // Execution phase — shuffle order for fairness
  const alive = programs.filter(p => p.alive);
  for (let i = alive.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [alive[i], alive[j]] = [alive[j], alive[i]];
  }

  const newPrograms = [];
  for (const p of alive) {
    if (!p.alive) continue;
    const result = executeInstruction(p, memory, programs);
    if (result.newPrograms.length > 0) {
      newPrograms.push(...result.newPrograms);
    }
  }

  programs.push(...newPrograms);

  // Death phase — remove dead programs and clear their cells
  for (const p of programs) {
    if (!p.alive) continue;
    if (p.energy <= 0 || p.cells.length === 0) {
      p.alive = false;
      for (const [x, y] of p.cells) {
        clearCell(memory, x, y);
      }
      p.cells = [];
      logEvent(`💀 ${p.id} died (energy: ${Math.round(p.energy)})`);
    }
  }

  // Count kills for global stat
  totalKills = programs.reduce((sum, p) => sum + p.kills, 0);

  // Cosmic ray every 300 ticks
  if (tick % 300 === 0) cosmicRay();

  // Check for extinctions — if a species has no alive programs, announce it
  for (const species of SPECIES) {
    const speciesAlive = programs.some(p => p.alive && p.species === species.name);
    if (!speciesAlive) {
      const wasAlive = programs.some(p => p.species === species.name);
      if (wasAlive) {
        // Check if we already logged extinction
        const alreadyLogged = programs.filter(p => p.species === species.name && !p.alive).length > 0 &&
          !programs.some(p => p.species === species.name && p.alive);
        // Simple: track extinctions via a set
        if (!world._extinctSpecies.has(species.name)) {
          world._extinctSpecies.add(species.name);
          extinctions++;
          logEvent(`☠️  ${species.name} species went EXTINCT at tick ${tick}`);
        }
      }
    }
  }

  // Clean up dead programs older than 500 ticks to save memory
  if (programs.length > 500) {
    programs = programs.filter(p => p.alive || p.age > 0 && programs.indexOf(p) > programs.length - 100);
  }

  // Save state
  if (tick % SAVE_EVERY === 0) saveState();
}

const world = { _extinctSpecies: new Set() };

function start() {
  console.log('Trimex engine starting...');
  initWorld();
  saveState();
  console.log(`World initialized. Grid: ${GRID_W}x${GRID_H}. Programs: ${programs.length}`);
  console.log('Running simulation... (Ctrl+C to stop)');

  setInterval(() => {
    try {
      runTick();
      if (tick % 100 === 0) {
        const alive = programs.filter(p => p.alive).length;
        console.log(`Tick ${tick} | Programs: ${alive} | Kills: ${totalKills}`);
      }
    } catch (e) {
      console.error('Tick error:', e.message);
    }
  }, TICK_MS);
}

start();
