# LabPro Project Memory

## Project Overview
- **Stack**: Next.js 16 + TypeScript 5.9 + React 19 + Tailwind 4 + Supabase + Vercel
- **Version**: 1.26.00 (Phase 26)
- **Two workstations**: Work PC (C:\AICoding\Cline\LabPro master, C:\Users\volchkov.se\.claude-worktrees silly-tu) and Home PC (C:\VSCline\LabPro master, C:\Users\bioen\.claude-worktrees awesome-bohr)
- **User tests on**: awesome-bohr preview URL (labpro-git-awesome-bohr-bioen07s-projects.vercel.app)
- **Build cmd**: `cd frontend && node_modules/.bin/next build`

## Key Lessons
- **NEVER remove functionality**, only fix it ("мы не должны рубить функционал")
- **Always sync branches**: When user says "обновить локалку" = merge remote into local working branch
- **User works from TWO PCs**: Don't change workspace paths, add both
- **awesome-bohr is the preview branch** — user checks changes there, not master
- **npm packages per worktree**: After merge, new packages may need `npm install` in worktree
- **DB enum order_status**: {PENDING, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD} — NO 'NEW'
- **Ready media uses ACTIVE status**, inventory filter uses AVAILABLE — must map between them
- **Bank code generation**: Must include `code` field (BK-XXXX) when inserting into banks table
- **QR prefixes**: EQ: equipment, RM: ready media, POS: positions, CV: cryo vials, CNT: containers, BK: banks

## Architecture Notes
- **api.ts**: ~4300 lines, all Supabase operations
- **writeOffBatchVolume()**: Per-bottle volume tracking
- **calculateCultureMetrics()**: Td, CPD, PD calculations from lot data
- **forecastGrowth()**: Exponential growth time prediction
- **QRLabel component**: Reusable QR with metadata and print

## Current Status (Phase 26)
- All 26 phases complete
- RBAC only partially done (roles exist, RLS enabled but USING(true))
- CULTURE_METRICS.md has full formula documentation
