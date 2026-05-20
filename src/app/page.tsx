'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import KakaoMap from '@/components/KakaoMap';
import Roulette from '@/components/Roulette';
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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Menu {
  name: string;
  price: number;
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

  // Menu checklist states
  const [viewTab, setViewTab] = useState<'restaurant' | 'menu'>('restaurant');
  const [excludedMenus, setExcludedMenus] = useState<string[]>([]);

  // User Geolocation location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get current user location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation access denied or error:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

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

  // Flat list of menus compiled from current filtered restaurants
  const allMenus = useMemo(() => {
    const list: { name: string; price: number; restaurant: Restaurant; imageUrl: string | null }[] = [];
    filteredAndSorted.forEach(res => {
      if (res.menus) {
        res.menus.forEach(menu => {
          list.push({
            name: menu.name,
            price: menu.price,
            restaurant: res,
            imageUrl: menu.imageUrl || null
          });
        });
      }
    });
    return list;
  }, [filteredAndSorted]);

  const toggleMenuSelection = (menuKey: string) => {
    setExcludedMenus(prev => {
      if (prev.includes(menuKey)) {
        return prev.filter(k => k !== menuKey);
      } else {
        return [...prev, menuKey];
      }
    });
  };

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
              <span className="text-[10px] text-muted-foreground font-semibold">
                {userLocation ? '내 위치 기준 실시간 측정 중' : '송파 IT벤처타워 기준 매핑 (위치 권한 권장)'}
              </span>
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

            {/* Add Restaurant button */}
            <Button
              onClick={() => {
                setEditingRes(null);
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-9 text-xs px-3 gap-1 toss-btn-active shrink-0"
            >
              <Plus size={14} /> 추가
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl bg-background border-border h-11 text-xs focus:ring-primary/40 focus:ring-2"
            />
          </div>

          {/* Category Tabs (Horizontal Pill Selector) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full shrink-0 font-bold transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
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
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                  sortBy === sortOption 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sortOption === 'distance' ? '거리순' : sortOption === 'rating' ? '평점순' : '이름순'}
              </button>
            ))}
          </div>
        </div>

        {/* View Tab Selector */}
        <div className="px-4 py-2 border-b border-border/30 bg-background/20 flex gap-2">
          <button
            onClick={() => setViewTab('restaurant')}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all duration-200 cursor-pointer border ${
              viewTab === 'restaurant'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            식당 목록 ({filteredAndSorted.length})
          </button>
          <button
            onClick={() => setViewTab('menu')}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all duration-200 cursor-pointer border ${
              viewTab === 'menu'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            메뉴 목록 ({allMenus.length})
          </button>
        </div>

        {/* Scrollable Cards List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar bg-background/5">
          <AnimatePresence mode="wait">
            {viewTab === 'restaurant' ? (
              <motion.div
                key="restaurants-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredAndSorted.map((res, index) => {
                  const isSelected = selectedRes?.name === res.name && selectedRes?.distance === res.distance;
                  return (
                    <motion.div
                      key={`${res.name}-${index}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                      onMouseEnter={() => setHoveredRes(res)}
                      onMouseLeave={() => setHoveredRes(null)}
                      onClick={() => setSelectedRes(res)}
                    >
                      <Card 
                        className={`relative p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 shadow-sm ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/30' 
                            : 'border-border/60 bg-card hover:border-muted-foreground/30 hover:shadow-md'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Thumbnail Image */}
                          {res.image_url ? (
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-muted flex items-center justify-center">
                              <img
                                src={res.image_url}
                                alt={res.name}
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
                              
                              <div className="text-[9px] text-muted-foreground/60 font-mono mt-1 select-all">
                                좌표: {res.lat.toFixed(6)}, {res.lng.toFixed(6)}
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
                                    {m.name}: <strong className="text-foreground">{m.price.toLocaleString()}원</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Float Hover Controls: Edit / Delete / Details */}
                        <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 bg-card rounded-lg border border-border/60 p-0.5 shadow-sm">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRes(res);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit3 size={12} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-red-500 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(res);
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
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
              </motion.div>
            ) : (
              <motion.div
                key="menus-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2.5"
              >
                {allMenus.map((item, index) => {
                  const menuKey = `${item.restaurant.name}-${item.name}`;
                  const isChecked = !excludedMenus.includes(menuKey);
                  return (
                    <motion.div
                      key={`menu-${item.restaurant.name}-${item.name}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.01, 0.15) }}
                      onClick={() => toggleMenuSelection(menuKey)}
                      className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        isChecked 
                          ? 'border-border bg-card hover:border-primary/20 hover:shadow-md' 
                          : 'border-border/30 bg-card/40 opacity-55 hover:opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 select-none">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox wrapper */}
                          <div className="w-4 h-4 rounded border border-border flex items-center justify-center shrink-0 bg-background">
                            {isChecked && <Check size={12} className="text-primary font-extrabold stroke-[3.5px]" />}
                          </div>

                          {/* Thumbnail */}
                          {item.imageUrl ? (
                            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-muted flex items-center justify-center">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-muted/40 shrink-0 border border-dashed border-border/50 flex items-center justify-center text-[9px] text-muted-foreground font-bold">
                              식기
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-foreground truncate max-w-[130px] sm:max-w-[170px]">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-semibold">
                              {item.restaurant.name} • <span className="text-primary font-bold">{item.restaurant.distance}</span>
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-black text-primary whitespace-nowrap ml-2 shrink-0">
                          {item.price.toLocaleString()}원
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {allMenus.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-border/50 rounded-2xl">
                    검색 조건에 맞는 메뉴가 없습니다.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Roulette Panel Embed */}
        <div className="p-4 border-t border-border bg-card relative z-30">
          <Roulette 
            filteredRestaurants={filteredAndSorted} 
            excludedMenus={excludedMenus}
            onWinnerSelected={(winner) => setSelectedRes(winner)} 
          />
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
    </main>
  );
}
