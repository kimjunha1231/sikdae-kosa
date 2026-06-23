'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/widgets/sidebar';
import { RestaurantDetailModal, Restaurant, useRestaurantList } from '@/entities/restaurant';
import { useCollaborativeRoom } from '@/features/collaboration';
import { Users, Copy, Check, ArrowLeft, Edit2, Crown, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { getMemberColorClass } from '@/shared/lib/utils';

// Dynamic imports to optimize initial JS bundle size and defer client-only widgets
const KakaoMapView = dynamic(
  () => import('@/widgets/map-view').then((mod) => mod.KakaoMapView),
  { ssr: false }
);

const WinnerModal = dynamic(
  () => import('@/features/draw-roulette').then((mod) => mod.WinnerModal),
  { ssr: false }
);

const CrocodileGame = dynamic(
  () => import('@/features/crocodile-game').then((mod) => mod.CrocodileGame),
  { ssr: false }
);

export default function CollaborativeRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const {
    restaurants: allRestaurants,
    filteredAndSorted,
    isLoading,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    userLocation
  } = useRestaurantList();

  const [isDarkMode, setIsDarkMode] = useState(true);

  const [hoveredRes, setHoveredRes] = useState<Restaurant | null>(null);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailRes, setDetailRes] = useState<Restaurant | null>(null);

  const [copied, setCopied] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isMembersOpen, setIsMembersOpen] = useState(true);

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
    crocodileGame,
    startCrocodileGame,
    pressCrocodileTooth,
    resetCrocodileGame,
    firebaseError,
  } = useCollaborativeRoom(roomId);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleSaveNickname = useCallback(() => {
    if (newNickname.trim()) {
      updateNickname(newNickname.trim());
      setIsEditingNickname(false);
    }
  }, [newNickname, updateNickname]);

  const handleSelectRes = useCallback((res: Restaurant | null) => {
    setSelectedRes(res);
  }, []);

  const handleHoverEnterRes = useCallback((res: Restaurant | null) => {
    setHoveredRes(res);
  }, []);

  const handleHoverLeaveRes = useCallback(() => {
    setHoveredRes(null);
  }, []);

  const handleViewDetail = useCallback((res: Restaurant) => {
    setDetailRes(res);
    setIsDetailOpen(true);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setDetailRes(null);
  }, []);

  const handleTriggerCollaborativeSpin = useCallback((chosen: Restaurant) => {
    triggerSpin(chosen.name);
  }, [triggerSpin]);

  const handlePressCrocodileTooth = useCallback((idx: number) => {
    pressCrocodileTooth(idx, participants);
  }, [pressCrocodileTooth, participants]);

  const handleStartCrocodileGame = useCallback(() => {
    startCrocodileGame(participants);
  }, [startCrocodileGame, participants]);

  return (
    <main className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-200">
      <Sidebar
        isLoading={isLoading}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onSearchQueryChange={setSearchQuery}
        filteredAndSorted={filteredAndSorted}
        allRestaurants={allRestaurants}
        selectedRes={selectedRes}
        onSelectRes={handleSelectRes}
        onHoverEnterRes={handleHoverEnterRes}
        onHoverLeaveRes={handleHoverLeaveRes}
        roulettePool={roulettePool}
        onTogglePool={toggleRouletteSelection}
        onViewDetail={handleViewDetail}
      />

      <section className="flex-grow min-w-0 h-full flex flex-col relative bg-muted/20">
        {/* Firebase Error Warning Banner */}
        {firebaseError && (
          <div className="mx-4 mt-4 px-4 py-2.5 bg-destructive/15 border border-destructive/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-destructive animate-pulse z-40">
            <AlertTriangle size={14} className="shrink-0" />
            <span>실시간 협업 서버 연결에 실패했습니다 ({firebaseError}). 일부 협업 기능이 작동하지 않을 수 있습니다.</span>
          </div>
        )}

        {/* Dynamic Collaborative Header */}
        <div className="p-4 pb-0 z-30">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card/90 backdrop-blur-md border border-border px-4 py-3 rounded-2xl shadow-lg">
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
              {/* Participants List */}
              <div className="flex items-center gap-2 bg-muted/30 border border-border/40 p-1.5 rounded-2xl max-w-[200px] sm:max-w-[320px] md:max-w-[450px] lg:max-w-[600px] overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-muted-foreground bg-card border border-border/50 shrink-0 shadow-sm">
                  <Users size={12} className="text-primary animate-pulse" />
                  <span>팀원 {participants.length}명</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {participants.map((p) => {
                    const isMe = p.id === currentUser?.id;
                    const userColors = getMemberColorClass(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border shrink-0 transition-all duration-200 ${
                          isMe
                            ? 'bg-primary/15 border-primary/50 text-primary shadow-sm shadow-primary/10 scale-105'
                            : `${userColors.bg} ${userColors.border} ${userColors.text}`
                        }`}
                        title={p.nickname}
                      >
                        {p.isHost && (
                          <Crown size={10} className="text-amber-500 fill-amber-500 shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
                        )}
                        <span className="max-w-[80px] truncate">{p.nickname}</span>
                        {isMe && <span className="text-[9px] opacity-75 font-normal">(나)</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

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

              {/* Crocodile Game Start Button */}
              {crocodileGame?.status === 'idle' && (
                <button
                  onClick={handleStartCrocodileGame}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer animate-fade-in"
                >
                  <span>🐊 내기 게임 시작</span>
                </button>
              )}

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
        </div>

        {/* Map or Crocodile Game Area */}
        <div className="flex-grow min-h-0 relative p-4">
          {crocodileGame && (crocodileGame.status === 'playing' || crocodileGame.status === 'bitten') ? (
            <CrocodileGame
              status={crocodileGame.status}
              teeth={crocodileGame.teeth || {}}
              turnUserId={crocodileGame.turnUserId}
              loserNickname={crocodileGame.loserNickname}
              currentUser={currentUser}
              participants={participants}
              turnOrder={crocodileGame.turnOrder}
              onPressTooth={handlePressCrocodileTooth}
              onReset={handleStartCrocodileGame}
              onClose={resetCrocodileGame}
            />
          ) : (
            <>
              <KakaoMapView
                restaurants={filteredAndSorted}
                hoveredRestaurant={hoveredRes}
                selectedRestaurant={selectedRes}
                onSelectRestaurant={handleSelectRes}
                userLocation={userLocation}
                onViewDetails={handleViewDetail}
                roulettePool={roulettePool}
                onWinnerSelected={handleSelectRes}
                isCollaborative={true}
                collaborativeSpinStatus={spinEvent.status}
                collaborativeWinnerName={spinEvent.winner}
                onTriggerCollaborativeSpin={handleTriggerCollaborativeSpin}
                onCollaborativeSpinEnd={completeSpin}
              />

              {/* Floating Collaborative Members Card */}
              <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
                {isMembersOpen ? (
                  <div className="bg-card/90 backdrop-blur-md border border-border p-4 rounded-2xl shadow-2xl w-60 flex flex-col gap-3 transition-all duration-300 transform scale-100 origin-top-right">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-xs font-black tracking-tight text-foreground flex items-center gap-1.5">
                        <Users size={13} className="text-primary animate-pulse" />
                        실시간 팀원 ({participants.length})
                      </span>
                      <button
                        onClick={() => setIsMembersOpen(false)}
                        className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="접기"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {participants.map((p) => {
                        const isMe = p.id === currentUser?.id;
                        const userColors = getMemberColorClass(p.id);
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all duration-150 ${
                              isMe
                                ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm shadow-primary/5'
                                : `${userColors.bg} ${userColors.border} ${userColors.text}`
                            }`}
                          >
                            <span className="truncate max-w-[120px]">{p.nickname}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {p.isHost && (
                                <span title="방장">
                                  <Crown size={11} className="text-amber-500 fill-amber-500" />
                                </span>
                              )}
                              {isMe && (
                                <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-black scale-90">
                                  나
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsMembersOpen(true)}
                    className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border px-3.5 py-2.5 rounded-2xl shadow-xl hover:bg-muted text-foreground transition-all duration-300 transform scale-100 hover:scale-105 cursor-pointer font-bold text-xs"
                  >
                    <Users size={14} className="text-primary animate-pulse" />
                    <span>팀원 보기 ({participants.length})</span>
                    <ChevronLeft size={14} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {isDetailOpen && detailRes && (
        <RestaurantDetailModal
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          restaurant={detailRes}
          isInPool={roulettePool.includes(detailRes.name)}
          onTogglePool={toggleRouletteSelection}
        />
      )}

      {spinEvent.status === 'completed' && spinEvent.winner && (
        <WinnerModal
          winner={allRestaurants.find((r) => r.name === spinEvent.winner) || null}
          onClose={resetSpin}
        />
      )}
    </main>
  );
}
