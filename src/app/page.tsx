'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import KakaoMap from '@/components/KakaoMap';
import RestaurantModal from '@/components/RestaurantModal';
import RestaurantDetailModal from '@/components/RestaurantDetailModal';
import {
  Search,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Moon,
  Sun,
  UtensilsCrossed,
  SlidersHorizontal,
  ThumbsUp,
  Eye,
  Check,
  Trophy,
  Clock,
  X,
  Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils';

interface Menu {
  name: string;
  price: number | string;
  imageUrl?: string | null;
}

interface Restaurant {
  id?: string;
  name: string;
  category: string;
  distance: string;
  rating?: string;
  operating_hours?: string;
  naver_link?: string;
  image_url?: string | null;
  lat: number;
  lng: number;
  menus?: Menu[];
}

const CATEGORIES = [
  '전체',
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '샐러드',
  '카페/베이커리/패스트푸드',
  '아시안푸드',
];

export default function Dashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Focus/sync states
  const [hoveredRes, setHoveredRes] = useState<Restaurant | null>(null);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);

  // CRUD Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<Restaurant | null>(null);

  // Detail Dialog states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailRes, setDetailRes] = useState<Restaurant | null>(null);

  // State for tracking custom roulette candidates (names)
  const [roulettePool, setRoulettePool] = useState<string[]>([]);

  const toggleRouletteSelection = (name: string) => {
    setRoulettePool((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Winner modal states
  const [rouletteWinner, setRouletteWinner] = useState<Restaurant | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; color: string; x: number; y: number }[]>([]);

  // Function to trigger confetti
  const triggerConfetti = () => {
    const colors = ['#3182f6', '#ff477e', '#ffb300', '#00c853', '#d500f9', '#00e5ff'];
    const particles = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 150,
    }));
    setConfetti(particles);
  };

  // User Geolocation location state (Fixed to 37.495055, 127.122270)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 37.495055,
    lng: 127.122270,
  });

  // Fetch restaurant list
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

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Debounce search query to prevent heavy recalculations/re-renders on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 200);
    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  // Haversine distance calculator helper
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radius of Earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
  };

  const activeCenter = useMemo(() => {
    return userLocation || { lat: 37.492323, lng: 127.121946 };
  }, [userLocation]);

  // Inject dynamic distance to each restaurant
  const restaurantsWithDistance = useMemo(() => {
    return restaurants.map((res) => {
      const distM = getHaversineDistance(activeCenter.lat, activeCenter.lng, res.lat, res.lng);

      let formattedDistance = '';
      if (distM < 1000) {
        formattedDistance = `${Math.round(distM)}m`;
      } else {
        formattedDistance = `${(distM / 1000).toFixed(1)}km`;
      }

      return {
        ...res,
        distanceVal: distM,
        distance: formattedDistance, // Overwrite distance with dynamic value
      };
    });
  }, [restaurants, activeCenter]);

  // Clean rating helper for numeric sorting
  const getNumericRating = (ratingStr?: string) => {
    if (!ratingStr || ratingStr === '-') return 0;
    const val = parseFloat(ratingStr);
    return isNaN(val) ? 0 : val;
  };

  // Filter & Sort Logic using dynamic distance
  const filteredAndSorted = useMemo(() => {
    return restaurantsWithDistance
      .filter((res) => {
        const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (res.menus && res.menus.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesCategory = selectedCategory === '전체' || res.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return a.distanceVal - b.distanceVal;
        }
        if (sortBy === 'rating') {
          return getNumericRating(b.rating) - getNumericRating(a.rating);
        }
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [restaurantsWithDistance, searchQuery, selectedCategory, sortBy]);



  // Handle Add/Edit Form submission
  const handleModalSubmit = async (payload: Restaurant) => {
    const isEdit = !!payload.id;
    const url = '/api/restaurants';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await response.json();

      if (resData.success) {
        fetchRestaurants();
        setEditingRes(null);
      } else {
        alert(resData.error || '저장에 실패했습니다.');
      }
    } catch (e) {
      console.error('CRUD operation failed', e);
      alert('서버 통신 오류가 발생했습니다.');
    }
  };

  // Handle Delete
  const handleDelete = async (resToDelete: Restaurant) => {
    if (!confirm(`"${resToDelete.name}"을(를) 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/restaurants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resToDelete.id,
          name: resToDelete.name,
          distance: resToDelete.distance
        }),
      });
      const resData = await response.json();

      if (resData.success) {
        fetchRestaurants();
        // Clear focus if deleted
        if (selectedRes?.name === resToDelete.name) setSelectedRes(null);
      } else {
        alert(resData.error || '삭제에 실패했습니다.');
      }
    } catch (e) {
      console.error('Delete request failed', e);
    }
  };

  return (
    <main className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-200">

      {/* 1. Left Side Dashboard Panel */}
      <section className="w-full md:w-[460px] h-full flex flex-col shrink-0 border-r border-border bg-card shadow-lg relative z-20">

        {/* Top Header */}
        <header className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-white">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight flex items-center gap-1">식권대장 대시보드</h1>

            </div>
          </div>

          <div className="flex gap-2">
            {/* Dark Mode Switcher */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-xl w-9 h-9 border border-border shrink-0 cursor-pointer"
            >
              {isDarkMode ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
            </Button>
          </div>
        </header>

        {/* Search Panel */}
        <div className="p-4 flex flex-col gap-3.5 border-b border-border/50 bg-background/30">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="식당명 또는 대표메뉴 검색"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 rounded-2xl bg-background border-border h-11 text-xs focus:ring-primary/40 focus:ring-2"
            />
          </div>

          {/* Category Tabs (Horizontal Pill Selector) */}
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1.5 scrollbar-none w-full min-w-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full shrink-0 font-bold transition-all duration-200 cursor-pointer ${selectedCategory === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Info Stats Bar */}
        <div className="px-5 py-2.5 border-b border-border/30 bg-background/10 flex items-center justify-between text-xs font-semibold text-muted-foreground select-none">
          <span className="flex items-center gap-1 text-[11px]">
            검색 결과: <strong className="text-foreground">{filteredAndSorted.length}</strong>개
          </span>

          {/* Toss-style segment sorting controller */}
          <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/20">
            {(['distance', 'rating', 'name'] as const).map((sortOption) => (
              <button
                key={sortOption}
                onClick={() => setSortBy(sortOption)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${sortBy === sortOption
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {sortOption === 'distance' ? '거리순' : sortOption === 'rating' ? '평점순' : '이름순'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Restaurant Cards List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar bg-background/5">
          <AnimatePresence>
            {filteredAndSorted.map((res, index) => {
              const isSelected = selectedRes?.name === res.name && selectedRes?.distance === res.distance;
              const isInPool = roulettePool.includes(res.name);
              return (
                <motion.div
                  key={`${res.name}-${index}`}
                  initial={index < 15 ? { opacity: 0, y: 15 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={index < 15 ? { duration: 0.2, delay: Math.min(index * 0.02, 0.2) } : { duration: 0 }}
                  onMouseEnter={() => setHoveredRes(res)}
                  onMouseLeave={() => setHoveredRes(null)}
                  onClick={() => setSelectedRes(res)}
                >
                  <Card
                    className={`relative p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 shadow-sm ${isSelected
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/30'
                        : 'border-border/60 bg-card hover:border-muted-foreground/30 hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox for custom roulette pool */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRouletteSelection(res.name);
                        }}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${isInPool
                            ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20 scale-105'
                            : 'border-muted-foreground/30 bg-background hover:border-primary/50'
                          }`}
                        title="룰렛 추천 목록에 추가/제외"
                      >
                        {isInPool && <Check size={12} className="stroke-[3.5px]" />}
                      </div>

                      <div className="flex gap-3 flex-grow min-w-0">
                        {/* Thumbnail Image */}
                        {res.image_url ? (
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-muted flex items-center justify-center">
                            <Image
                              src={res.image_url}
                              alt={res.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-muted/40 shrink-0 border border-dashed border-border/60 flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                            NO IMAGE
                          </div>
                        )}

                        {/* Content details */}
                        <div className="flex-grow min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="font-bold text-xs truncate max-w-[200px] text-foreground">
                                {res.name}
                              </h3>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded font-bold uppercase tracking-wide border-muted-foreground/20 shrink-0 bg-muted/40">
                                {res.category}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 font-semibold">
                              <span className="text-primary font-bold">{res.distance}</span>
                              <span>•</span>
                              <span className="text-yellow-500">{res.rating && res.rating !== '-' ? '★ ' + res.rating : '평가없음'}</span>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{res.operating_hours || '정보 없음'}</span>
                            </div>
                          </div>

                          {/* Top menus price tags preview */}
                          {res.menus && res.menus.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2.5">
                              {res.menus.slice(0, 2).map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="text-[9px] bg-background border border-border/50 px-2 py-0.5 rounded-md font-semibold text-muted-foreground truncate max-w-[130px]"
                                >
                                  {m.name}: <strong className="text-foreground">{formatPrice(m.price)}원</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Float Hover Controls: Details */}
                    <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 bg-card rounded-lg border border-border/60 p-0.5 shadow-sm">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailRes(res);
                          setIsDetailOpen(true);
                        }}
                        title="상세보기"
                      >
                        <Eye size={12} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {filteredAndSorted.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-border/50 rounded-2xl">
                검색 조건에 맞는 맛집이 없습니다.
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 2. Right Side Fullscreen Maps Panel */}
      <section className="flex-grow h-full relative bg-muted/20">
        <KakaoMap
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
            setRouletteWinner(winner);
            triggerConfetti();
          }}
        />
      </section>

      {/* 3. Global Add/Edit Modal */}
      <RestaurantModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRes(null);
        }}
        onSubmit={handleModalSubmit}
        restaurant={editingRes}
      />

      {/* 4. Global Detail Modal */}
      <RestaurantDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailRes(null);
        }}
        restaurant={detailRes}
      />

      {/* 5. Toss Winner modal */}
      <AnimatePresence>
        {rouletteWinner && (
          <div className="fixed inset-0 bg-[#06040d]/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setRouletteWinner(null)} />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-card border border-border sm:rounded-3xl rounded-t-3xl w-full sm:max-w-md p-6 relative z-50 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setRouletteWinner(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-4">
                  <Trophy size={24} />
                </div>
                <h4 className="text-[11px] font-bold text-secondary tracking-widest uppercase mb-1">
                  오늘의 식권 당첨!
                </h4>

                <h2 className="text-2xl font-black mb-2 text-foreground">{rouletteWinner.name}</h2>
                <div className="flex gap-2 text-xs font-semibold text-muted-foreground mb-4">
                  <span className="bg-muted px-2.5 py-1 rounded-lg">{rouletteWinner.category}</span>
                  <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg">{rouletteWinner.distance}</span>
                  {rouletteWinner.rating && rouletteWinner.rating !== '-' && (
                    <span className="bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-lg">★ {rouletteWinner.rating}</span>
                  )}
                </div>

                {/* Display Restaurant image */}
                {rouletteWinner.image_url ? (
                  <div className="w-full h-44 rounded-2xl overflow-hidden border border-border/50 mb-4 bg-muted relative">
                    <Image
                      src={rouletteWinner.image_url}
                      alt={rouletteWinner.name}
                      fill
                      className="object-cover"
                      sizes="(max-w-md) 100vw, 384px"
                      priority
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 bg-muted/30 rounded-2xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs mb-4">
                    네이버 이미지 없음
                  </div>
                )}

                {rouletteWinner.operating_hours && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-5">
                    <Clock size={12} />
                    <span>영업시간: {rouletteWinner.operating_hours}</span>
                  </div>
                )}

                {/* Recommendations checklist */}
                {rouletteWinner.menus && rouletteWinner.menus.length > 0 && (
                  <div className="w-full bg-muted/30 rounded-2xl p-4 border border-border/40 text-left mb-6">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase mb-2">추천 메뉴</h5>
                    <div className="flex flex-col gap-2">
                      {rouletteWinner.menus.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-semibold text-foreground">{m.name}</span>
                          <span className="font-bold text-primary">{formatPrice(m.price)}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => setRouletteWinner(null)}
                    className="flex-1 py-5 rounded-2xl font-bold toss-btn-active border-border"
                  >
                    닫기
                  </Button>
                  <a
                    href={rouletteWinner.naver_link}
                    target="_blank"
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3.5 rounded-2xl shadow-sm text-sm text-center flex items-center justify-center gap-1 toss-btn-active"
                  >
                    <Map size={16} /> 네이버 지도
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confetti Elements */}
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: `${c.x}vw`,
            y: `${c.y}vh`,
            opacity: 0,
            scale: 0.5,
            rotate: 360,
          }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="fixed w-2 h-2 rounded-full pointer-events-none z-[60]"
          style={{ backgroundColor: c.color, top: '50%', left: '50%' }}
        />
      ))}
    </main>
  );
}
