// cli.js - ANSI terminal UI for Trimex
// Run: node cli.js (while engine/world.js is running in another terminal)

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'world-state.json');

// ANSI helpers
const ESC = '\x1b[';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CLEAR = '\x1b[2J\x1b[H';

function rgb(r, g, b) { return `\x1b[38;2;${r};${g};${b}m`; }
function bgRgb(r, g, b) { return `\x1b[48;2;${r};${g};${b}m`; }
function moveTo(row, col) { return `${ESC}${row};${col}H`; }

const SPECIES_COLORS = {
  ember: [255, 68, 68],
  shade: [155, 89, 182],
  volt:  [241, 196, 15],
  moss:  [46, 204, 113],
  frost: [52, 152, 219],
  void:  [149, 165, 166],
};

const SPECIES_CHARS = {
  ember: '█', shade: '▓', volt: '▒', moss: '░', frost: '▪', void: '▫',
};

const EMPTY_CHAR = '·';
const EMPTY_COLOR = [30, 30, 40];

function colorCell(species) {
  if (!species) return `${rgb(...EMPTY_COLOR)}${EMPTY_CHAR}${RESET}`;
  const col = SPECIES_COLORS[species] || [200, 200, 200];
  const ch = SPECIES_CHARS[species] || '?';
  return `${rgb(...col)}${ch}${RESET}`;
}

function renderGrid(state) {
  const lines = [];
  for (let y = 0; y < state.gridH; y++) {
    let line = '';
    for (let x = 0; x < state.gridW; x++) {
      const species = state.grid[y * state.gridW + x];
      line += colorCell(species);
    }
    lines.push(line);
  }
  return lines;
}

function energyBar(energy, max = 200, width = 12) {
  const filled = Math.round((Math.min(energy, max) / max) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return bar;
}

function renderSidebar(state, height) {
  const lines = [];

  // Title
  lines.push(`${BOLD}${rgb(91, 231, 196)} TRIMEX ${RESET}`);
  lines.push(`${DIM}tick ${state.tick} | programs: ${state.totalPrograms}${RESET}`);
  lines.push(`${DIM}kills: ${state.totalKills} | extinct: ${state.extinctions}${RESET}`);
  lines.push('');

  // Species overview
  lines.push(`${BOLD}${rgb(200,200,200)}SPECIES${RESET}`);
  for (const [name, col] of Object.entries(SPECIES_COLORS)) {
    const info = state.speciesCounts?.[name];
    if (info) {
      const bar = '█'.repeat(Math.min(Math.round(info.cells / 10), 10));
      lines.push(`${rgb(...col)}${SPECIES_CHARS[name]} ${name.padEnd(6)}${RESET} ${rgb(...col)}${bar}${RESET} ${info.cells}`);
    } else {
      lines.push(`${DIM}${SPECIES_CHARS[name]} ${name.padEnd(6)} extinct${RESET}`);
    }
  }
  lines.push('');

  // Top programs
  lines.push(`${BOLD}${rgb(200,200,200)}TOP PROGRAMS${RESET}`);
  const top = (state.programs || []).slice(0, 6);
  for (const p of top) {
    const col = SPECIES_COLORS[p.species] || [200, 200, 200];
    const bar = energyBar(p.energy, 200, 8);
    lines.push(`${rgb(...col)}${p.id.slice(0, 14).padEnd(14)}${RESET}`);
    lines.push(`  cells:${String(p.cells).padStart(3)} gen:${p.generation} ⚔${p.kills}`);
    lines.push(`  ${rgb(80,200,120)}${bar}${RESET} ${p.energy}`);
  }
  lines.push('');

  // Events
  lines.push(`${BOLD}${rgb(200,200,200)}EVENTS${RESET}`);
  const evts = (state.events || []).slice(-6).reverse();
  for (const e of evts) {
    lines.push(`${DIM}${e.msg.slice(0, 22)}${RESET}`);
  }

  // Pad to height
  while (lines.length < height) lines.push('');

  return lines;
}

function render(state) {
  if (!state) return;

  const gridLines = renderGrid(state);
  const sidebarLines = renderSidebar(state, state.gridH + 4);

  let output = CLEAR;

  // Header
  output += `${BOLD}${rgb(91,231,196)}== TRIMEX == autonomous programs evolving in memory ==${RESET}\n`;

  // Grid + sidebar side by side
  const totalLines = Math.max(gridLines.length, sidebarLines.length);
  for (let i = 0; i < totalLines; i++) {
    const gridLine = gridLines[i] || ' '.repeat(state.gridW);
    const sidebarLine = sidebarLines[i] || '';
    output += `${gridLine}  ${sidebarLine}\n`;
  }

  // Footer: event log
  output += `${DIM}${'─'.repeat(100)}${RESET}\n`;
  const lastEvt = (state.events || []).slice(-1)[0];
  if (lastEvt) output += `${DIM}latest: ${lastEvt.msg}${RESET}\n`;
  output += `${DIM}q to quit | engine/world.js runs the simulation${RESET}\n`;

  process.stdout.write(output);
}

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Hide cursor
process.stdout.write('\x1b[?25l');

// Restore cursor on exit
process.on('SIGINT', () => {
  process.stdout.write('\x1b[?25h\x1b[2J\x1b[H');
  console.log('Trimex CLI exited.');
  process.exit(0);
});

// If stdin is a TTY, allow 'q' to quit
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key.toString() === 'q' || key[0] === 3) {
      process.stdout.write('\x1b[?25h\x1b[2J\x1b[H');
      process.exit(0);
    }
  });
}

console.log('Waiting for world-state.json...');
let lastTick = -1;

setInterval(() => {
  const state = loadState();
  if (!state) {
    process.stdout.write(`${ESC}1;1H${DIM}Waiting for engine... (run: node engine/world.js)${RESET}`);
    return;
  }
  if (state.tick !== lastTick) {
    lastTick = state.tick;
    render(state);
  }
}, 150);
