'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
import { AnimatePresence, motion, useDragControls, PanInfo } from 'framer-motion';
import SidebarHeader from './SidebarHeader';
import { SearchFilterPanel } from '@/features/search-filter-restaurants';
import { RestaurantCard, Restaurant } from '@/entities/restaurant';
import { Plus, Sparkles } from 'lucide-react';
import { Skeleton } from '@/shared/ui/skeleton';

interface SidebarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  sortBy: 'distance' | 'rating' | 'name';
  onSortByChange: (sort: 'distance' | 'rating' | 'name') => void;
  onSearchQueryChange: (query: string) => void;
  filteredAndSorted: Restaurant[];
  allRestaurants: Restaurant[];
  selectedRes: Restaurant | null;
  onSelectRes: (res: Restaurant | null) => void;
  onHoverEnterRes: (res: Restaurant | null) => void;
  onHoverLeaveRes: () => void;
  roulettePool: string[];
  onTogglePool: (name: string) => void;
  onViewDetail: (res: Restaurant) => void;
  onCreateRoom?: () => void;
  isLoading?: boolean;
}

const Sidebar = memo(function Sidebar({
  isDarkMode,
  onToggleDarkMode,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortByChange,
  onSearchQueryChange,
  filteredAndSorted,
  allRestaurants,
  selectedRes,
  onSelectRes,
  onHoverEnterRes,
  onHoverLeaveRes,
  roulettePool,
  onTogglePool,
  onViewDetail,
  onCreateRoom,
  isLoading = false,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'pool'>('all');
  const [addSearchInput, setAddSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold) {
      setIsMobileExpanded(true);
    } else if (info.offset.y > threshold) {
      setIsMobileExpanded(false);
    }
  };

  const poolRestaurants = useMemo(() => {
    return allRestaurants.filter((res) => roulettePool.includes(res.name));
  }, [allRestaurants, roulettePool]);

  const matchingSuggestions = useMemo(() => {
    if (!addSearchInput.trim()) return [];
    return allRestaurants
      .filter((res) => {
        const isAlreadyInPool = roulettePool.includes(res.name);
        const matchesSearch =
          res.name.toLowerCase().includes(addSearchInput.toLowerCase()) ||
          (res.menus &&
            res.menus.some((m) =>
              m.name.toLowerCase().includes(addSearchInput.toLowerCase())
            ));
        return !isAlreadyInPool && matchesSearch;
      })
      .slice(0, 10);
  }, [allRestaurants, roulettePool, addSearchInput]);

  return (
    <motion.section
      className="fixed bottom-0 left-0 right-0 z-30 h-[75vh] rounded-t-[28px] border-t border-border bg-card shadow-2xl flex flex-col md:relative md:bottom-auto md:left-auto md:right-auto md:z-20 md:w-[460px] md:h-full md:rounded-none md:border-t-0 md:border-r md:shadow-lg overflow-hidden touch-none md:touch-auto"
      drag={isMobile ? "y" : false}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.8 }}
      onDragEnd={handleDragEnd}
      animate={isMobile ? { y: isMobileExpanded ? 0 : 'calc(75vh - 96px)' } : { y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {isMobile && (
        <div
          className="w-full py-2.5 flex justify-center items-center cursor-pointer select-none bg-card hover:bg-muted/10 rounded-t-[28px] touch-none"
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      )}
      <div 
        className={isMobile ? "cursor-pointer touch-none" : ""} 
        onPointerDown={(e) => {
          if (isMobile) {
            const target = e.target as HTMLElement;
            if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
              dragControls.start(e);
            }
          }
        }}
        onClick={(e) => {
          if (isMobile) {
            const target = e.target as HTMLElement;
            if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
              setIsMobileExpanded(!isMobileExpanded);
            }
          }
        }}
      >
        <SidebarHeader
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onCreateRoom={onCreateRoom}
        />
      </div>

      {/* Mode Tabs */}
      <div className="px-4 py-2 border-b border-border/50 bg-background/20 shrink-0">
        <div className="relative flex bg-muted/60 p-0.5 rounded-2xl border border-border/20 w-full">
          {/* Active sliding background */}
          <motion.div
            layout
            className="absolute top-0.5 bottom-0.5 left-0.5 right-0.5 bg-card rounded-xl shadow-sm z-0"
            style={{
              width: 'calc(50% - 0.25rem)',
              left: activeTab === 'all' ? '0.125rem' : 'calc(50% + 0.125rem)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
          <button
            onClick={() => setActiveTab('all')}
            className={`relative z-10 flex-grow py-2.5 text-xs font-black rounded-xl cursor-pointer transition-colors duration-200 toss-btn-active ${
              activeTab === 'all'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            맛집 전체보기
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={`relative z-10 flex-grow py-2.5 text-xs font-black rounded-xl cursor-pointer transition-colors duration-200 flex items-center justify-center gap-1.5 toss-btn-active ${
              activeTab === 'pool'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>선택된 맛집</span>
            <span
              className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black transition-all duration-200 ${
                activeTab === 'pool'
                  ? 'bg-primary text-white'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {roulettePool.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'all' ? (
        <>
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
              {isLoading ? (
                // Skeleton Cards for loading state
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-border/40 bg-card space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28 rounded-lg" />
                      <Skeleton className="h-3 w-12 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-lg" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-6 w-16 rounded-xl" />
                      <Skeleton className="h-6 w-16 rounded-xl" />
                    </div>
                  </div>
                ))
              ) : filteredAndSorted.map((res, index) => {
                const isSelected =
                  selectedRes?.name === res.name &&
                  selectedRes?.distance === res.distance;
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

              {!isLoading && filteredAndSorted.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-xs border border-dashed border-border/50 rounded-2xl">
                  검색 조건에 맞는 맛집이 없습니다.
                </div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <>
          {/* Quick Add Search Bar */}
          <div className="p-4 border-b border-border/50 bg-background/30 relative shrink-0">
            <div className="relative">
              <Plus
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary"
              />
              <input
                type="text"
                placeholder="식당 이름으로 검색하여 바로 추가..."
                value={addSearchInput}
                onChange={(e) => {
                  setAddSearchInput(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setIsDropdownOpen(false), 200);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background border border-border text-xs focus:ring-primary/40 focus:ring-2 focus:outline-none placeholder:text-muted-foreground transition-all"
              />
            </div>

            {/* Quick-add Dropdown Search Results */}
            {isDropdownOpen && addSearchInput.trim() && (
              <div className="absolute left-4 right-4 mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                {matchingSuggestions.length > 0 ? (
                  matchingSuggestions.map((res) => (
                    <button
                      key={res.name}
                      onClick={() => {
                        onTogglePool(res.name);
                        setAddSearchInput('');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-muted text-xs flex justify-between items-center transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-foreground">
                          {res.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {res.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-primary font-extrabold">
                        + 추가
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Pool Restaurant Cards List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar bg-background/5">
            <AnimatePresence>
              {poolRestaurants.map((res, index) => {
                const isSelected =
                  selectedRes?.name === res.name &&
                  selectedRes?.distance === res.distance;
                return (
                  <RestaurantCard
                    key={`${res.name}-${index}`}
                    restaurant={res}
                    index={index}
                    isSelected={isSelected}
                    isInPool={true}
                    onTogglePool={onTogglePool}
                    onSelect={() => onSelectRes(res)}
                    onHoverEnter={() => onHoverEnterRes(res)}
                    onHoverLeave={onHoverLeaveRes}
                    onViewDetail={() => onViewDetail(res)}
                  />
                );
              })}

              {poolRestaurants.length === 0 && (
                <div className="text-center py-20 px-6 text-muted-foreground text-xs border border-dashed border-border/50 rounded-2xl flex flex-col items-center gap-3">
                  <Sparkles size={24} className="text-primary animate-pulse" />
                  <span className="font-extrabold text-foreground">
                    선택된 맛집 후보가 없습니다.
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    위의 검색창에서 바로 추가하거나,
                    <br />
                    &apos;맛집 전체보기&apos; 탭에서 식당을 추가해 보세요!
                  </span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.section>
  );
});

export default Sidebar;
