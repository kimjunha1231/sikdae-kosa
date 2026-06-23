'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/widgets/sidebar';
import { KakaoMapView } from '@/widgets/map-view';
import { RestaurantDetailModal, Restaurant, Review } from '@/entities/restaurant';
import { WinnerModal } from '@/features/draw-roulette';
import { useCollaborativeRoom } from '@/features/collaboration';
import { Users, Copy, Check, ArrowLeft, Edit2, Crown, ChevronRight, ChevronLeft } from 'lucide-react';
import { CrocodileGame } from '@/features/crocodile-game';
import { ref, onValue } from 'firebase/database';
import { db } from '@/shared/lib/firebase';
import { getHaversineDistance, getMemberColorClass } from '@/shared/lib/utils';



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

  const [copied, setCopied] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [allReviews, setAllReviews] = useState<Record<string, Record<string, Review>>>({});
  const [isMembersOpen, setIsMembersOpen] = useState(true);

  const [userLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 37.495055,
    lng: 127.122270,
  });

  // Subscribe to reviews in Realtime DB
  useEffect(() => {
    const reviewsRef = ref(db, 'reviews');
    const unsubscribe = onValue(reviewsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAllReviews(data);
      } else {
        setAllReviews({});
      }
    });
    return () => unsubscribe();
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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


  const restaurantsWithDistance = useMemo(() => {
    return restaurants.map((res) => {
      const activeCenter = userLocation || { lat: 37.495055, lng: 127.122270 };
      const distM = getHaversineDistance(activeCenter.lat, activeCenter.lng, res.lat, res.lng);
      const formattedDistance = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
      return { ...res, distanceVal: distM, distance: formattedDistance };
    });
  }, [restaurants, userLocation]);

  // Inject dynamic rating from database reviews
  const restaurantsWithDbRatings = useMemo(() => {
    return restaurantsWithDistance.map((res) => {
      const resReviews = allReviews[res.id || ''] || {};
      const reviewsArray = Object.values(resReviews);
      if (reviewsArray.length > 0) {
        const sum = reviewsArray.reduce((acc: number, curr: Review) => acc + (curr.rating || 0), 0);
        const avg = (sum / reviewsArray.length).toFixed(2);
        return {
          ...res,
          rating: avg,
          reviewCount: reviewsArray.length,
        };
      }
      return {
        ...res,
        rating: '0',
        reviewCount: 0,
      };
    });
  }, [restaurantsWithDistance, allReviews]);

  const filteredAndSorted = useMemo(() => {
    return restaurantsWithDbRatings
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
  }, [restaurantsWithDbRatings, searchQuery, selectedCategory, sortBy]);

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
      <Sidebar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onSearchQueryChange={setSearchQuery}
        filteredAndSorted={filteredAndSorted}
        allRestaurants={restaurantsWithDbRatings}
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

      <section className="flex-grow min-w-0 h-full flex flex-col relative bg-muted/20">
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
                  onClick={() => startCrocodileGame(participants)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors cursor-pointer"
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
              onPressTooth={(idx) => pressCrocodileTooth(idx, participants)}
              onReset={() => startCrocodileGame(participants)}
              onClose={resetCrocodileGame}
            />
          ) : (
            <>
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
          onClose={() => setIsDetailOpen(false)}
          restaurant={detailRes}
          isInPool={roulettePool.includes(detailRes.name)}
          onTogglePool={toggleRouletteSelection}
          reviews={detailRes && allReviews[detailRes.id || ''] ? Object.values(allReviews[detailRes.id || '']) : []}
        />
      )}

      {spinEvent.status === 'completed' && spinEvent.winner && (
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
