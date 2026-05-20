'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { X, Trophy, Clock, Map } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Menu {
  name: string;
  price: number | string;
  imageUrl?: string | null;
}

interface Restaurant {
  id?: string;
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
  menus?: Menu[];
}

interface WinnerModalProps {
  winner: Restaurant | null;
  onClose: () => void;
}

export default function WinnerModal({ winner, onClose }: WinnerModalProps) {
  const [confetti, setConfetti] = useState<{ id: number; color: string; x: number; y: number }[]>([]);

  // Trigger confetti particles when a winner is drawn
  useEffect(() => {
    if (winner) {
      const colors = ['#3182f6', '#ff477e', '#ffb300', '#00c853', '#d500f9', '#00e5ff'];
      const particles = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 150,
      }));
      setConfetti(particles);
    } else {
      setConfetti([]);
    }
  }, [winner]);

  return (
    <>
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 bg-[#06040d]/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Click backdrop to close */}
            <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-card border border-border sm:rounded-3xl rounded-t-3xl w-full sm:max-w-md p-6 relative z-50 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="닫기"
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
                  <div className="w-full h-44 rounded-2xl overflow-hidden border border-border/50 mb-4 bg-muted relative">
                    <Image
                      src={winner.image_url}
                      alt={winner.name}
                      fill
                      className="object-cover"
                      sizes="(max-w-md) 100vw, 384px"
                      priority
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
                          <span className="font-bold text-primary">{formatPrice(m.price)}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={onClose}
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

      {/* Confetti Elements */}
      {winner && confetti.map((c) => (
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
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: '50%',
            top: '40%',
            width: '10px',
            height: '10px',
            backgroundColor: c.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
