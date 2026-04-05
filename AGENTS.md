{\rtf1\ansi\ansicpg1252\cocoartf2757
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww24620\viewh13380\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Project: Beaver Simulation\
\
## Goal\
Build a minimal playable prototype where a beaver gathers wood and builds a dam to raise water levels and protect itself from a predator.\
\
## Core Loop\
Move \uc0\u8594  gather \u8594  build \u8594  raise water \u8594  slow/block predator \u8594  survive\
\
## Rules\
- Keep the implementation simple and modular.\
- Stay strictly within the defined scope.\
- Prefer readability over optimization.\
- Do not introduce additional systems unless explicitly requested.\
- Keep the game playable at every stage.\
\
## Main Systems\
\
### Player System\
- Handles movement and input\
- Tracks wood inventory\
\
### Resource System\
- Trees provide wood when interacted with\
- Trees can disappear after use (no need for regrowth initially)\
\
### Building System\
- Player can place dam tiles using wood\
- Dam contributes to increasing water level\
\
### Water System\
- Water level increases based on dam size\
- Water level is a single global value (single source of truth)\
\
### Predator System\
- One predator moves toward the beaver continuously\
- Predator pathing can be simple (direct movement is enough)\
\
## System Interactions\
\
- Dam \uc0\u8594  increases water level\
- Water \uc0\u8594  affects predator movement speed:\
\
  - Low water: predator moves normally  \
  - Medium water: predator is slowed  \
  - High water: predator cannot reach the beaver (blocked)\
\
- Predator reaching the beaver \uc0\u8594  game over\
\
## Simplifications\
\
- No complex pathfinding required\
- No realistic water simulation\
- No physics-based interactions\
- Use simple numeric thresholds for water effects\
\
## Out of Scope\
- Multiple predators\
- AI beavers\
- Multiple maps\
- Advanced simulation systems\
- Visual polish}