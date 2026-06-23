'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/widgets/sidebar';
import { RestaurantDetailModal, Restaurant, useRestaurantList } from '@/entities/restaurant';

// Dynamic Import to optimize bundle size and disable SSR for browser-only map component
const KakaoMapView = dynamic(
  () => import('@/widgets/map-view').then((mod) => mod.KakaoMapView),
  { ssr: false }
);

const WinnerModal = dynamic(
  () => import('@/features/draw-roulette').then((mod) => mod.WinnerModal),
  { ssr: false }
);

export default function Dashboard() {
  const router = useRouter();

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

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleRouletteSelection = useCallback((name: string) => {
    setRoulettePool((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const handleCreateRoom = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    router.push(`/room/${roomId}`);
  }, [router]);

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

  const handleWinnerSelected = useCallback((winner: Restaurant | null) => {
    setRouletteWinner(winner);
  }, []);

  const handleCloseWinner = useCallback(() => {
    setRouletteWinner(null);
  }, []);

  return (
    <main className="w-full h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* 1. Left Side Dashboard Sidebar Widget */}
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
        onCreateRoom={handleCreateRoom}
      />

      {/* 2. Right Side Fullscreen Maps Widget */}
      <section className="flex-grow h-full relative bg-muted/20">
        <KakaoMapView
          restaurants={filteredAndSorted}
          hoveredRestaurant={hoveredRes}
          selectedRestaurant={selectedRes}
          onSelectRestaurant={handleSelectRes}
          userLocation={userLocation}
          onViewDetails={handleViewDetail}
          roulettePool={roulettePool}
          onWinnerSelected={handleWinnerSelected}
        />
      </section>

      {/* 3. Global Detail Modal */}
      <RestaurantDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        restaurant={detailRes}
        isInPool={detailRes ? roulettePool.includes(detailRes.name) : false}
        onTogglePool={toggleRouletteSelection}
      />

      {/* 4. Global Winner Modal */}
      <WinnerModal
        winner={rouletteWinner}
        onClose={handleCloseWinner}
      />
    </main>
  );
}
