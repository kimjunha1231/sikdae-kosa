'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Compass, RotateCw, Map, Trophy, Clock, X, ChevronUp, ChevronDown } from 'lucide-react';
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
  menus?: { name: string; price: number; imageUrl?: string | null }[];
}

interface RouletteProps {
  filteredRestaurants: Restaurant[];
  onWinnerSelected: (winner: Restaurant) => void;
}

export default function Roulette({ filteredRestaurants, onWinnerSelected }: RouletteProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Collapse toggle and 320m filter states
  const [isExpanded, setIsExpanded] = useState(true);
  const [limitDistance, setLimitDistance] = useState(true);

  // Winner state
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; color: string; x: number; y: number }[]>([]);

  // Spin Action
  const handleSpin = () => {
    if (isSpinning) return;

    // Filter restaurants based on distance (320m)
    const baseRestaurants = limitDistance
      ? filteredRestaurants.filter(r => r.distanceVal !== undefined && r.distanceVal <= 320)
      : filteredRestaurants;

    if (baseRestaurants.length === 0) {
      alert(limitDistance 
        ? '320m 이내에 추천해 드릴 식당이 없습니다. 거리 조건을 변경해 주세요!' 
        : '추천해 드릴 식당이 없습니다. 필터를 초기화해 주세요!');
      return;
    }

    setIsSpinning(true);
    setWinner(null);
    setConfetti([]);

    const randomIndex = Math.floor(Math.random() * baseRestaurants.length);
    const chosen = baseRestaurants[randomIndex];

    const extraAngle = Math.floor(Math.random() * 360);
    const targetRotation = rotation + 1800 + extraAngle;
    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(chosen);
      onWinnerSelected(chosen);
      triggerConfetti();
    }, 3000);
  };

  // Generate Confetti particles
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

  return (
    <div className="bg-card text-card-foreground border border-border rounded-3xl p-5 relative overflow-hidden shadow-sm flex flex-col items-center">
      {/* Background radial glow */}
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(49,130,246,0.04)_0%,transparent_60%)] pointer-events-none select-none" />

      {/* Header Toggle Target */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center w-full cursor-pointer select-none py-0.5"
      >
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Compass size={16} className="text-primary animate-pulse" />
          오늘의 식권 추천 룰렛
        </h3>
        <div className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
            <p className="text-[10px] text-muted-foreground text-center mb-4 leading-normal">
              결정이 힘들 땐 무작위로 오늘의 식당을 추첨합니다!
            </p>

            {/* Distance Filter Checkbox */}
            <div className="flex items-center gap-2 mb-4 justify-center select-none cursor-pointer">
              <input
                type="checkbox"
                id="limit-distance-check"
                checked={limitDistance}
                onChange={(e) => setLimitDistance(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary border-border bg-background focus:ring-primary/40 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="limit-distance-check" className="text-[11px] font-extrabold text-foreground cursor-pointer flex items-center gap-1">
                현재 위치에서 320m 이내만 대상
              </label>
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
          className="absolute w-2 h-2 rounded-full pointer-events-none z-50"
          style={{ backgroundColor: c.color, top: '50%', left: '50%' }}
        />
      ))}

      {/* Toss Winner modal */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 bg-[#06040d]/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setWinner(null)} />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-card border border-border sm:rounded-3xl rounded-t-3xl w-full sm:max-w-md p-6 relative z-50 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setWinner(null)}
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

                <h2 className="text-2xl font-black mb-2 text-foreground">{winner.name}</h2>
                <div className="flex gap-2 text-xs font-semibold text-muted-foreground mb-4">
                  <span className="bg-muted px-2.5 py-1 rounded-lg">{winner.category}</span>
                  <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg">{winner.distance}</span>
                  {winner.rating && winner.rating !== '-' && (
                    <span className="bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-lg">★ {winner.rating}</span>
                  )}
                </div>

                {/* Display Restaurant image */}
                {winner.image_url ? (
                  <div className="w-full h-44 rounded-2xl overflow-hidden border border-border/50 mb-4 bg-muted">
                    <img
                      src={winner.image_url}
                      alt={winner.name}
                      className="w-full h-full object-cover"
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

                {winner.operating_hours && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-5">
                    <Clock size={12} />
                    <span>영업시간: {winner.operating_hours}</span>
                  </div>
                )}

                {/* Recommendations checklist */}
                {winner.menus && winner.menus.length > 0 && (
                  <div className="w-full bg-muted/30 rounded-2xl p-4 border border-border/40 text-left mb-6">
                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase mb-2">추천 메뉴</h5>
                    <div className="flex flex-col gap-2">
                      {winner.menus.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-semibold text-foreground">{m.name}</span>
                          <span className="font-bold text-primary">{m.price.toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => setWinner(null)}
                    className="flex-1 py-5 rounded-2xl font-bold toss-btn-active border-border"
                  >
                    닫기
                  </Button>
                  <a
                    href={winner.naver_link}
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
    </div>
  );
}

