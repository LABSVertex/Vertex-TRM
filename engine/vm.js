// vm.js — the virtual machine that executes program instructions

const { getEmptyAdjacent, getEnemyAdjacent, setCell, clearCell, getCell } = require('./memory');
const { cloneProgram, mutateGenome } = require('./programs');

const ENERGY_PER_CELL = 1;       // energy gained per owned cell per tick
const ENERGY_PER_INSTR = 1;      // energy cost per instruction executed
const CLONE_ENERGY_COST = 15;    // energy required to clone
const ATK_ENERGY_COST = 2;       // energy cost to attack
const DEF_ENERGY_GAIN = 1;       // defense added per DEF instruction

const events = [];

function logEvent(msg) {
  events.push({ time: Date.now(), msg });
  if (events.length > 200) events.shift();
}

function getRecentEvents(n = 10) {
  return events.slice(-n);
}

// Execute one instruction for a program
// Returns: { newPrograms: [], cellsChanged: [] }
function executeInstruction(program, memory, allPrograms) {
  if (!program.alive || program.cells.length === 0) return { newPrograms: [], cellsChanged: [] };

  const instr = program.genome[program.pc % program.genome.length];
  program.pc = (program.pc + 1) % program.genome.length;
  program.age++;
  program.energy -= ENERGY_PER_INSTR;

  const newPrograms = [];
  const cellsChanged = [];

  switch (instr) {
    case 'NOP':
      // Do nothing — still costs energy
      break;

    case 'MOV': {
      // Move one empty adjacent cell to claim it (expand)
      const empty = getEmptyAdjacent(memory, program.cells);
      if (empty.length > 0) {
        const [nx, ny] = empty[Math.floor(Math.random() * empty.length)];
        setCell(memory, nx, ny, program.id, instr);
        program.cells.push([nx, ny]);
        cellsChanged.push([nx, ny]);
      }
      break;
    }

    case 'EAT': {
      // Claim up to 2 adjacent empty cells
      const empty = getEmptyAdjacent(memory, program.cells);
      const toEat = empty.slice(0, 2);
      for (const [nx, ny] of toEat) {
        setCell(memory, nx, ny, program.id, instr);
        program.cells.push([nx, ny]);
        cellsChanged.push([nx, ny]);
      }
      break;
    }

    case 'ATK': {
      // Attack one enemy adjacent cell
      program.energy -= ATK_ENERGY_COST;
      const enemies = getEnemyAdjacent(memory, program.cells, program.id);
      if (enemies.length > 0) {
        // Pick weakest defended enemy cell
        enemies.sort((a, b) => (a[2].defense || 0) - (b[2].defense || 0));
        const [ex, ey, ecell] = enemies[0];
        const targetId = ecell.owner;
        const target = allPrograms.find(p => p.id === targetId);
        if (target) {
          // Remove cell from target
          target.cells = target.cells.filter(([cx, cy]) => !(cx === ex && cy === ey));
          clearCell(memory, ex, ey);
          cellsChanged.push([ex, ey]);
          program.kills++;
          logEvent(`⚔ ${program.id} destroyed a ${targetId} cell`);
          if (target.cells.length === 0) {
            target.alive = false;
            logEvent(`💀 ${targetId} was eliminated by ${program.id}`);
          }
        }
      }
      break;
    }

    case 'CLN': {
      // Clone self into adjacent empty space if enough energy
      if (program.energy >= CLONE_ENERGY_COST && program.cells.length >= 3) {
        const empty = getEmptyAdjacent(memory, program.cells);
        if (empty.length >= 3) {
          const seedCells = empty.slice(0, 3);
          const child = cloneProgram(program, seedCells);
          for (const [nx, ny] of seedCells) {
            setCell(memory, nx, ny, child.id, 'CLN');
            cellsChanged.push([nx, ny]);
          }
          program.energy -= CLONE_ENERGY_COST;
          program.children++;
          newPrograms.push(child);
          logEvent(`🧬 ${program.id} (gen ${program.generation}) spawned ${child.id}`);
        }
      }
      break;
    }

    case 'MUT': {
      // Randomly mutate one instruction in own genome
      program.genome = mutateGenome(program.genome);
      logEvent(`☢ ${program.id} mutated (gen ${program.generation})`);
      break;
    }

    case 'SCN': {
      // Scan: set register to number of adjacent enemy cells
      const enemies = getEnemyAdjacent(memory, program.cells, program.id);
      program.register = enemies.length;
      break;
    }

    case 'DEF': {
      // Reinforce all own cells' defense
      for (const [cx, cy] of program.cells) {
        const cell = getCell(memory, cx, cy);
        if (cell) cell.defense = Math.min((cell.defense || 0) + DEF_ENERGY_GAIN, 5);
      }
      break;
    }
  }

  return { newPrograms, cellsChanged };
}

// Gain energy for a program based on cells owned
function gainEnergy(program) {
  program.energy += program.cells.length * ENERGY_PER_CELL;
  program.energy = Math.min(program.energy, 200); // cap
}

module.exports = { executeInstruction, gainEnergy, getRecentEvents, logEvent };
