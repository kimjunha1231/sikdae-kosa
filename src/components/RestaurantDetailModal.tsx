'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { MapPin, Clock, Star, ExternalLink, Utensils, X } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const MotionImage = motion(Image);

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
  rating?: string;
  operating_hours?: string;
  naver_link?: string;
  image_url?: string | null;
  lat: number;
  lng: number;
  menus?: Menu[];
}

interface RestaurantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
}

export default function RestaurantDetailModal({ isOpen, onClose, restaurant }: RestaurantDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<{ name: string; imageUrl: string; index: number } | null>(null);

  // Close image preview when detail modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
    }
  }, [isOpen]);

  if (!restaurant) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-none">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {restaurant.category}
            </span>
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
              {restaurant.distance}
            </span>
          </div>
          <DialogTitle className="text-xl font-black tracking-tight text-foreground mt-1">
            {restaurant.name}
          </DialogTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
            <span className="text-yellow-500 font-extrabold flex items-center gap-0.5">
              <Star size={13} className="fill-yellow-500 text-yellow-500" />
              {restaurant.rating && restaurant.rating !== '-' ? restaurant.rating : '평가없음'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Clock size={12} />
              {restaurant.operating_hours || '운영 시간 정보 없음'}
            </span>
          </div>
        </DialogHeader>

        {/* Hero Image */}
        {restaurant.image_url ? (
          <div className="w-full h-44 rounded-2xl overflow-hidden my-4 border border-border/50 relative shadow-sm bg-muted flex items-center justify-center">
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="w-full h-full object-cover transform hover:scale-102 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-full h-24 rounded-2xl bg-muted/30 border border-dashed border-border/60 my-4 flex items-center justify-center text-xs text-muted-foreground font-bold">
            대표 이미지가 등록되지 않았습니다.
          </div>
        )}

        {/* Map Location Detail & Naver Link */}
        <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-muted/40 border border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <MapPin size={14} className="text-muted-foreground/80" />
              네이버 정보 확인
            </span>
            <a
              href={restaurant.naver_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 px-3 rounded-xl border border-border text-xs gap-1 toss-btn-active font-bold bg-background text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer"
            >
              지도에서 열기 <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Menu Section */}
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-black text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2 uppercase tracking-wider">
            <Utensils size={14} className="text-primary" />
            메뉴 및 가격 안내
          </h3>

          <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 scrollbar-thin">
            {restaurant.menus && restaurant.menus.length > 0 ? (
              restaurant.menus.map((menu, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 hover:border-primary/20 transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Menu image thumbnail */}
                    {menu.imageUrl ? (
                      <motion.div
                        layoutId={`menu-image-container-${menu.name}-${index}`}
                        className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted cursor-zoom-in"
                        onClick={() => setSelectedImage({ name: menu.name, imageUrl: menu.imageUrl!, index })}
                      >
                        <MotionImage
                          layoutId={`menu-image-img-${menu.name}-${index}`}
                          whileHover={{ scale: 1.25 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          src={menu.imageUrl}
                          alt={menu.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </motion.div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-muted/40 shrink-0 border border-dashed border-border/50 flex items-center justify-center text-[9px] text-muted-foreground font-extrabold">
                        식기
                      </div>
                    )}
                    <span className="text-xs font-bold text-foreground truncate max-w-[190px] sm:max-w-[240px]">
                      {menu.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-primary whitespace-nowrap ml-2">
                    {formatPrice(menu.price)}원
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                메뉴 정보가 없습니다.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AnimatePresence>
      {selectedImage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          />
          
          {/* Expanded Content Card */}
          <motion.div
            layoutId={`menu-image-container-${selectedImage.name}-${selectedImage.index}`}
            className="relative bg-card border border-border max-w-sm w-full rounded-[32px] overflow-hidden shadow-2xl flex flex-col z-10"
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-background/80 backdrop-blur-md hover:bg-background border border-border text-foreground hover:scale-105 p-2 rounded-full shadow-md z-20 cursor-pointer transition-all toss-btn-active"
            >
              <X size={16} />
            </button>

            <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
              <MotionImage
                layoutId={`menu-image-img-${selectedImage.name}-${selectedImage.index}`}
                src={selectedImage.imageUrl}
                alt={selectedImage.name}
                fill
                className="object-cover"
                sizes="(max-w-md) 100vw, 384px"
                priority
              />
            </div>
            
            <div className="p-6 flex flex-col gap-1.5 bg-card">
              <h4 className="text-sm font-black text-foreground">
                {selectedImage.name}
              </h4>
              {restaurant.menus && restaurant.menus[selectedImage.index] && (
                <p className="text-xs font-black text-primary">
                  {formatPrice(restaurant.menus[selectedImage.index].price)}원
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
