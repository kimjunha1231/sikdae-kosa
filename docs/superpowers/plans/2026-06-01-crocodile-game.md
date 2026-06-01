# 🐊 실시간 멀티플레이 악어 게임 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식대 코사(sikdae-kosa) 앱의 실시간 대기방(Room) 내에 모든 참여자가 실시간으로 차례를 돌며 즐길 수 있는 입체형 악어 이빨 누르기(Crocodile Dentist) 게임 기능을 추가합니다.

**Architecture:** Firebase Realtime Database의 `rooms/${roomId}/crocodileGame` 경로를 통해 게임 상태(진행 상태, 눌린 이빨 목록, 벌칙자, 현재 턴)를 실시간 동기화합니다. 화면 단에서는 Next.js 방 페이지(`src/app/room/[roomId]/page.tsx`)가 이 상태를 감지하여 지도가 들어있는 영역을 악어 게임 플레이 판(`CrocodileGame`)으로 실시간 스위칭 렌더링합니다.

**Tech Stack:** React, Next.js (Page Router/FSD), TailwindCSS, framer-motion, Firebase Realtime Database

---

### Task 1: 실시간 협업 훅(useCollaborativeRoom) 확장

**Files:**
* Modify: [useCollaborativeRoom.ts](file:///Users/junha/coding/sikdae-kosa/src/features/collaboration/lib/useCollaborativeRoom.ts)

- [ ] **Step 1: 악어 게임 상태 인터페이스 및 초기 상태 정의**
  파일 상단에 `CrocodileGameState` 인터페이스를 추가하고, 훅 내부에 `crocodileGame` 상태변수를 생성합니다.

  ```typescript
  // 추가할 인터페이스
  export interface CrocodileGameState {
    status: 'idle' | 'playing' | 'bitten';
    teeth: Record<string, 'unpressed' | 'pressed'>;
    dangerIndex: number;
    turnUserId: string;
    loserNickname: string;
  }
  ```

- [ ] **Step 2: Firebase 실시간 동기화 리스너 추가**
  `useCollaborativeRoom` 내부의 `onValue(roomRef, ...)` 구독 리스너 안에 `crocodileGame` 상태 동기화 코드를 추가합니다.

  ```typescript
  // onValue 내부에 추가할 동기화 로직
  if (data.crocodileGame) {
    setCrocodileGame(data.crocodileGame);
  } else {
    setCrocodileGame({
      status: 'idle',
      teeth: {},
      dangerIndex: -1,
      turnUserId: '',
      loserNickname: '',
    });
  }
  ```

- [ ] **Step 3: 악어 게임 액션 정의 (시작, 이빨 누르기, 초기화)**
  훅 내부에 Firebase에 상태를 업데이트하는 게임 이벤트 트리거 함수들을 구현합니다.

  ```typescript
  // 1. 게임 시작 트리거
  const startCrocodileGame = (activeParticipants: Participant[]) => {
    if (activeParticipants.length === 0) return;
    const sorted = [...activeParticipants].sort((a, b) => a.id.localeCompare(b.id));
    const randomDanger = Math.floor(Math.random() * 8); // 8개 이빨 중 하나가 벌칙
    const initialTeeth: Record<string, 'unpressed' | 'pressed'> = {};
    for (let i = 0; i < 8; i++) {
      initialTeeth[i.toString()] = 'unpressed';
    }

    set(ref(db, `rooms/${roomId}/crocodileGame`), {
      status: 'playing',
      teeth: initialTeeth,
      dangerIndex: randomDanger,
      turnUserId: sorted[0].id,
      loserNickname: '',
    });
  };

  // 2. 이빨 누르기 액션
  const pressCrocodileTooth = async (toothIndex: number, activeParticipants: Participant[]) => {
    if (!crocodileGame || crocodileGame.status !== 'playing' || !currentUser) return;
    
    const isDanger = toothIndex === crocodileGame.dangerIndex;
    const gameRef = ref(db, `rooms/${roomId}/crocodileGame`);

    if (isDanger) {
      // 꽝 이빨 클릭 시 -> 벌칙자 설정 및 게임 오버
      await update(gameRef, {
        status: 'bitten',
        loserNickname: currentUser.nickname,
        [`teeth/${toothIndex}`]: 'pressed'
      });
    } else {
      // 안전 이빨 클릭 시 -> 턴 넘기기
      const sorted = [...activeParticipants].sort((a, b) => a.id.localeCompare(b.id));
      const myIdx = sorted.findIndex(p => p.id === currentUser.id);
      const nextIdx = (myIdx + 1) % sorted.length;
      
      await update(gameRef, {
        turnUserId: sorted[nextIdx].id,
        [`teeth/${toothIndex}`]: 'pressed'
      });
    }
  };

  // 3. 게임 리셋 (대기 상태로 돌리기)
  const resetCrocodileGame = () => {
    remove(ref(db, `rooms/${roomId}/crocodileGame`));
  };
  ```

- [ ] **Step 4: 훅의 반환값(Return) 및 타입 추가**
  생성한 상태와 함수들을 `useCollaborativeRoom`의 반환 객체에 추가합니다.
  반환값: `crocodileGame`, `startCrocodileGame`, `pressCrocodileTooth`, `resetCrocodileGame`

- [ ] **Step 5: 정적 타입 검증 수행**
  Run: `npx tsc --noEmit`
  Expected: 에러 없이 정상 검증 완료

- [ ] **Step 6: Commit**
  `.agent/config.yml`의 `auto_commit` 설정 확인 후 커밋 진행 (기본값 true일 경우):
  ```bash
  git add src/features/collaboration/lib/useCollaborativeRoom.ts
  git commit -m "feat: add crocodile game state synchronization to useCollaborativeRoom"
  ```

---

### Task 2: CrocodileGame UI 컴포넌트 개발

**Files:**
* Create: [CrocodileGame.tsx](file:///Users/junha/coding/sikdae-kosa/src/features/crocodile-game/ui/CrocodileGame.tsx)
* Create: [index.ts](file:///Users/junha/coding/sikdae-kosa/src/features/crocodile-game/index.ts)

- [ ] **Step 1: CrocodileGame.tsx UI 개발**
  `framer-motion`과 SVG/CSS를 적용하여 입체적인 디자인의 악어 컴포넌트를 작성합니다. 현재 유저의 턴 여부를 체크하여 상단 턱 닫힘 상태 변화 및 이빨 클릭 비활성화를 처리합니다.

  ```tsx
  'use client';

  import React from 'react';
  import { motion } from 'framer-motion';
  import { Participant } from '@/features/collaboration/lib/useCollaborativeRoom';

  interface CrocodileGameProps {
    status: 'playing' | 'bitten';
    teeth: Record<string, 'unpressed' | 'pressed'>;
    turnUserId: string;
    loserNickname: string;
    currentUser: Participant | null;
    participants: Participant[];
    onPressTooth: (index: number) => void;
    onReset: () => void;
    onClose: () => void;
  }

  export function CrocodileGame({
    status,
    teeth,
    turnUserId,
    loserNickname,
    currentUser,
    participants,
    onPressTooth,
    onReset,
    onClose,
  }: CrocodileGameProps) {
    const isMyTurn = currentUser && turnUserId === currentUser.id && status === 'playing';
    const currentTurnUser = participants.find(p => p.id === turnUserId);

    // 이빨 배치 정보 (SVG 좌표 상 둥글게 원호 배치)
    const teethConfig = [
      { left: '20px', top: '15px', rotate: '50deg' },
      { left: '45px', top: '45px', rotate: '35deg' },
      { left: '75px', top: '70px', rotate: '20deg' },
      { left: '110px', top: '85px', rotate: '5deg' },
      { left: '146px', top: '85px', rotate: '-5deg' },
      { left: '182px', top: '70px', rotate: '-20deg' },
      { left: '212px', top: '45px', rotate: '-35deg' },
      { left: '236px', top: '15px', rotate: '-50deg' },
    ];

    return (
      <div className="w-full h-full min-h-[450px] bg-card border border-border rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between relative overflow-hidden select-none">
        
        {/* 상단 닫기/종료 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors cursor-pointer"
        >
          게임 종료
        </button>

        {/* 타이틀 및 차례 알림 영역 */}
        <div className="text-center mt-2">
          <h2 className="text-lg font-black tracking-tight flex items-center justify-center gap-1.5">
            🐊 악어 이빨 누르기 내기
          </h2>
          <p className="text-xs text-muted-foreground mt-1">이빨을 눌러 꽝에 걸리는 사람이 밥값을 냅니다!</p>
        </div>

        {/* 악어 게임판 본체 */}
        <div className="relative w-[320px] h-[300px] flex items-center justify-center">
          
          {/* 악어 윗턱 (물릴 때 아래로 내려옴) */}
          <motion.div
            animate={{
              y: status === 'bitten' ? 82 : 0,
              rotate: status === 'bitten' ? 0.5 : 0
            }}
            transition={{
              type: 'spring',
              stiffness: status === 'bitten' ? 500 : 250,
              damping: status === 'bitten' ? 18 : 25
            }}
            className="absolute top-8 left-[10px] w-[300px] h-[160px] bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-t-[100px] rounded-b-[30px] border-4 border-emerald-800 shadow-lg z-20 origin-top"
          >
            {/* 콧구멍 */}
            <div className="absolute bottom-5 left-[120px] w-[60px] flex justify-between">
              <div className="w-2.5 h-2.5 bg-emerald-900 rounded-full" />
              <div className="w-2.5 h-2.5 bg-emerald-900 rounded-full" />
            </div>

            {/* 눈동자 범프 */}
            <div className="absolute -top-6 left-[40px] w-[220px] flex justify-between">
              {/* 왼쪽 눈 */}
              <div className="w-[60px] h-[50px] bg-emerald-600 border-4 border-emerald-800 border-b-0 rounded-t-full flex items-center justify-center">
                <div className={`w-[42px] h-[42px] rounded-full border-2 border-emerald-800 flex items-center justify-center transition-colors ${status === 'bitten' ? 'bg-red-500' : 'bg-yellow-400'}`}>
                  <div className={`bg-black rounded-full transition-all ${status === 'bitten' ? 'w-8 h-8' : 'w-2.5 h-7'}`} />
                </div>
              </div>
              {/* 오른쪽 눈 */}
              <div className="w-[60px] h-[50px] bg-emerald-600 border-4 border-emerald-800 border-b-0 rounded-t-full flex items-center justify-center">
                <div className={`w-[42px] h-[42px] rounded-full border-2 border-emerald-800 flex items-center justify-center transition-colors ${status === 'bitten' ? 'bg-red-500' : 'bg-yellow-400'}`}>
                  <div className={`bg-black rounded-full transition-all ${status === 'bitten' ? 'w-8 h-8' : 'w-2.5 h-7'}`} />
                </div>
              </div>
            </div>

            {/* 윗니 (아래로 뾰족하게 내려온 하얀 이빨들) */}
            <div className="absolute bottom-[-13px] left-[20px] right-[20px] flex justify-between pointer-events-none">
              {[...Array(9)].map((_, idx) => (
                <div key={idx} className="w-4 h-6 bg-slate-100 border border-slate-300 rounded-b-md shadow" />
              ))}
            </div>
          </motion.div>

          {/* 악어 아랫턱 & 입 속 */}
          <div className="absolute bottom-4 left-[10px] w-[300px] h-[180px] bg-gradient-to-t from-emerald-700 to-emerald-600 rounded-t-[40px] rounded-b-[90px] border-4 border-emerald-800 shadow-inner z-10">
            {/* 붉은 구강 내부 */}
            <div className="absolute top-[12px] left-[12px] w-[268px] h-[146px] bg-gradient-to-b from-rose-600 to-rose-950 rounded-t-[30px] rounded-b-[75px] overflow-hidden">
              
              {/* 아랫니 8개 배치 */}
              {teethConfig.map((style, idx) => {
                const toothKey = idx.toString();
                const isPressed = teeth[toothKey] === 'pressed';
                return (
                  <button
                    key={idx}
                    disabled={!isMyTurn || isPressed}
                    style={{
                      left: style.left,
                      top: style.top,
                      transform: style.rotate,
                    }}
                    onClick={() => onPressTooth(idx)}
                    className={`absolute w-6 h-8 bg-slate-50 border-2 border-slate-200 border-t-0 rounded-b-lg shadow-md cursor-pointer transition-all duration-150 origin-top
                      ${isPressed ? 'opacity-10 translate-y-3 cursor-not-allowed border-rose-950 bg-rose-900 shadow-none' : 'hover:bg-white hover:translate-y-0.5 hover:scale-105 active:scale-95'}
                      ${isMyTurn && !isPressed ? 'border-primary ring-2 ring-primary/40' : ''}
                    `}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 턴 알림 및 상태 안내 바 */}
        <div className="w-full mt-2">
          {status === 'bitten' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-2xl text-center font-bold text-sm"
            >
              💥 앙! {loserNickname}님이 물렸습니다! 벌칙자로 당첨되셨습니다.
            </motion.div>
          ) : (
            <div className="flex items-center justify-between bg-muted/30 border border-border/40 p-3 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                {isMyTurn ? (
                  <>
                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                    <span className="font-extrabold text-primary">나의 턴 - 벌칙 이빨을 피해 이빨을 누르세요!</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 bg-muted-foreground rounded-full" />
                    <span className="text-muted-foreground">
                      차례 대기 중: <b>{currentTurnUser?.nickname || '참여자'}</b>님의 턴
                    </span>
                  </>
                )}
              </div>
              {status === 'playing' && (
                <button
                  onClick={onReset}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/60 transition-colors"
                >
                  게임 초기화
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: index.ts 작성**
  생성한 컴포넌트를 외부로 공개합니다.

  ```typescript
  export { CrocodileGame } from './ui/CrocodileGame';
  ```

- [ ] **Step 3: 정적 타입 검증**
  Run: `npx tsc --noEmit`
  Expected: 에러 없이 정상 완료

- [ ] **Step 4: Commit**
  커밋 진행 (기본값 true일 경우):
  ```bash
  git add src/features/crocodile-game/ui/CrocodileGame.tsx src/features/crocodile-game/index.ts
  ```
  ```bash
  git commit -m "feat: implement CrocodileGame UI component with framer-motion"
  ```

---

### Task 3: 방(Room) 상세 페이지 연동 및 예외 처리 추가

**Files:**
* Modify: [page.tsx](file:///Users/junha/coding/sikdae-kosa/src/app/room/%5BroomId%5D/page.tsx)

- [ ] **Step 1: 임포트 및 훅 바인딩 추가**
  방 페이지 파일 상단에 `CrocodileGame` 컴포넌트를 불러오고, `useCollaborativeRoom` 호출 결과 반환되는 악어 게임 상태와 함수들을 받아옵니다.

  ```typescript
  // 추가할 import 문
  import { CrocodileGame } from '@/features/crocodile-game';
  ```

  ```typescript
  // useCollaborativeRoom 디스트럭처링에 추가
  const {
    roulettePool,
    participants,
    spinEvent,
    currentUser,
    toggleRouletteSelection,
    triggerSpin,
    completeSpin,
    resetSpin,
    updateNickname,
    // 신규 추가
    crocodileGame,
    startCrocodileGame,
    pressCrocodileTooth,
    resetCrocodileGame,
  } = useCollaborativeRoom(roomId);
  ```

- [ ] **Step 2: 방 헤더 영역에 내기 게임 버튼 추가**
  초대 링크 복사 버튼 옆에 "내기 게임" 시작용 드롭다운 또는 버튼을 추가합니다. 악어 게임 상태가 `idle` 일 때만 활성화됩니다.

  ```tsx
  {/* 복사 버튼 옆에 추가 */}
  {crocodileGame?.status === 'idle' && (
    <button
      onClick={() => startCrocodileGame(participants)}
      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
    >
      <span>🐊 악어 게임 시작</span>
    </button>
  )}
  ```

- [ ] **Step 3: 중앙 화면 스위칭 렌더링 적용**
  `page.tsx` 내부 지도 렌더링 구역(대략 `<div className="flex-grow min-h-0 relative p-4">` 내부)에서 `crocodileGame.status`가 `'playing'` 또는 `'bitten'`인 경우 `<KakaoMapView />` 대신 `<CrocodileGame />`이 렌더링되도록 수정합니다.

  ```tsx
  {crocodileGame && (crocodileGame.status === 'playing' || crocodileGame.status === 'bitten') ? (
    <CrocodileGame
      status={crocodileGame.status}
      teeth={crocodileGame.teeth || {}}
      turnUserId={crocodileGame.turnUserId}
      loserNickname={crocodileGame.loserNickname}
      currentUser={currentUser}
      participants={participants}
      onPressTooth={(idx) => pressCrocodileTooth(idx, participants)}
      onReset={() => startCrocodileGame(participants)}
      onClose={resetCrocodileGame}
    />
  ) : (
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
        setSelectedRes(winner);
      }}
      isCollaborative={true}
      collaborativeSpinStatus={spinEvent.status}
      collaborativeWinnerName={spinEvent.winner}
      onTriggerCollaborativeSpin={(chosen) => {
        triggerSpin(chosen.name);
      }}
      onCollaborativeSpinEnd={() => {
        completeSpin();
      }}
    />
  )}
  ```

- [ ] **Step 4: 방어적 턴 복구 이펙트(Host 전용) 구현**
  방 페이지 컴포넌트 내부에 현재 차례인 유저가 갑자기 퇴장했을 경우 턴을 다음 오프라인이 아닌 사람에게 자동으로 위임하는 `useEffect`를 작성합니다. 호스트(`currentUser.isHost === true`) 권한이 있는 브라우저에서만 데이터베이스 업데이트를 단 한 번 수행하도록 가드합니다.

  ```typescript
  // turnUserId가 속한 사용자가 참가자 목록에 존재하는지 실시간 체크
  useEffect(() => {
    if (!currentUser?.isHost || !crocodileGame || crocodileGame.status !== 'playing') return;
    
    const turnUserExists = participants.some(p => p.id === crocodileGame.turnUserId);
    if (!turnUserExists && participants.length > 0) {
      // 차례를 잡고 있는 유저가 나갔으므로 다음 활성 유저로 스킵
      const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
      const newTurnUserId = sorted[0].id;
      
      update(ref(db, `rooms/${roomId}/crocodileGame`), {
        turnUserId: newTurnUserId
      });
    }
  }, [participants, crocodileGame, currentUser, roomId]);
  ```

- [ ] **Step 5: 정적 타입 빌드 및 린트 검증**
  Run: `npx tsc --noEmit`
  Expected: 빌드 에러 없음
  Run: `npm run lint`
  Expected: 린트 경고/에러 없음

- [ ] **Step 6: Commit**
  커밋 진행 (기본값 true일 경우):
  ```bash
  git add src/app/room/[roomId]/page.tsx
  git commit -m "feat: integrate CrocodileGame into Room page and implement automatic turn skip for host"
  ```
