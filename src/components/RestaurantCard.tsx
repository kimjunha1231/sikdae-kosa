'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check, Eye } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { motion } from 'framer-motion';

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

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
  isSelected: boolean;
  isInPool: boolean;
  onTogglePool: (name: string) => void;
  onSelect: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onViewDetail: () => void;
}

export default function RestaurantCard({
  restaurant,
  index,
  isSelected,
  isInPool,
  onTogglePool,
  onSelect,
  onHoverEnter,
  onHoverLeave,
  onViewDetail,
}: RestaurantCardProps) {
  return (
    <motion.div
      initial={index < 15 ? { opacity: 0, y: 15 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={index < 15 ? { duration: 0.2, delay: Math.min(index * 0.02, 0.2) } : { duration: 0 }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onClick={onSelect}
    >
      <Card
        className={`group relative p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 shadow-sm ${
          isSelected
            ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-1 ring-primary/30'
            : 'border-border/60 bg-card hover:border-muted-foreground/30 hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Checkbox for custom roulette pool */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onTogglePool(restaurant.name);
            }}
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
              isInPool
                ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20 scale-105'
                : 'border-muted-foreground/30 bg-background hover:border-primary/50'
            }`}
            title="룰렛 추천 목록에 추가/제외"
          >
            {isInPool && <Check size={12} className="stroke-[3.5px]" />}
          </div>

          <div className="flex gap-3 flex-grow min-w-0">
            {/* Thumbnail Image */}
            {restaurant.image_url ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-muted flex items-center justify-center">
                <Image
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted/40 shrink-0 border border-dashed border-border/60 flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                NO IMAGE
              </div>
            )}

            {/* Content details */}
            <div className="flex-grow min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-bold text-xs truncate max-w-[200px] text-foreground">
                    {restaurant.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 rounded font-bold uppercase tracking-wide border-muted-foreground/20 shrink-0 bg-muted/40"
                  >
                    {restaurant.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 font-semibold">
                  <span className="text-primary font-bold">{restaurant.distance}</span>
                  <span>•</span>
                  <span className="text-yellow-500">
                    {restaurant.rating && restaurant.rating !== '-' ? '★ ' + restaurant.rating : '평가없음'}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">{restaurant.operating_hours || '정보 없음'}</span>
                </div>
              </div>

              {/* Top menus price tags preview */}
              {restaurant.menus && restaurant.menus.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {restaurant.menus.slice(0, 2).map((m, mIdx) => (
                    <span
                      key={mIdx}
                      className="text-[9px] bg-background border border-border/50 px-2 py-0.5 rounded-md font-semibold text-muted-foreground truncate max-w-[130px]"
                    >
                      {m.name}: <strong className="text-foreground">{formatPrice(m.price)}원</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Float Hover Controls: Details */}
        <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 bg-card rounded-lg border border-border/60 p-0.5 shadow-sm">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail();
            }}
            title="상세보기"
          >
            <Eye size={12} />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
