'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Compass, RotateCw, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Restaurant {
  name: string;
  category: string;
  distance: string;
  distanceVal?: number;
  rating?: string;
  operating_hours?: string;
  naver_link?: string;
  image_url?: string | null;
  lat: number;
  lng: number;
  menus?: { name: string; price: number | string; imageUrl?: string | null }[];
}

interface RouletteProps {
  filteredRestaurants: Restaurant[];
  customPool: string[];
  onWinnerSelected: (winner: Restaurant) => void;
}

export default function Roulette({ filteredRestaurants, customPool, onWinnerSelected }: RouletteProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Collapse toggle and Draw mode states
  const [isExpanded, setIsExpanded] = useState(true);
  const [drawMode, setDrawMode] = useState<'all2km' | 'custom'>('all2km');

  // Spin Action
  const handleSpin = () => {
    if (isSpinning) return;

    // Filter restaurants based on selected draw mode
    const baseRestaurants = drawMode === 'all2km'
      ? filteredRestaurants.filter(r => r.distanceVal !== undefined && r.distanceVal <= 2000)
      : filteredRestaurants.filter(r => customPool.includes(r.name));

    if (baseRestaurants.length === 0) {
      alert(drawMode === 'all2km'
        ? '2km 이내에 추천해 드릴 식당이 없습니다. 거리 내에 식당이 활성화되어 있는지 확인해 주세요!' 
        : '선택하신 룰렛 후보 식당이 없습니다. 왼쪽 목록에서 룰렛에 추가할 식당들의 체크박스를 눌러주세요!');
      return;
    }

    setIsSpinning(true);

    const randomIndex = Math.floor(Math.random() * baseRestaurants.length);
    const chosen = baseRestaurants[randomIndex];

    const extraAngle = Math.floor(Math.random() * 360);
    const targetRotation = rotation + 1800 + extraAngle;
    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      onWinnerSelected(chosen);
    }, 3000);
  };

  return (
    <div className="bg-card/95 backdrop-blur-md text-card-foreground border border-border rounded-3xl p-5 relative overflow-hidden shadow-lg flex flex-col items-center w-full transition-all duration-200">
      {/* Background radial glow */}
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(49,130,246,0.03)_0%,transparent_60%)] pointer-events-none select-none" />

      {/* Header Toggle Target */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center w-full cursor-pointer select-none py-0.5"
      >
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Compass size={14} className="text-primary animate-pulse" />
          오늘의 식권 추천 룰렛
        </h3>
        <div className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full overflow-hidden flex flex-col items-center"
          >
            <p className="text-[10px] text-muted-foreground text-center mb-3.5 leading-normal">
              결정이 힘들 땐 무작위로 오늘의 식당을 추첨합니다!
            </p>

            {/* Target Pool Segment Selector */}
            <div className="flex bg-muted/60 p-0.5 rounded-xl border border-border/20 mb-4 w-full">
              <button
                type="button"
                onClick={() => setDrawMode('all2km')}
                className={`flex-1 py-1.5 text-[10px] font-black transition-all duration-150 cursor-pointer ${
                  drawMode === 'all2km' 
                    ? 'bg-card text-foreground shadow-sm rounded-lg' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2km 이내 전체
              </button>
              <button
                type="button"
                onClick={() => setDrawMode('custom')}
                className={`flex-1 py-1.5 text-[10px] font-black transition-all duration-150 cursor-pointer ${
                  drawMode === 'custom' 
                    ? 'bg-card text-foreground shadow-sm rounded-lg' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                선택 식당만 ({customPool.length})
              </button>
            </div>

            {/* Rotating Dial Container */}
            <div className="relative w-40 h-40 mb-5 flex items-center justify-center">
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-muted/50 shadow-inner z-0" />
              
              {/* Pointer Pin */}
              <div className="absolute top-[-8px] left-[50%] -translate-x-[50%] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-foreground drop-shadow-md z-20" />

              {/* Spinning Dial */}
              <motion.div
                animate={{ rotate: rotation }}
                transition={{ duration: 3, ease: [0.1, 0.8, 0.1, 1] }}
                className="w-36 h-36 rounded-full bg-gradient-to-tr from-primary via-secondary to-accent shadow-lg flex items-center justify-center z-10"
              >
                <div className="w-[90%] h-[90%] rounded-full bg-card/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-card shadow-md flex items-center justify-center">
                    <RotateCw size={18} className={`text-primary ${isSpinning ? 'animate-spin' : ''}`} />
                  </div>
                </div>
              </motion.div>

              {/* Center Start Button */}
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className="absolute inset-0 m-auto w-14 h-14 bg-card rounded-full border-4 border-muted shadow-lg z-20 font-extrabold text-[10px] text-foreground cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 transition-transform toss-btn-active select-none"
              >
                {isSpinning ? '돌아가는중' : 'START'}
              </button>
            </div>

            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl py-5 shadow-md shadow-primary/20 toss-btn-active text-xs"
            >
              {isSpinning ? '신중하게 고르는 중...' : '오늘 어떤 식당에 가지?'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

