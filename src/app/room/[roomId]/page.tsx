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
      <Sidebar
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onSearchQueryChange={setSearchQuery}
        filteredAndSorted={filteredAndSorted}
        allRestaurants={restaurantsWithDistance}
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
              {/* Participants Badge */}
              <div className="flex items-center gap-1.5 bg-muted/50 border border-border/40 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground">
                <Users size={12} className="text-primary animate-pulse" />
                <span>참여자 {participants.length}명</span>
                <div className="flex -space-x-1 ml-1">
                  {participants.slice(0, 3).map((p) => (
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
        </div>

        {/* Map Area */}
        <div className="flex-grow min-h-0 relative p-4">
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
        </div>
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
