#!/bin/bash

# src and its inner directories
mkdir -p src/api src/components src/utils src/styles

# Create files inside src directories
touch src/api/RescueTimeAPI.ts
touch src/components/SummaryView.tsx
touch src/components/PieChart.tsx
touch src/styles/main.css
touch src/index.ts

# Other outer directories
mkdir tests assets docs types dist

# Base files
touch tsconfig.json
touch package.json
touch .gitignore
touch README.md
