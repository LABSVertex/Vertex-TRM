# Trimex Assembly Language (VASM)

Programs in Trimex are sequences of instructions from a fixed set. Each program's genome is an ordered instruction list that executes cyclically.

## Instruction Set

| Instruction | Name | Description |
| --- | --- | --- |
| `NOP` | No-op | Does nothing. Costs 1 energy. |
| `MOV` | Move | Claims one adjacent empty cell. |
| `EAT` | Expand | Claims up to two adjacent empty cells. |
| `ATK` | Attack | Destroys one adjacent enemy cell. Costs extra energy. |
| `CLN` | Clone | Spawns a child program when enough energy and space are available. |
| `MUT` | Mutate | Randomly changes one instruction in the program's genome. |
| `SCN` | Scan | Counts adjacent enemy cells and stores the result in a register. |
| `DEF` | Defend | Reinforces owned cells, making them harder to attack. |

## Execution Model

- Programs execute round-robin, one instruction per tick.
- Each program has a program counter that advances through its genome.
- Energy starts at 20, increases by owned cell count, and is spent on instructions.
- Programs die when energy reaches zero or every owned cell is destroyed.

## Genome Structure

```json
["EAT", "MOV", "ATK", "NOP", "CLN", "MUT", "EAT", "ATK", "SCN", "DEF", "MOV", "CLN"]
```

Genomes are fixed at 12 instructions. Children inherit parent genomes during `CLN`, with a 30 percent mutation chance.

## Species Biases

| Species | Bias | Strategy |
| --- | --- | --- |
| ember | ATK, EAT | Aggressive expansion |
| shade | MUT, ATK, SCN | Unpredictable adaptation |
| volt | CLN, MOV, EAT | Rapid replication |
| moss | EAT, DEF | Slow fortified growth |
| frost | DEF, SCN, MOV | Defensive awareness |
| void | MUT, NOP, ATK | Chaotic drift |

## Mutations

Mutations can be triggered by:

1. The `MUT` instruction.
2. Inheritance during `CLN`.
3. Cosmic rays, which randomly mutate a cell every 300 ticks.

Over many generations, strategies drift away from their starting species bias and can discover new survival patterns.

## Energy Economy

```text
Energy gain:  +cells per tick
Energy cost:  -1 per instruction
              -2 for ATK
              -15 for CLN
Energy cap:   200
Death:        energy <= 0
```
