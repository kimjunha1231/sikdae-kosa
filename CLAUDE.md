# CLAUDE.md

## Build & Development Commands
- Start dev server: `npm run dev`
- Build project: `npm run build`
- Type checking: `npx tsc --noEmit`
- Linter: `npm run lint`

## Project Quirks & Architecture Decisions
- **Roulette Pool**: Managed globally in `src/app/page.tsx` as a `roulettePool` state (`string[]` of restaurant names) and synced across the sidebar, map popup overlays, and the `RestaurantDetailModal`.
- **Detail Modal Toggle**: `RestaurantDetailModal` accepts `isInPool` and `onTogglePool` to toggle a restaurant in/out of the roulette pool directly from the detailed view.
- **Sidebar Tabs**: Displays "맛집 전체보기" (all restaurants) and "선택된 맛집" (roulette pool). The selected tab provides a quick-add search input allowing users to search and add restaurants directly into the pool.
- **Scraper Schedule**: Migrated from GitHub Actions schedule to Vercel Cron (`/api/cron/kbabsang`, scheduled in `vercel.json` at `10 2 * * *` UTC / 11:10 AM KST) to bypass GitHub Actions scheduler queue delays and enforce timely lunch menu updates. Vercel Hobby plan 10s timeout constraints apply.

## Git Workflow & Commit Guidelines
- **Branching Policy**: Always create a feature branch (`feature/<feature-name>`) for new feature development.
- **Commit Message Format**: Adhere strictly to Conventional Commits:
  - `feat`: New features
  - `fix`: Bug fixes
  - `style`: Code style changes, visual/UI updates, CSS tweaks (no logic change)
  - `refactor`: Code refactoring (no new features or bug fixes)
  - `chore`: Build tasks, dependency updates, configuration changes
  - Keep the commit message summary descriptive.
