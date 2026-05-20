'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/shared/ui/input';
import { Search } from 'lucide-react';

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

interface SearchFilterPanelProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchResultCount: number;
  sortBy: 'distance' | 'rating' | 'name';
  onSortByChange: (sort: 'distance' | 'rating' | 'name') => void;
  onSearchQueryChange: (query: string) => void;
}

export default function SearchFilterPanel({
  selectedCategory,
  onSelectCategory,
  searchResultCount,
  sortBy,
  onSortByChange,
  onSearchQueryChange,
}: SearchFilterPanelProps) {
  const [searchInput, setSearchInput] = useState('');

  // Debounce search query to prevent heavy recalculations/re-renders on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchQueryChange(searchInput);
    }, 200);
    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, onSearchQueryChange]);

  return (
    <div className="flex flex-col">
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
              type="button"
              onClick={() => onSelectCategory(cat)}
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
          검색 결과: <strong className="text-foreground">{searchResultCount}</strong>개
        </span>

        {/* Toss-style segment sorting controller */}
        <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/20">
          {(['distance', 'rating', 'name'] as const).map((sortOption) => (
            <button
              key={sortOption}
              type="button"
              onClick={() => onSortByChange(sortOption)}
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
    </div>
  );
}
