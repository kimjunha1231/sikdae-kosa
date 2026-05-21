# 실시간 조별 협업 룰렛 기능 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여러 유저가 다른 브라우저/컴퓨터에서 동일한 방 주소로 진입해 실시간으로 룰렛 풀을 공동 편집하고 동시에 룰렛을 회전하여 그 결과를 동기화하는 기능을 구축합니다.

**Architecture:** Firebase Realtime Database를 사용하여 방 상태(식당 후보 목록, 접속 유저, 스핀 이벤트 정보)를 동기화하고, Next.js dynamic routing(`/room/[roomId]`)을 설계해 URL 단위로 협업 공간을 구분합니다.

**Tech Stack:** Next.js (App Router), React, Firebase SDK, TailwindCSS (v4), Framer Motion, Lucide React

---

### Task 1: Firebase 라이브러리 설치 및 연동 모듈 초기화

**Files:**
- Create: `src/shared/lib/firebase.ts`
- Modify: `package.json`

- [ ] **Step 1: Firebase npm 라이브러리 추가**

Run: `npm install firebase`

- [ ] **Step 2: Firebase 연동 설정 파일 작성**

Create `src/shared/lib/firebase.ts` with:
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export { db };
```

- [ ] **Step 3: 빌드 검증**

Run: `npx tsc --noEmit`
Expected: PASS with no compile errors.

- [ ] **Step 4: Commit**

Check `.agent/config.yml` for `auto_commit` setting. If true/absent, run:
```bash
git add package.json src/shared/lib/firebase.ts
git commit -m "feat: install firebase and initialize connection helper"
```

---

### Task 2: 실시간 협업 룸 상태 동기화용 커스텀 훅 개발

**Files:**
- Create: `src/features/collaboration/lib/useCollaborativeRoom.ts`

- [ ] **Step 1: 실시간 방 동기화 훅 소스코드 작성**

Create `src/features/collaboration/lib/useCollaborativeRoom.ts` with:
```typescript
import { useState, useEffect } from 'react';
import { ref, onValue, set, remove, update, onDisconnect } from 'firebase/database';
import { db } from '@/shared/lib/firebase';

export interface Participant {
  id: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
}

export interface SpinEvent {
  status: 'idle' | 'spinning' | 'completed';
  startedAt: number;
  winner: string;
  triggerUserId: string;
}

const NICKNAMES = [
  '배고픈 토끼', '행복한 쿼카', '맛있는 피자', '신선한 샐러드', 
  '달콤한 와플', '바삭한 치킨', '매콤한 떡볶이', '따뜻한 우동'
];

