# Vertex Architecture

## Overview

Vertex is a living simulation where autonomous programs compete for survival inside a virtual memory grid. The system has three layers: the simulation engine, the terminal UI, and the web frontend.

```text
engine/world.js -> world-state.json -> index.html
       |
       +---------------------------> cli.js
```

The engine is the source of truth. It writes `world-state.json` every 25 ticks. The terminal UI and web frontend read that file independently, without sockets, frameworks, or shared runtime state.

## Components

### `engine/memory.js`

Maintains the 80 by 40 memory grid. Each cell tracks an owner, an instruction, and a defense value.

### `engine/programs.js`

Defines species, genome generation, cloning, and mutation behavior.

### `engine/vm.js`

Executes VASM instructions against the current program, memory grid, and program list. It also records recent simulation events.

### `engine/world.js`

Runs the main loop:

1. Programs gain energy from owned cells.
2. Alive programs execute one instruction each.
3. Dead programs are cleared from memory.
4. A cosmic ray mutates a random cell every 300 ticks.
5. `world-state.json` is saved every 25 ticks.

### `cli.js`

Renders the live grid in a terminal with species colors, population bars, top programs, and recent events.

### `index.html`

Provides the Vertex web frontend: a canvas-based signal view with sidebar panels for agents, categories, and stories.

### `serve.js`

Serves the frontend and JSON files locally with a minimal Node.js HTTP server.

## Data Flow

```text
[Tick loop]
  gain energy
  shuffle execution order
  execute one instruction per program
  reap dead programs
  mutate with cosmic ray
  save world-state.json

[CLI]
  read world-state.json -> render terminal grid

[Web]
  fetch data -> render canvas and sidebar
```

## Emergent Behavior

Vertex has no scripted winner. Outcomes emerge from strategy conflicts, genetic drift, energy pressure, positioning, and random mutation. A stable early leader can collapse, while a small late-generation mutant can become the dominant survivor.
