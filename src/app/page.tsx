'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Sidebar } from '@/widgets/sidebar';
import { KakaoMapView } from '@/widgets/map-view';
import { RestaurantDetailModal, Restaurant } from '@/entities/restaurant';
import { WinnerModal } from '@/features/draw-roulette';

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

  // Detail Dialog states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailRes, setDetailRes] = useState<Restaurant | null>(null);

  // State for tracking custom roulette candidates (names)
  const [roulettePool, setRoulettePool] = useState<string[]>([]);

  // Winner state
  const [rouletteWinner, setRouletteWinner] = useState<Restaurant | null>(null);

  // User location state (Fixed to 37.495055, 127.122270)
  const [userLocation] = useState<{ lat: number; lng: number } | null>({
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

  // Haversine distance calculator helper
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radius of Earth in meters
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

  // Inject dynamic distance to each restaurant
  const restaurantsWithDistance = useMemo(() => {
    return restaurants.map((res) => {
      const activeCenter = userLocation || { lat: 37.495055, lng: 127.122270 };
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
        distance: formattedDistance,
      };
    });
  }, [restaurants, userLocation]);

  // Clean rating helper for numeric sorting
  const getNumericRating = (ratingStr?: string) => {
    if (!ratingStr || ratingStr === '-') return 0;
    const val = parseFloat(ratingStr);
    return isNaN(val) ? 0 : val;
  };

  // Memoized filtered & sorted list of restaurants
  const filteredAndSorted = useMemo(() => {
    return restaurantsWithDistance
      .filter((res) => {
        const matchesSearch =
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (res.menus &&
            res.menus.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesCategory = selectedCategory === '전체' || res.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return (a.distanceVal ?? 0) - (b.distanceVal ?? 0);
        }
        if (sortBy === 'rating') {
          return getNumericRating(b.rating) - getNumericRating(a.rating);
        }
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [restaurantsWithDistance, searchQuery, selectedCategory, sortBy]);

  const toggleRouletteSelection = (name: string) => {
    setRoulettePool((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <main className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* 1. Left Side Dashboard Sidebar Widget */}
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

      {/* 2. Right Side Fullscreen Maps Widget */}
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
            setRouletteWinner(winner);
          }}
        />
      </section>

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

      {/* 4. Global Winner Modal */}
      <WinnerModal
        winner={rouletteWinner}
        onClose={() => setRouletteWinner(null)}
      />
    </main>
  );
}