export function useCollaborativeRoom(roomId: string) {
  const [restaurants, setRestaurants] = useState<string[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [spinEvent, setSpinEvent] = useState<SpinEvent>({
    status: 'idle',
    startedAt: 0,
    winner: '',
    triggerUserId: '',
  });
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let userId = localStorage.getItem('kosa_user_id');
    let nickname = localStorage.getItem('kosa_user_nickname');
    if (!userId) {
      userId = 'usr_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('kosa_user_id', userId);
    }
    if (!nickname) {
      nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
      localStorage.setItem('kosa_user_nickname', nickname);
    }

    const userRef = ref(db, `rooms/${roomId}/users/${userId}`);
    const roomRef = ref(db, `rooms/${roomId}`);
    const hostCheckRef = ref(db, `rooms/${roomId}/users`);
    
    let isHost = false;
    onValue(hostCheckRef, (snapshot) => {
      const usersData = snapshot.val();
      if (!usersData || Object.keys(usersData).length === 0) {
        isHost = true;
      } else if (usersData[userId!] && usersData[userId!].isHost) {
        isHost = true;
      }
      
      const me: Participant = {
        id: userId!,
        nickname: nickname!,
        isHost,
        joinedAt: Date.now(),
      };
      
      setCurrentUser(me);
      set(userRef, me);
      onDisconnect(userRef).remove();
    }, { onlyOnce: true });

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.restaurants) {
          setRestaurants(Object.keys(data.restaurants));
        } else {
          setRestaurants([]);
        }
        
        if (data.users) {
          setParticipants(Object.values(data.users));
        } else {
          setParticipants([]);
        }
        
        if (data.spinEvent) {
          setSpinEvent(data.spinEvent);
        } else {
          setSpinEvent({
            status: 'idle',
            startedAt: 0,
            winner: '',
            triggerUserId: '',
          });
        }
      } else {
        setRestaurants([]);
        setParticipants([]);
        setSpinEvent({
          status: 'idle',
          startedAt: 0,
          winner: '',
          triggerUserId: '',
        });
      }
    });

    return () => {
      unsubscribe();
      remove(userRef);
    };
  }, [roomId]);

  const toggleRouletteSelection = async (name: string) => {
    const isAdding = !restaurants.includes(name);
    await update(ref(db, `rooms/${roomId}/restaurants`), {
      [name]: isAdding ? true : null
    });
  };

  const triggerSpin = (winnerName: string) => {
    if (!currentUser) return;
    const spinRef = ref(db, `rooms/${roomId}/spinEvent`);
    set(spinRef, {
      status: 'spinning',
      startedAt: Date.now(),
      winner: winnerName,
      triggerUserId: currentUser.id,
    });
  };

  const resetSpin = () => {
    const spinRef = ref(db, `rooms/${roomId}/spinEvent`);
    set(spinRef, {
      status: 'idle',
      startedAt: 0,
      winner: '',
      triggerUserId: '',
    });
  };

  const updateNickname = (newNickname: string) => {
    if (!currentUser) return;
    localStorage.setItem('kosa_user_nickname', newNickname);
    const updatedUser = { ...currentUser, nickname: newNickname };
    setCurrentUser(updatedUser);
    set(ref(db, `rooms/${roomId}/users/${currentUser.id}`), updatedUser);
  };

  return {
    roulettePool: restaurants,
    participants,
    spinEvent,
    currentUser,
    toggleRouletteSelection,
    triggerSpin,
    resetSpin,
    updateNickname,
  };
}
```

- [ ] **Step 2: 빌드 및 타입 검사**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

Check `.agent/config.yml` for `auto_commit` setting. If true/absent, run:
```bash
git add src/features/collaboration/lib/useCollaborativeRoom.ts
git commit -m "feat: implement useCollaborativeRoom real-time hook"
```

---

### Task 3: RouletteSpinner 컴포넌트 실시간 동기화 지원 확장

**Files:**
- Modify: `src/features/draw-roulette/ui/RouletteSpinner.tsx`

- [ ] **Step 1: RouletteSpinner props 및 스핀 이벤트 로직 수정**

Modify `src/features/draw-roulette/ui/RouletteSpinner.tsx` to handle `isCollaborative`, `collaborativeSpinStatus`, `collaborativeWinnerName`, `onTriggerCollaborativeSpin`, `onCollaborativeSpinEnd`:
```typescript
interface RouletteSpinnerProps {
  filteredRestaurants: Restaurant[];
  customPool: string[];
  onWinnerSelected: (winner: Restaurant) => void;
  // Collaborative additions
  isCollaborative?: boolean;
  collaborativeSpinStatus?: 'idle' | 'spinning' | 'completed';
  collaborativeWinnerName?: string;
  onTriggerCollaborativeSpin?: (winner: Restaurant) => void;
  onCollaborativeSpinEnd?: () => void;
}
```
Update `handleSpin` and add a `useEffect` inside the component:
```typescript
  const handleSpin = () => {
    if (isSpinning) return;

    const baseRestaurants = drawMode === 'all2km'
      ? filteredRestaurants.filter(r => r.distanceVal !== undefined && r.distanceVal <= 2000)
      : filteredRestaurants.filter(r => customPool.includes(r.name));

    if (baseRestaurants.length === 0) {
      alert(drawMode === 'all2km'
        ? '2km 이내에 추천해 드릴 식당이 없습니다. 거리 내에 식당이 활성화되어 있는지 확인해 주세요!' 
        : '선택하신 룰렛 후보 식당이 없습니다. 왼쪽 목록에서 룰렛에 추가할 식당들의 체크박스를 눌러주세요!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * baseRestaurants.length);
    const chosen = baseRestaurants[randomIndex];

    if (isCollaborative && onTriggerCollaborativeSpin) {
      onTriggerCollaborativeSpin(chosen);
      return;
    }

    setIsSpinning(true);
    const extraAngle = Math.floor(Math.random() * 360);
    const targetRotation = rotation + 1800 + extraAngle;
    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      onWinnerSelected(chosen);
    }, 3000);
  };

  // Sync animation triggers on collaborative events
  React.useEffect(() => {
    if (!isCollaborative) return;

    if (collaborativeSpinStatus === 'spinning' && collaborativeWinnerName && !isSpinning) {
      setIsSpinning(true);
      const extraAngle = Math.floor(Math.random() * 360);
      const targetRotation = rotation + 1800 + extraAngle;
      setRotation(targetRotation);

      const chosen = filteredRestaurants.find(r => r.name === collaborativeWinnerName);
      setTimeout(() => {
        setIsSpinning(false);
        if (chosen) {
          onWinnerSelected(chosen);
        }
        if (onCollaborativeSpinEnd) {
          onCollaborativeSpinEnd();
        }
      }, 3000);
    }
  }, [collaborativeSpinStatus, collaborativeWinnerName]);
