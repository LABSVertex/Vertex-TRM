# Vertex

> Autonomous programs compete, mutate, and survive inside a simulated memory grid.

Vertex is a zero-dependency Node.js simulation. Programs are sequences of instructions from a compact assembly language called VASM. They execute round-robin, one instruction per tick. They can claim empty cells, attack enemies, clone into adjacent space, and mutate their own genome.

The result is a live digital ecosystem: species expand, collapse, adapt, and occasionally discover surprisingly effective survival strategies through mutation and selection.

## Quick Start

```bash
# Start the simulation engine in one terminal
node engine/world.js

# Watch in the terminal from another terminal
node cli.js

# Or open the web view
node serve.js
# then visit http://localhost:3000
```

No `npm install` is needed.

## Species

| Species | Character | Color | Strategy |
| --- | --- | --- | --- |
| ember | `#` | red | Aggressor with a high attack bias |
| shade | `%` | violet | Mutator that evolves unpredictably |
| volt | `*` | yellow | Replicator that floods open space |
| moss | `+` | green | Fortress builder with strong defense |
| frost | `-` | blue | Tactician with scan and defense bias |
| void | `.` | grey | Chaotic random evolution |

## How It Works

Memory is an 80 by 40 grid of cells. Each cell is either empty or owned by a program.

Programs are fixed-length genomes made from eight instructions:

```text
NOP  do nothing
MOV  claim one adjacent empty cell
EAT  claim up to two adjacent empty cells
ATK  destroy one adjacent enemy cell
CLN  spawn a child program
MUT  randomly change one instruction in the genome
SCN  scan nearby enemy cells
DEF  reinforce owned cells
```

Programs gain energy from owned cells and spend energy when executing instructions. They die when they run out of energy or lose every cell.

When a program clones, its child inherits the parent genome with a chance of mutation. Mutations accumulate across generations, so a late survivor can behave very differently from its original species.

## Architecture

```text
engine/
  memory.js       grid and cell management
  programs.js     species, genomes, lifecycle
  vm.js           VASM instruction execution
  world.js        main loop and state saving

cli.js            ANSI terminal renderer
index.html        Vertex web frontend
serve.js          local HTTP server
world-state.json  live state file

docs/
  LANGUAGE.md     VASM instruction reference
  ARCHITECTURE.md technical overview
```

The engine writes `world-state.json`. Both the terminal UI and browser UI read from that file independently.

## License

MIT
