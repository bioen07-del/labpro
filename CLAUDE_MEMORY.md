# LabPro Project Memory

## Project Overview
- **Stack**: Next.js 16 + TypeScript 5.9 + React 19 + Tailwind 4 + Supabase + Vercel
- **Version**: 1.27.01
- **Two workstations**: Work PC (C:\AICoding\Cline\LabPro master, C:\Users\volchkov.se\.claude-worktrees silly-tu) and Home PC (C:\VSCline\LabPro master, C:\Users\bioen\.claude-worktrees awesome-bohr)
- **User tests on**: awesome-bohr preview URL (labpro-git-awesome-bohr-bioen07s-projects.vercel.app)
- **Build cmd**: `cd frontend && node_modules/.bin/next build`

## Key Lessons
- **NEVER remove functionality**, only fix it ("мы не должны рубить функционал")
- **Syncing branches**: When user says "обновить локалку" = reset local branch to origin/master (NOT merge, reset --hard to avoid conflicts!)
- **awesome-bohr = origin/master** (as of 12.02.2026): awesome-bohr was reset to match master, then our changes added on top
- **User works from TWO PCs**: Don't change workspace paths, add both
- **awesome-bohr is the preview branch** — user checks changes there, not master
- **npm packages per worktree**: After sync, run `npm install` in worktree
- **DB enum order_status**: {PENDING, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD} — NO 'NEW'
- **Ready media uses ACTIVE status**, inventory filter uses AVAILABLE — must map between them
- **Bank code generation**: Must include `code` field (BK-XXXX) when inserting into banks table
- **QR prefixes**: EQ: equipment, RM: ready media, POS: positions, CV: cryo vials, CNT: containers, BK: banks
- **concentration (кл/мл) is TECHNICAL** — do NOT show on lot/culture cards, only in operation_metrics for calculations

## Architecture Notes
- **api.ts**: ~4625 lines, all Supabase operations
- **writeOffBatchVolume()**: Per-bottle volume tracking
- **calculateCultureMetrics()**: Td, CPD, PD calculations from lot data (uses lot.initial_cells, final_cells, harvest_at)
- **forecastGrowth()**: Exponential growth time prediction
- **QRLabel component**: Reusable QR with metadata and print
- **getBatches({usage_tag})**: Filters consumables by nomenclature.usage_tags
- **getBanks({lot_id})**: Filters banks by lot

## Metrics Architecture
- **operation_metrics**: History of "at time of operation" (concentration, viability, total_cells, volume_ml)
- **lot record**: Lifecycle state (initial_cells, final_cells, viability, seeded_at, harvest_at)
- **PASSAGE**: saves operation_metrics + creates new lot with initial_cells
- **FREEZE**: saves operation_metrics + updates lot (final_cells, viability, harvest_at) — fixed v1.25.11
- **THAW**: saves operation_metrics + creates new lot with initial_cells from cryo_vial.cells_count — fixed v1.25.12
- **OBSERVE**: only updates containers (confluent_percent), NO operation_metrics yet
- **FEED**: only writes off media, no metrics

## Session 14.02.2026 Changes (v1.27.01)
- Inventory/new: unit auto-fill from nomenclature (unit_type → cascading Select)
- Inventory/new: content_per_package auto-fills for consumables
- Calculator: per-component mode (each component has its own %, ml, mg, or ЕД)
- Calculator: "Base medium" → "Solvent" — optional for stocks (water, DMSO, PBS — any category)
- Calculator: solvent/diluent with category filter (not only MEDIUM)
- Calculator: removed AS_RECEIVED from physical state (separate "Add batch" button)
- Calculator: 2 modes — Recipe (RECIPE) and Stock Dilution (DILUTION)
- Calculator: mass/activity components don't subtract from solvent volume

## Session 12.02.2026 (v1.25.11 → v1.27.00)
- v1.25.11-v1.25.17: Freeze/Thaw metrics, usage_tags, category filters, low stock thresholds
- v1.26.00: Ready media card, expiration fix, primary culture form, OBSERVE metrics
- v1.27.00: Unit types, physical states, stocks, calculator 3 modes, per-package tracking

## TODO for Next Session
1. submitRecipe: actually write off batch volumes for solvent + each component
2. Test full recipe + stock workflow on live data
3. Molar calculations (mM/M using molecular_weight from nomenclature)
4. Recipe templates (save/load)
5. RBAC: permission matrix (low priority)

## Current Status
- All 25 phases + 17 iterations complete
- RBAC only partially done (roles exist, RLS enabled but USING(true))
- CULTURE_METRICS.md has full formula documentation