```

- [ ] **Step 2: 빌드 검사**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

Check `.agent/config.yml` for `auto_commit` setting. If true/absent, run:
```bash
git add src/features/draw-roulette/ui/RouletteSpinner.tsx
git commit -m "feat: support collaborative spinning in RouletteSpinner"
```

---

### Task 4: KakaoMapView 컴포넌트 실시간 동기화 지원 확장

**Files:**
- Modify: `src/widgets/map-view/ui/KakaoMapView.tsx`

- [ ] **Step 1: KakaoMapView props 및 RouletteSpinner 연동 확장**

Modify `src/widgets/map-view/ui/KakaoMapView.tsx` to pass the new collaborative props to `RouletteSpinner`:
```typescript
interface KakaoMapViewProps {
  restaurants: Restaurant[];
  hoveredRestaurant: Restaurant | null;
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant | null) => void;
  userLocation: { lat: number; lng: number } | null;
  onViewDetails: (restaurant: Restaurant) => void;
  roulettePool: string[];
  onWinnerSelected: (winner: Restaurant) => void;
  // Collaborative additions
  isCollaborative?: boolean;
  collaborativeSpinStatus?: 'idle' | 'spinning' | 'completed';
  collaborativeWinnerName?: string;
  onTriggerCollaborativeSpin?: (winner: Restaurant) => void;
  onCollaborativeSpinEnd?: () => void;
}
```
Update the render block of `RouletteSpinner` inside `KakaoMapView.tsx` to pass these props.

- [ ] **Step 2: 빌드 검사**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

Check `.agent/config.yml` for `auto_commit` setting. If true/absent, run:
```bash
git add src/widgets/map-view/ui/KakaoMapView.tsx
git commit -m "feat: propagate collaborative spin props through KakaoMapView"
```

---

### Task 5: dynamic route 기반의 Room 페이지 구현

**Files:**
- Create: `src/app/room/[roomId]/page.tsx`

- [ ] **Step 1: Dynamic Route를 따르는 실시간 협업 방 UI & 로직 작성**

Create `src/app/room/[roomId]/page.tsx` that reuses the Dashboard layout, binds to `useCollaborativeRoom`, and provides a share/invitation header with a participants panel:
```typescript
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/widgets/sidebar';
import { KakaoMapView } from '@/widgets/map-view';
import { RestaurantDetailModal, Restaurant } from '@/entities/restaurant';
import { WinnerModal } from '@/features/draw-roulette';
import { useCollaborativeRoom } from '@/features/collaboration/lib/useCollaborativeRoom';
import { Users, Copy, Check, ArrowLeft, Edit2 } from 'lucide-react';

