// programs.js — program lifecycle, species definitions, creation

const INSTRUCTIONS = ['NOP', 'MOV', 'EAT', 'ATK', 'CLN', 'MUT', 'SCN', 'DEF'];

const SPECIES = [
  { name: 'ember',  color: '#ff4444', char: '█', rgb: [255, 68, 68],   bias: { ATK: 3, EAT: 2, CLN: 1 } },
  { name: 'shade',  color: '#9b59b6', char: '▓', rgb: [155, 89, 182],  bias: { MUT: 3, ATK: 2, SCN: 2 } },
  { name: 'volt',   color: '#f1c40f', char: '▒', rgb: [241, 196, 15],  bias: { CLN: 3, MOV: 2, EAT: 2 } },
  { name: 'moss',   color: '#2ecc71', char: '░', rgb: [46, 204, 113],  bias: { EAT: 3, DEF: 3, NOP: 1 } },
  { name: 'frost',  color: '#3498db', char: '▪', rgb: [52, 152, 219],  bias: { DEF: 2, SCN: 2, MOV: 2 } },
  { name: 'void',   color: '#95a5a6', char: '▫', rgb: [149, 165, 166], bias: { MUT: 2, NOP: 2, ATK: 2 } },
];

let _nextId = 1;

function getSpecies(name) {
  return SPECIES.find(s => s.name === name) || SPECIES[0];
}

function generateGenome(speciesName, length = 12) {
  const species = getSpecies(speciesName);
  const genome = [];
  // Build a weighted pool based on species bias
  const pool = [];
  for (const instr of INSTRUCTIONS) {
    const weight = (species.bias[instr] || 1);
    for (let i = 0; i < weight; i++) pool.push(instr);
  }
  for (let i = 0; i < length; i++) {
    genome.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return genome;
}

function createProgram(speciesName, startCells) {
  const species = getSpecies(speciesName);
  const id = `${speciesName}:${_nextId++}`;
  const genome = generateGenome(speciesName);
  return {
    id,
    species: speciesName,
    color: species.color,
    char: species.char,
    rgb: species.rgb,
    genome,
    pc: 0,           // program counter (index into genome)
    cells: [...startCells], // [[x,y], ...]
    energy: 20,
    generation: 0,
    kills: 0,
    children: 0,
    age: 0,
    register: 0,     // internal register for SCN/JMP
    alive: true,
  };
}

function mutateGenome(genome) {
  const mutated = [...genome];
  const idx = Math.floor(Math.random() * mutated.length);
  mutated[idx] = INSTRUCTIONS[Math.floor(Math.random() * INSTRUCTIONS.length)];
  return mutated;
}

function cloneProgram(parent, newCells) {
  const species = getSpecies(parent.species);
  const id = `${parent.species}:${_nextId++}`;
  // Genome inherits from parent with possible mutation
  const genome = Math.random() < 0.3 ? mutateGenome(parent.genome) : [...parent.genome];
  return {
    id,
    species: parent.species,
    color: species.color,
    char: species.char,
    rgb: species.rgb,
    genome,
    pc: 0,
    cells: [...newCells],
    energy: 10,
    generation: parent.generation + 1,
    kills: 0,
    children: 0,
    age: 0,
    register: 0,
    alive: true,
  };
}

module.exports = {
  SPECIES,
  INSTRUCTIONS,
  createProgram,
  cloneProgram,
  mutateGenome,
  getSpecies,
  generateGenome,
};
