'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Compass, RotateCw, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Restaurant } from '@/entities/restaurant';

interface RouletteSpinnerProps {
  filteredRestaurants: Restaurant[];
  customPool: string[];
  onWinnerSelected: (winner: Restaurant) => void;
  isCollaborative?: boolean;
  collaborativeSpinStatus?: 'idle' | 'spinning' | 'completed';
  collaborativeWinnerName?: string;
  onTriggerCollaborativeSpin?: (winner: Restaurant) => void;
  onCollaborativeSpinEnd?: () => void;
}

export default function RouletteSpinner({
  filteredRestaurants,
  customPool,
  onWinnerSelected,
  isCollaborative = false,
  collaborativeSpinStatus = 'idle',
  collaborativeWinnerName = '',
  onTriggerCollaborativeSpin,
  onCollaborativeSpinEnd,
}: RouletteSpinnerProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Collapse toggle and Draw mode states
  const [isExpanded, setIsExpanded] = useState(true);
  const [drawMode, setDrawMode] = useState<'all2km' | 'custom'>('all2km');

  // Filter 8 candidates to display on the wheel
  const wheelRestaurants = useMemo(() => {
    if (drawMode === 'custom') {
      return filteredRestaurants.filter(r => customPool.includes(r.name));
    } else {
      // Show closest 8 restaurants within 2km (if none, just show closest 8)
      const nearby = filteredRestaurants.filter(r => r.distanceVal !== undefined && r.distanceVal <= 2000);
      return nearby.length > 0 ? nearby.slice(0, 8) : filteredRestaurants.slice(0, 8);
    }
  }, [filteredRestaurants, customPool, drawMode]);

  // Slices items to display
  const itemsToDisplay = useMemo(() => {
    if (wheelRestaurants.length > 0) {
      return wheelRestaurants.map(r => ({ name: r.name, category: r.category }));
    }
    // Fallback: Default 8 food category slices
    return [
      { name: '한식', category: '한식' },
      { name: '중식', category: '중식' },
      { name: '일식', category: '일식' },
      { name: '양식', category: '양식' },
      { name: '분식', category: '분식' },
      { name: '샐러드', category: '샐러드' },
      { name: '카페', category: '카페/베이커리/패스트푸드' },
      { name: '아시안', category: '아시안푸드' }
    ];
  }, [wheelRestaurants]);

  const K = itemsToDisplay.length;
  const sliceAngle = 360 / K;

  // SVG sector path generator
  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = x + r * Math.cos(startRad);
    const y1 = y + r * Math.sin(startRad);
    const x2 = x + r * Math.cos(endRad);
    const y2 = y + r * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return `M ${x} ${y} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const sliceColors = [
    '#3182f6', // Toss Blue
    '#ff477e', // Toss Pink
    '#1aa273', // Toss Green
    '#ff9d00', // Toss Orange-yellow
    '#a352ff', // Purple
    '#00b8d9', // Teal
    '#ff5630', // Red-orange
    '#0052cc', // Dark blue
  ];

  // Spin Action
  const handleSpin = () => {
    if (isSpinning) return;

    if (wheelRestaurants.length === 0) {
      alert(drawMode === 'all2km'
        ? '추천해 드릴 식당이 근처에 없습니다. 거리 내에 식당이 활성화되어 있는지 확인해 주세요!' 
        : '선택하신 룰렛 후보 식당이 없습니다. 왼쪽 목록에서 룰렛에 추가할 식당들의 체크박스를 눌러주세요!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * wheelRestaurants.length);
    const chosen = wheelRestaurants[randomIndex];

    if (isCollaborative && onTriggerCollaborativeSpin) {
      onTriggerCollaborativeSpin(chosen);
      return;
    }

    setIsSpinning(true);

    // Calculate precise target rotation to land winning index under the top pointer (270 degrees)
    const sliceCenterAngle = (randomIndex + 0.5) * sliceAngle;
    const targetAngle = (270 - sliceCenterAngle + 720) % 360;
    // Perform exactly 5 full spins (1800 deg) plus the alignment offset
    const targetRotation = rotation + (360 - (rotation % 360)) + 1800 + targetAngle;
    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      onWinnerSelected(chosen);
    }, 3000);
  };

  // Sync animation triggers on collaborative events
  useEffect(() => {
    if (!isCollaborative) return;

    if (collaborativeSpinStatus === 'spinning' && collaborativeWinnerName && !isSpinning) {
      setIsSpinning(true);
      
      const winnerIndex = wheelRestaurants.findIndex(r => r.name === collaborativeWinnerName);
      const actualIndex = winnerIndex !== -1 ? winnerIndex : Math.floor(Math.random() * K);
      
      const sliceCenterAngle = (actualIndex + 0.5) * sliceAngle;
      const targetAngle = (270 - sliceCenterAngle + 720) % 360;
      const targetRotation = rotation + (360 - (rotation % 360)) + 1800 + targetAngle;
      
      setRotation(targetRotation);

      const chosen = filteredRestaurants.find(r => r.name === collaborativeWinnerName);
      setTimeout(() => {
        setIsSpinning(false);
        if (chosen) {
          onWinnerSelected(chosen);
        }
        if (onCollaborativeSpinEnd) {
          onCollaborativeSpinEnd();
        }
      }, 3000);
    }
  }, [collaborativeSpinStatus, collaborativeWinnerName, isCollaborative, filteredRestaurants, wheelRestaurants, onWinnerSelected, onCollaborativeSpinEnd, rotation, sliceAngle, K]);

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

      {/* Smooth height transition using grid-template-rows */}
      <div
        className={`w-full grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr] mt-0'
        }`}
      >
        <div className="overflow-hidden w-full flex flex-col items-center">
          <p className="text-[10px] text-muted-foreground text-center mb-3.5 leading-normal">
            결정이 힘들 땐 무작위로 오늘의 식당을 추첨합니다!
          </p>

          {/* Target Pool Segment Selector */}
          <div className="flex bg-muted/60 p-0.5 rounded-xl border border-border/20 mb-4 w-full relative">
            <motion.div
              layout
              className="absolute top-0.5 bottom-0.5 left-0.5 right-0.5 bg-card rounded-lg shadow-sm z-0"
              style={{
                width: 'calc(50% - 0.25rem)',
                left: drawMode === 'all2km' ? '0.125rem' : 'calc(50% + 0.125rem)',
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => setDrawMode('all2km')}
              className={`relative z-10 flex-1 py-1.5 text-[10px] font-black transition-colors duration-200 cursor-pointer ${
                drawMode === 'all2km' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              2km 이내 전체
            </button>
            <button
              type="button"
              onClick={() => setDrawMode('custom')}
              className={`relative z-10 flex-1 py-1.5 text-[10px] font-black transition-colors duration-200 cursor-pointer ${
                drawMode === 'custom' 
                  ? 'text-foreground' 
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
            
            {/* Pointer Pin (at top, pointing down) */}
            <div className="absolute top-[-8px] left-[50%] -translate-x-[50%] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-foreground drop-shadow-md z-20 animate-bounce" style={{ animationDuration: '2s' }} />

            {/* Spinning Dial with SVG slices */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 3, ease: [0.1, 0.8, 0.1, 1] }}
              className="w-36 h-36 rounded-full shadow-lg z-10 overflow-hidden relative bg-muted"
            >
              {K === 1 ? (
                <div className="w-full h-full" style={{ backgroundColor: sliceColors[0] }}>
                  <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-[10px] px-2 text-center select-none">
                    {itemsToDisplay[0].name}
                  </div>
                </div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 200 200" className="transform rotate-0">
                  {itemsToDisplay.map((item, idx) => {
                    const startA = idx * sliceAngle;
                    const endA = (idx + 1) * sliceAngle;
                    const color = sliceColors[idx % sliceColors.length];
                    const midA = startA + (endA - startA) / 2;
                    
                    // Radial placement coordinates for labels
                    const translateRadius = 60; // 60% out from center (100, 100)
                    const rad = (midA - 90) * Math.PI / 180;
                    const tx = 100 + translateRadius * Math.cos(rad);
                    const ty = 100 + translateRadius * Math.sin(rad);
                    
                    const label = item.name.length > 5 ? item.name.slice(0, 4) + '..' : item.name;

                    return (
                      <g key={idx}>
                        <path
                          d={describeArc(100, 100, 100, startA, endA)}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth="0.75"
                        />
                        <text
                          x={tx}
                          y={ty}
                          transform={`rotate(${midA}, ${tx}, ${ty})`}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-white font-black text-[9px] select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
              
              {/* Inner ring blur core */}
              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-card/25 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-none" />
            </motion.div>

            {/* Center Start Button */}
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="absolute inset-0 m-auto w-14 h-14 bg-card rounded-full border-4 border-muted shadow-lg z-20 font-extrabold text-[10px] text-foreground cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 transition-transform toss-btn-active select-none"
            >
              {isSpinning ? 'SPINNING' : 'START'}
            </button>
          </div>

          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl py-5 shadow-md shadow-primary/20 toss-btn-active text-xs cursor-pointer"
          >
            {isSpinning ? '신중하게 고르는 중...' : '오늘 어떤 식당에 가지?'}
          </Button>
        </div>
      </div>
    </div>
  );
}