export default function CollaborativeRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [hoveredRes, setHoveredRes] = useState<Restaurant | null>(null);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailRes, setDetailRes] = useState<Restaurant | null>(null);
  const [rouletteWinner, setRouletteWinner] = useState<Restaurant | null>(null);

  const [copied, setCopied] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  const [userLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 37.495055,
    lng: 127.122270,
  });

  const {
    roulettePool,
    participants,
    spinEvent,
    currentUser,
    toggleRouletteSelection,
    triggerSpin,
    resetSpin,
    updateNickname,
  } = useCollaborativeRoom(roomId);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      setRestaurants(data);
    } catch (e) {
      console.error('Failed to load restaurants', e);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const restaurantsWithDistance = useMemo(() => {
    return restaurants.map((res) => {
      const activeCenter = userLocation || { lat: 37.495055, lng: 127.122270 };
      const distM = getHaversineDistance(activeCenter.lat, activeCenter.lng, res.lat, res.lng);
      let formattedDistance = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
      return { ...res, distanceVal: distM, distance: formattedDistance };
    });
  }, [restaurants, userLocation]);

  const filteredAndSorted = useMemo(() => {
    return restaurantsWithDistance
      .filter((res) => {
        const matchesSearch =
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (res.menus && res.menus.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesCategory = selectedCategory === '전체' || res.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return (a.distanceVal ?? 0) - (b.distanceVal ?? 0);
        if (sortBy === 'rating') {
          const getNumericRating = (r?: string) => (!r || r === '-' ? 0 : parseFloat(r));
          return getNumericRating(b.rating) - getNumericRating(a.rating);
        }
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [restaurantsWithDistance, searchQuery, selectedCategory, sortBy]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNickname = () => {
    if (newNickname.trim()) {
      updateNickname(newNickname.trim());
      setIsEditingNickname(false);
    }
  };

  return (
    <main className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Dynamic Collaborative Header */}
      <div className="absolute top-4 left-4 md:left-[480px] right-4 z-30 flex flex-wrap items-center justify-between gap-3 bg-card/90 backdrop-blur-md border border-border px-4 py-3 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-tight flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-black">Room: {roomId}</span>
              실시간 조별 식당 고르기
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">조원들과 공유 링크로 함께 식당을 고르고 추천을 받으세요!</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Nickname Settings */}
          <div className="flex items-center gap-1.5 bg-muted/50 border border-border/40 px-3 py-1.5 rounded-xl text-xs">
            {isEditingNickname ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder={currentUser?.nickname}
                  className="bg-background border border-border rounded px-1.5 py-0.5 w-24 text-[11px] focus:outline-none focus:border-primary"
                  maxLength={10}
                />
                <button onClick={handleSaveNickname} className="text-primary font-bold text-[11px] px-1">저장</button>
              </div>
            ) : (
              <>
                <span className="font-extrabold text-foreground">나: {currentUser?.nickname}</span>
                <button
                  onClick={() => {
                    setNewNickname(currentUser?.nickname || '');
                    setIsEditingNickname(true);
                  }}
                  className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <Edit2 size={11} />
                </button>
              </>
            )}
          </div>

          {/* Copy Share Link Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? '복사 완료' : '초대 링크 복사'}</span>
          </button>
        </div>
      </div>

      {/* Participants Float Badge */}
      <div className="absolute top-22 md:top-22 right-4 z-30 flex items-center gap-2 bg-card/90 backdrop-blur border border-border px-3 py-1.5 rounded-full shadow-md text-[10px] font-bold">
        <Users size={12} className="text-primary" />
        <span>참여자 {participants.length}명</span>
        <div className="flex -space-x-1 ml-1">
          {participants.slice(0, 3).map((p, idx) => (
            <div
              key={p.id}
              className="w-4 h-4 rounded-full bg-primary/20 text-primary border border-background flex items-center justify-center font-extrabold text-[8px]"
              title={p.nickname}
            >
              {p.nickname.charAt(0)}
            </div>
          ))}
          {participants.length > 3 && (
            <div className="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center text-[7px] text-muted-foreground font-bold">
              +{participants.length - 3}
            </div>
          )}
        </div>
      </div>

      <Sidebar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onSearchQueryChange={setSearchQuery}
        filteredAndSorted={filteredAndSorted}
        selectedRes={selectedRes}
        onSelectRes={(res) => setSelectedRes(res)}
        onHoverEnterRes={(res) => setHoveredRes(res)}
        onHoverLeaveRes={() => setHoveredRes(null)}
        roulettePool={roulettePool}
        onTogglePool={toggleRouletteSelection}
        onViewDetail={(res) => {
          setDetailRes(res);
          setIsDetailOpen(true);
        }}
      />

      <section className="flex-grow h-full relative bg-muted/20">
        <KakaoMapView
          restaurants={filteredAndSorted}
          hoveredRestaurant={hoveredRes}
          selectedRestaurant={selectedRes}
          onSelectRestaurant={(res) => setSelectedRes(res)}
          userLocation={userLocation}
          onViewDetails={(res) => {
            setDetailRes(res);
            setIsDetailOpen(true);
          }}
          roulettePool={roulettePool}
          onWinnerSelected={(winner) => {
            triggerSpin(winner.name);
          }}
          isCollaborative={true}
          collaborativeSpinStatus={spinEvent.status}
          collaborativeWinnerName={spinEvent.winner}
          onTriggerCollaborativeSpin={(chosen) => {
            triggerSpin(chosen.name);
          }}
          onCollaborativeSpinEnd={() => {
            // Keep spinning status as is until WinnerModal closes or we reset
          }}
        />
      </section>

      {isDetailOpen && detailRes && (
        <RestaurantDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          restaurant={detailRes}
          isInPool={roulettePool.includes(detailRes.name)}
          onTogglePool={toggleRouletteSelection}
        />
      )}

      {spinEvent.status === 'spinning' && spinEvent.winner && (
        <WinnerModal
          winner={restaurants.find((r) => r.name === spinEvent.winner) || null}
          onClose={() => {
            resetSpin();
          }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: 빌드 검사**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

Check `.agent/config.yml` for `auto_commit` setting. If true/absent, run:
```bash
git add src/app/room/[roomId]/page.tsx
git commit -m "feat: implement collaborative room dynamic route page"
```

---

### Task 6: 메인 대시보드에 실시간 방 생성 버튼 탑재

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 메인 페이지에 방 생성 버튼 구현 및 라우팅 추가**

Modify `src/app/page.tsx` to add a button next to the theme toggle or in the header to create a room:
```typescript
import { useRouter } from 'next/navigation';
// Inside Dashboard component
const router = useRouter();

const handleCreateRoom = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  router.push(`/room/${roomId}`);
};
```
Add the UI element inside `src/app/page.tsx` where appropriate (e.g. inside `SidebarHeader` or as a floating button). Let's see what is inside `SidebarHeader.tsx` to see if we can insert it there.

Wait! Let's view `src/widgets/sidebar/ui/SidebarHeader.tsx`.
```typescript
// Let's modify it to pass the onCreateRoom event
```
Let's see if we should pass `onCreateRoom` prop to `Sidebar` and `SidebarHeader`.
Yes, that keeps it extremely clean!

- [ ] **Step 2: SidebarHeader 및 Sidebar props 확장**

Modify `src/widgets/sidebar/ui/SidebarHeader.tsx` to accept and render a `[실시간 공유방]` button:
```typescript
interface SidebarHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onCreateRoom?: () => void;
}
```
Modify `src/widgets/sidebar/ui/Sidebar.tsx` to pass `onCreateRoom` from page to `SidebarHeader`.
Update `src/app/page.tsx` to pass the custom `handleCreateRoom` function to `Sidebar`.

- [ ] **Step 3: 빌드 검사**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

Check `.agent/config.yml` for `auto_commit` setting. If true/absent, run:
```bash
git add src/app/page.tsx src/widgets/sidebar/ui/Sidebar.tsx src/widgets/sidebar/ui/SidebarHeader.tsx
git commit -m "feat: add Create Shared Room button in Dashboard sidebar"
```
