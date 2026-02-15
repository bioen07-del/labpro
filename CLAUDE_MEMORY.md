# LabPro Project Memory

## Project Overview
- **Stack**: Next.js 16 + TypeScript 5.9 + React 19 + Tailwind 4 + Supabase + Vercel
- **Version**: 1.28.00
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

## Session 15.02.2026 Changes (v1.28.00 — Media Prep Refactoring)
- Calculator: 4 modes — RECIPE (рабочая среда), STOCK (стоковый раствор), DILUTION (рабочий раствор C₁V₁=C₂V₂), ALIQUOT (аликвотирование)
- RECIPE: unified dropdown (batch:UUID / rm:UUID) — batches + ready_media in one selector
- RECIPE: auto write-off solvent + each component on save
- STOCK: reagent + solvent + concentration, write-off 1 unit
- ALIQUOT: source (batch or ready_medium), N × V ml, total volume write-off
- Inventory tabs: [Все] [Контейнеры] [Поступления] [Стоки] [Готовые среды]
- Detail page: composition renderers for STOCK, ALIQUOT, updated RECIPE (solvent), legacy (base)
- API: getAvailableReadyMedia() — active ready_media with volume > 0

### v1.27.02 (E2E bugfix — same session)
- Fix: URL prefill (?nomenclature_id=) now triggers handleNomenclatureChange (useEffect)
- Fix: '__none__' solvent no longer leaks into batch_id (FK violation prevented)
- Fix: canSubmit excludes '__none__' from valid solvent check
- Fix: availableUnits/unit sync when unit_type is undefined (effectiveUnit fallback)
- Fix: diluent.batch_id cleaned from '__none__' in composition JSON
- Fix: prepDateState replaced with direct useState (Rules of Hooks)
- Fix: module-level componentCounter replaced with useRef

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

## 3-Level Hierarchy (v1.28.00)
- **Level 1: Поступления (AS_RECEIVED)** — batches on inventory, raw reagents/media
- **Level 2: Стоки (STOCK_SOLUTION)** — concentrated single-component solutions from dry/liquid reagents
- **Level 3: Готовые среды (WORKING_SOLUTION/ALIQUOT)** — multi-component media for cell work, or aliquots
- Composition JSON modes: RECIPE (solvent + components), STOCK (source + solvent + concentration), DILUTION (C₁V₁=C₂V₂), ALIQUOT (source + count × volume)
- Unified source selector: `batch:UUID` or `rm:UUID` prefix pattern

## TODO for Next Session
1. Test full 4-mode workflow on live data (RECIPE, STOCK, DILUTION, ALIQUOT)
2. Molar calculations (mM/M using molecular_weight from nomenclature)
3. Recipe templates (save/load)
4. submitDilution: non-atomic operations (3 sequential DB writes, no rollback) — needs server-side transaction
5. RBAC: permission matrix (low priority)

## Current Status
- All 25 phases + 17 iterations complete
- RBAC only partially done (roles exist, RLS enabled but USING(true))
- CULTURE_METRICS.md has full formula documentation
