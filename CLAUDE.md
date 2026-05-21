# CLAUDE.md

## Build & Development Commands
- Start dev server: `npm run dev`
- Build project: `npm run build`
- Type checking: `npx tsc --noEmit`
- Linter: `npm run lint`

## Project Quirks & Architecture Decisions
- **Roulette Pool**: Managed globally in `src/app/page.tsx` as a `roulettePool` state (`string[]` of restaurant names) and synced across the sidebar, map popup overlays, and the `RestaurantDetailModal`.
- **Detail Modal Toggle**: `RestaurantDetailModal` accepts `isInPool` and `onTogglePool` to toggle a restaurant in/out of the roulette pool directly from the detailed view.
