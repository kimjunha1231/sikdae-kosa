# Roulette Add Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식당 상세 모달에서 해당 식당을 룰렛 추천 풀에 바로 추가하거나 제거할 수 있도록 식당명 옆에 인라인 아이콘 버튼을 구현합니다.

**Architecture:** 
1. [RestaurantDetailModal.tsx](file:///Users/junha/coding/sikdae-kosa/src/entities/restaurant/ui/RestaurantDetailModal.tsx)의 props 인터페이스에 `isInPool`과 `onTogglePool`을 추가하고, 식당 타이틀 옆에 아이콘 토글 버튼을 추가합니다.
2. [page.tsx](file:///Users/junha/coding/sikdae-kosa/src/app/page.tsx)에서 `RestaurantDetailModal` 호출 시 현재 룰렛 풀 포함 상태(`isInPool`)와 토글 처리 함수(`onTogglePool`)를 전달합니다.
3. TypeScript 컴파일러(`tsc --noEmit`)를 실행하여 타입 오류 유무를 검증합니다.

**Tech Stack:** Next.js, React, Tailwind CSS, TypeScript, Lucide React

---

### Task 1: [RestaurantDetailModal] 컴포넌트에 룰렛 추가 토글 버튼 추가

**Files:**
- Modify: `src/entities/restaurant/ui/RestaurantDetailModal.tsx:4-215`

- [ ] **Step 1: Lucide 아이콘 추가 임포트 및 Props 인터페이스 확장**

[RestaurantDetailModal.tsx](file:///Users/junha/coding/sikdae-kosa/src/entities/restaurant/ui/RestaurantDetailModal.tsx)의 상단 `lucide-react` 임포트문에 `Check`, `Plus`를 추가하고, `RestaurantDetailModalProps` 인터페이스를 수정합니다.

```typescript
// 변경 전:
import { MapPin, Clock, Star, ExternalLink, Utensils, X } from 'lucide-react';
// 변경 후:
import { MapPin, Clock, Star, ExternalLink, Utensils, X, Check, Plus } from 'lucide-react';

// 변경 전:
interface RestaurantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
}
// 변경 후:
interface RestaurantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
  isInPool?: boolean;
  onTogglePool?: (name: string) => void;
}
```

- [ ] **Step 2: DialogTitle 영역 레이아웃 및 토글 버튼 마크업 구현**

[RestaurantDetailModal.tsx](file:///Users/junha/coding/sikdae-kosa/src/entities/restaurant/ui/RestaurantDetailModal.tsx)의 `RestaurantDetailModal` 함수 시그니처 및 `DialogTitle` 영역을 수정하여 룰렛 토글 버튼을 렌더링합니다.

```tsx
// 변경 전:
export default function RestaurantDetailModal({ isOpen, onClose, restaurant }: RestaurantDetailModalProps) {
// 변경 후:
export default function RestaurantDetailModal({ 
  isOpen, 
  onClose, 
  restaurant,
  isInPool = false,
  onTogglePool
}: RestaurantDetailModalProps) {
```

```tsx
// 변경 전 (DialogTitle 부분):
            <DialogTitle className="text-xl font-black tracking-tight text-foreground mt-1">
              {restaurant.name}
            </DialogTitle>
// 변경 후 (인라인 룰렛 토글 버튼 추가):
            <div className="flex items-center justify-between gap-4 mt-1">
              <DialogTitle className="text-xl font-black tracking-tight text-foreground truncate">
                {restaurant.name}
              </DialogTitle>
              {onTogglePool && (
                <Button
                  size="icon-sm"
                  variant={isInPool ? "default" : "outline"}
                  className={`h-7 w-7 rounded-xl shrink-0 transition-all duration-200 cursor-pointer ${
                    isInPool 
                      ? 'bg-primary text-white hover:bg-primary/90' 
                      : 'border-border/60 hover:bg-muted text-muted-foreground'
                  }`}
                  onClick={() => onTogglePool(restaurant.name)}
                  title={isInPool ? "룰렛에서 제외" : "룰렛에 추가"}
                >
                  {isInPool ? <Check size={14} className="stroke-[3px]" /> : <Plus size={14} />}
                </Button>
              )}
            </div>
```

- [ ] **Step 3: TypeScript 컴파일 검증**

아직 `page.tsx` 연동 전이므로 컴파일 에러 유무만 임시로 체크합니다.
Run: `npx tsc --noEmit`
Expected: PASS (에러 없음)

- [ ] **Step 4: 변경 사항 커밋**

Check `.agent/config.yml` for `auto_commit` setting.
If `auto_commit: true` (default when absent):
```bash
git add src/entities/restaurant/ui/RestaurantDetailModal.tsx
git commit -m "feat: add roulette toggle button inside RestaurantDetailModal"
```
If `auto_commit: false`: skip commit and staging. Print: "Skipping commit (auto_commit: false)."

---

### Task 2: [page.tsx] 메인 대시보드 컴포넌트와 연동

**Files:**
- Modify: `src/app/page.tsx:178-185`

- [ ] **Step 1: RestaurantDetailModal 호출부에 Props 추가**

[page.tsx](file:///Users/junha/coding/sikdae-kosa/src/app/page.tsx)에서 `RestaurantDetailModal`에 `isInPool`과 `onTogglePool`을 연결합니다.

```tsx
// 변경 전:
      {/* 3. Global Detail Modal */}
      <RestaurantDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailRes(null);
        }}
        restaurant={detailRes}
      />
// 변경 후:
      {/* 3. Global Detail Modal */}
      <RestaurantDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailRes(null);
        }}
        restaurant={detailRes}
        isInPool={detailRes ? roulettePool.includes(detailRes.name) : false}
        onTogglePool={toggleRouletteSelection}
      />
```

- [ ] **Step 2: 최종 TypeScript 컴파일 및 린트 검증**

Run: `npx tsc --noEmit`
Expected: PASS (에러 없음)

- [ ] **Step 3: 변경 사항 커밋**

Check `.agent/config.yml` for `auto_commit` setting.
If `auto_commit: true` (default when absent):
```bash
git add src/app/page.tsx
git commit -m "feat: connect roulette pool toggle props to RestaurantDetailModal in page"
```
If `auto_commit: false`: skip commit and staging. Print: "Skipping commit (auto_commit: false)."
