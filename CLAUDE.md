# CLAUDE.md

## Build & Development Commands
- Start dev server: `npm run dev`
- Build project: `npm run build`
- Type checking: `npx tsc --noEmit`
- Linter: `npm run lint`

## Project Quirks & Architecture Decisions
- **Roulette Pool**: Managed globally in `src/app/page.tsx` as a `roulettePool` state (`string[]` of restaurant names) and synced across the sidebar, map popup overlays, and the `RestaurantDetailModal`.
- **Crocodile Dentist Game**: Real-time multiplayer betting game synced via Firebase Realtime Database at `rooms/${roomId}/crocodileGame`. The state is controlled using the `useCollaborativeRoom` hook, and the Room page conditionally swaps the map view overlay with the game view when the game is active (`playing` or `bitten`). Automatic turn recovery skips players who disconnect.
- **Detail Modal Toggle**: `RestaurantDetailModal` accepts `isInPool` and `onTogglePool` to toggle a restaurant in/out of the roulette pool directly from the detailed view.
- **Sidebar Tabs**: Displays "맛집 전체보기" (all restaurants) and "선택된 맛집" (roulette pool). The selected tab provides a quick-add search input allowing users to search and add restaurants directly into the pool.
- **Scraper Schedule**: Migrated from GitHub Actions schedule to Vercel Cron (`/api/cron/kbabsang`, scheduled in `vercel.json` at `10 2 * * *` UTC / 11:10 AM KST and `0 0 * * *` UTC / 9:00 AM KST) to bypass GitHub Actions scheduler queue delays and enforce timely lunch menu updates. Vercel Hobby plan 10s timeout constraints apply.
- **Reviews & Ratings System**: Real-time reviews are persisted in Firebase RTDB under `reviews/${restaurantId}/${reviewId}`. Parent views subscribe to this path via `onValue` to dynamically compute average ratings and counts. These live ratings override the static `"rating": "0"` values in `restaurants.json` for live-sorting in the main sidebar.
- **Client-side Image Compression & Storage**: Attached review images are compressed client-side using `HTML5 Canvas` (max 500x500 pixels, `0.6` JPEG quality) before uploading to Firebase RTDB as small Base64 strings (~15-25KB). This avoids standard Firebase Storage bucket requirements while maintaining fast real-time synchronization.
- **Review List Filters & Framer Motion**: Reviews can be sorted (latest, highest, lowest) and filtered by menu (excluding the "식당 전체" label from the filter selector). Image thumbnails inside reviews support full-screen lightbox expansions animated via matching container and image `layoutId` tags.

## Git Workflow & Commit Guidelines
- **Branching Policy**: Always create a feature branch (`feature/<feature-name>`) for new feature development.
- **Commit Message Format**: Adhere strictly to Conventional Commits:
  - `feat`: New features
  - `fix`: Bug fixes
  - `style`: Code style changes, visual/UI updates, CSS tweaks (no logic change)
  - `refactor`: Code refactoring (no new features or bug fixes)
  - `chore`: Build tasks, dependency updates, configuration changes
  - Keep the commit message summary descriptive.
