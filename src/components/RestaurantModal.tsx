'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface Menu {
  name: string;
  price: number;
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

interface RestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Restaurant) => void;
  restaurant?: Restaurant | null; // If present, we are in Edit mode
}

const CATEGORIES = [
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '샐러드',
  '카페/베이커리/패스트푸드',
  '아시안푸드',
];

export default function RestaurantModal({ isOpen, onClose, onSubmit, restaurant }: RestaurantModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [distance, setDistance] = useState('');
  const [rating, setRating] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [naverLink, setNaverLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [lat, setLat] = useState<number>(37.492323);
  const [lng, setLng] = useState<number>(127.121946);
  const [menus, setMenus] = useState<Menu[]>([]);

  // Load values on Edit Mode
  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setCategory(restaurant.category || CATEGORIES[0]);
      setDistance(restaurant.distance || '');
      setRating(restaurant.rating || '');
      setOperatingHours(restaurant.operating_hours || '');
      setNaverLink(restaurant.naver_link || '');
      setImageUrl(restaurant.image_url || '');
      setLat(restaurant.lat || 37.492323);
      setLng(restaurant.lng || 127.121946);
      setMenus(restaurant.menus || []);
    } else {
      // Clear fields for Add Mode
      setName('');
      setCategory(CATEGORIES[0]);
      setDistance('100m');
      setRating('-');
      setOperatingHours('11:00~21:00');
      setNaverLink('');
      setImageUrl('');
      setLat(37.492323);
      setLng(127.121946);
      setMenus([{ name: '대표 세트 메뉴', price: 8000 }]);
    }
  }, [restaurant, isOpen]);

  // Handle menu row additions/removals
  const addMenuRow = () => {
    setMenus([...menus, { name: '', price: 0 }]);
  };

  const removeMenuRow = (index: number) => {
    setMenus(menus.filter((_, i) => i !== index));
  };

  const updateMenuRow = (index: number, field: keyof Menu, value: any) => {
    const updated = [...menus];
    if (field === 'price') {
      updated[index].price = parseInt(value) || 0;
    } else {
      updated[index].name = value;
    }
    setMenus(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('식당 이름을 입력해 주세요.');
      return;
    }

    const toRadians = (deg: number) => (deg * Math.PI) / 180;

    // Auto calculate random lat/lng around IT Venture Tower if coordinates are not tweaked
    let finalLat = lat;
    let finalLng = lng;
    if (!restaurant) {
      const centerLat = 37.492323;
      const centerLng = 127.121946;
      // Extract numeric distance
      const numericDist = parseFloat(distance) || 100;
      const angle = Math.random() * 2 * Math.PI;
      const latOffset = (numericDist * Math.sin(angle)) / 111000.0;
      const lngOffset = (numericDist * Math.cos(angle)) / (111000.0 * Math.cos(toRadians(centerLat)));
      finalLat = centerLat + latOffset;
      finalLng = centerLng + lngOffset;
    }

    const payload: Restaurant = {
      id: restaurant?.id,
      name,
      category,
      distance,
      rating: rating || '-',
      operating_hours: operatingHours,
      naver_link: naverLink || `https://search.naver.com/search.naver?query=${encodeURIComponent(name)}`,
      image_url: imageUrl || null,
      lat: finalLat,
      lng: finalLng,
      menus: menus.filter((m) => m.name.trim() !== ''),
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {restaurant ? '맛집 정보 수정' : '새로운 맛집 등록'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            식당 기본 프로필과 대표 메뉴 가격을 등록할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {/* 식당명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">식당 이름 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 송파순대 가락본점"
              className="rounded-xl border-border bg-background/50"
              required
            />
          </div>

          {/* 카테고리 & 거리 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">거리 (IT벤처타워 기준)</label>
              <Input
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="예: 250m"
                className="rounded-xl border-border bg-background/50"
              />
            </div>
          </div>

          {/* 평점 & 영업시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">평점</label>
              <Input
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="예: 4.5 또는 -"
                className="rounded-xl border-border bg-background/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">영업 시간</label>
              <Input
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="예: 11:30~22:00"
                className="rounded-xl border-border bg-background/50"
              />
            </div>
          </div>

          {/* 네이버 링크 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">네이버 플레이스 링크</label>
            <Input
              value={naverLink}
              onChange={(e) => setNaverLink(e.target.value)}
              placeholder="https://place.naver.com/..."
              className="rounded-xl border-border bg-background/50 text-xs"
            />
          </div>

          {/* 이미지 URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">대표 이미지 주소</label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://search.pstatic.net/..."
              className="rounded-xl border-border bg-background/50 text-xs"
            />
          </div>

          {/* 메뉴 리스트 구성 */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">대표 메뉴 리스트</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMenuRow}
                className="h-7 px-2.5 rounded-lg border-border text-xs gap-1 toss-btn-active"
              >
                <Plus size={12} /> 메뉴 추가
              </Button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {menus.map((menu, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={menu.name}
                    onChange={(e) => updateMenuRow(index, 'name', e.target.value)}
                    placeholder="메뉴명"
                    className="flex-grow rounded-lg border-border bg-background/50 h-8 text-xs"
                  />
                  <Input
                    type="number"
                    value={menu.price || ''}
                    onChange={(e) => updateMenuRow(index, 'price', e.target.value)}
                    placeholder="가격"
                    className="w-24 rounded-lg border-border bg-background/50 h-8 text-xs text-right"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMenuRow(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}

              {menus.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  등록된 추천 메뉴가 없습니다.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/50 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl font-bold toss-btn-active border-border"
            >
              취소
            </Button>
            <Button type="submit" className="rounded-xl bg-primary text-white font-bold toss-btn-active">
              {restaurant ? '저장하기' : '등록하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
