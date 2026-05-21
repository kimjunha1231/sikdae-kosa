'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import SidebarHeader from './SidebarHeader';
import { SearchFilterPanel } from '@/features/search-filter-restaurants';
import { RestaurantCard, Restaurant } from '@/entities/restaurant';

interface SidebarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  sortBy: 'distance' | 'rating' | 'name';
  onSortByChange: (sort: 'distance' | 'rating' | 'name') => void;
  onSearchQueryChange: (query: string) => void;
  filteredAndSorted: Restaurant[];
  selectedRes: Restaurant | null;
  onSelectRes: (res: Restaurant | null) => void;
  onHoverEnterRes: (res: Restaurant | null) => void;
  onHoverLeaveRes: () => void;
  roulettePool: string[];
  onTogglePool: (name: string) => void;
  onViewDetail: (res: Restaurant) => void;
  onCreateRoom?: () => void;
}

export default function Sidebar({
  isDarkMode,
  onToggleDarkMode,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortByChange,
  onSearchQueryChange,
  filteredAndSorted,
  selectedRes,
  onSelectRes,
  onHoverEnterRes,
  onHoverLeaveRes,
  roulettePool,
  onTogglePool,
  onViewDetail,
  onCreateRoom,
}: SidebarProps) {
  return (
    <section className="w-full md:w-[460px] h-full flex flex-col shrink-0 border-r border-border bg-card shadow-lg relative z-20">
      <SidebarHeader
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onCreateRoom={onCreateRoom}
      />

      <SearchFilterPanel
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        searchResultCount={filteredAndSorted.length}
        sortBy={sortBy}
        onSortByChange={onSortByChange}
        onSearchQueryChange={onSearchQueryChange}
      />

      {/* Scrollable Restaurant Cards List */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar bg-background/5">
        <AnimatePresence>
          {filteredAndSorted.map((res, index) => {
            const isSelected = selectedRes?.name === res.name && selectedRes?.distance === res.distance;
            const isInPool = roulettePool.includes(res.name);
            return (
              <RestaurantCard
                key={`${res.name}-${index}`}
                restaurant={res}
                index={index}
                isSelected={isSelected}
                isInPool={isInPool}
                onTogglePool={onTogglePool}
                onSelect={() => onSelectRes(res)}
                onHoverEnter={() => onHoverEnterRes(res)}
                onHoverLeave={onHoverLeaveRes}
                onViewDetail={() => onViewDetail(res)}
              />
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
  );
}
