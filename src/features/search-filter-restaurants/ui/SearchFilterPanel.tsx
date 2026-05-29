'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/ui/input';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidthPercent, setThumbWidthPercent] = useState('20%');

  // Drag scroll states
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const dragMovedRef = useRef(false);

  // Scrollbar drag states
  const isDownScrollbarRef = useRef(false);
  const scrollbarStartXRef = useRef(0);
  const scrollbarStartScrollLeftRef = useRef(0);

  const checkScrollLimits = () => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 1);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);

    const isOverflowing = scrollWidth > clientWidth;
    setHasOverflow(isOverflowing);

    if (isOverflowing) {
      const maxScroll = scrollWidth - clientWidth;
      setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
      setThumbWidthPercent(`${(clientWidth / scrollWidth) * 100}%`);
    } else {
      setScrollProgress(0);
      setThumbWidthPercent('100%');
    }
  };

  // Scroll limits check on mount/resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      checkScrollLimits();
    });
    resizeObserver.observe(container);

    const timer = setTimeout(checkScrollLimits, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Global mouse move and mouse up event listeners for ultra-smooth drag scroll
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Category container drag-to-scroll
      if (isDownRef.current) {
        const container = containerRef.current;
        if (!container) return;
        
        e.preventDefault();
        
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startXRef.current) * 1.5; // Drag speed multiplier
        
        if (Math.abs(x - startXRef.current) > 5) {
          dragMovedRef.current = true;
        }
        
        container.style.scrollBehavior = 'auto'; // Instant response during drag
        container.scrollLeft = scrollLeftStartRef.current - walk;
        checkScrollLimits();
        return;
      }

      // 2. Scrollbar thumb drag-to-scroll
      if (isDownScrollbarRef.current) {
        const container = containerRef.current;
        const track = scrollbarTrackRef.current;
        if (!container || !track) return;

        e.preventDefault();

        const deltaX = e.clientX - scrollbarStartXRef.current;
        const trackWidth = track.clientWidth;
        const { scrollWidth } = container;
        
        const scrollDelta = deltaX * (scrollWidth / trackWidth);
        
        container.style.scrollBehavior = 'auto'; // Instant response during drag
        container.scrollLeft = scrollbarStartScrollLeftRef.current + scrollDelta;
        checkScrollLimits();
      }
    };

    const handleGlobalMouseUp = () => {
      // Reset category container drag
      if (isDownRef.current) {
        isDownRef.current = false;
        const container = containerRef.current;
        if (container) {
          container.style.cursor = 'grab';
          container.style.removeProperty('user-select');
          container.style.scrollBehavior = 'smooth';
        }
      }

      // Reset scrollbar drag
      if (isDownScrollbarRef.current) {
        isDownScrollbarRef.current = false;
        document.body.style.removeProperty('user-select');
        const container = containerRef.current;
        if (container) {
          container.style.scrollBehavior = 'smooth';
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    isDownRef.current = true;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftStartRef.current = container.scrollLeft;
    dragMovedRef.current = false;

    // Temporarily change cursor to grabbing
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  };

  const handleScrollbarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const track = scrollbarTrackRef.current;
    if (!container || !track) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    const trackWidth = track.clientWidth;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const thumbWidth = (clientWidth / scrollWidth) * trackWidth;
    const maxScroll = scrollWidth - clientWidth;
    const maxThumbLeft = trackWidth - thumbWidth;
    const thumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumbLeft : 0;

    // If clicked outside the thumb, jump to that scroll location directly (smooth scroll)
    if (clickX < thumbLeft || clickX > thumbLeft + thumbWidth) {
      const targetThumbLeft = clickX - thumbWidth / 2;
      const targetScrollLeft = maxThumbLeft > 0 
        ? (Math.max(0, Math.min(maxThumbLeft, targetThumbLeft)) / maxThumbLeft) * maxScroll
        : 0;
      
      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
      return;
    }

    // Dragging thumb starts
    isDownScrollbarRef.current = true;
    scrollbarStartXRef.current = e.clientX;
    scrollbarStartScrollLeftRef.current = container.scrollLeft;

    document.body.style.userSelect = 'none';
  };

  const handleContainerClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      dragMovedRef.current = false;
    }
  };

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
        <div className="relative group w-full min-w-0">
          {/* Left Fade Overlay */}
          {showLeftArrow && (
            <div className="absolute left-0 top-0 bottom-1.5 w-10 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
          )}

          {/* Scrollable Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onClickCapture={handleContainerClickCapture}
            onScroll={checkScrollLimits}
            className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1.5 scrollbar-none w-full min-w-0 cursor-grab select-none active:cursor-grabbing scroll-smooth"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={(e) => {
                  e.currentTarget.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                  });
                  onSelectCategory(cat);
                }}
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

          {/* Right Fade Overlay */}
          {showRightArrow && (
            <div className="absolute right-0 top-0 bottom-1.5 w-10 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
          )}

          {/* Custom Sleek Scrollbar Indicator (Visible full-width and draggable) */}
          {hasOverflow && (
            <div
              ref={scrollbarTrackRef}
              onMouseDown={handleScrollbarMouseDown}
              className="w-full py-1.5 cursor-pointer mt-2.5 select-none relative group/scrollbar"
            >
              <div className="w-full h-1 bg-muted/70 rounded-full relative transition-all duration-150 group-hover/scrollbar:h-1.5">
                <div
                  className="absolute top-0 bottom-0 bg-primary/70 hover:bg-primary rounded-full transition-all duration-75 cursor-grab active:cursor-grabbing"
                  style={{
                    width: thumbWidthPercent,
                    left: `${scrollProgress * (100 - parseFloat(thumbWidthPercent))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sort & Info Stats Bar */}
      <div className="px-5 py-2.5 border-b border-border/30 bg-background/10 flex items-center justify-between text-xs font-semibold text-muted-foreground select-none">
        <span className="flex items-center gap-1 text-[11px]">
          검색 결과: <strong className="text-foreground">{searchResultCount}</strong>개
        </span>

        {/* Toss-style segment sorting controller */}
        <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/20 relative">
          {(['distance', 'rating', 'name'] as const).map((sortOption) => {
            const isActive = sortBy === sortOption;
            return (
              <button
                key={sortOption}
                type="button"
                onClick={() => onSortByChange(sortOption)}
                className={`relative px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer z-10 ${
                  isActive
                    ? 'text-foreground font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSortBg"
                    className="absolute inset-0 bg-card rounded-md shadow-sm z-[-1]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {sortOption === 'distance' ? '거리순' : sortOption === 'rating' ? '평점순' : '이름순'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
