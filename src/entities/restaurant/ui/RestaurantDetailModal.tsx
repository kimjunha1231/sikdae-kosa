'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { MapPin, Clock, Star, ExternalLink, Utensils, X, Check, Plus, MessageSquare } from 'lucide-react';
import { formatPrice } from '@/shared/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Restaurant, Review } from '../model/types';
import { ref, push, set } from 'firebase/database';
import { db, storage } from '@/shared/lib/firebase';
import { ref as sRef, uploadString, getDownloadURL } from 'firebase/storage';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
  isInPool?: boolean;
  onTogglePool?: (name: string) => void;
  reviews?: Review[];
}

const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function RestaurantDetailModal({ 
  isOpen, 
  onClose, 
  restaurant,
  isInPool = false,
  onTogglePool,
  reviews = []
}: RestaurantDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState<{ name: string; imageUrl: string; index: number } | null>(null);

  // Review form states
  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedMenuInput, setSelectedMenuInput] = useState('식당 전체');
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewImageBase64, setReviewImageBase64] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Review list filter & sort states
  const [sortByReviews, setSortByReviews] = useState<'latest' | 'highest' | 'lowest'>('latest');
  const [menuFilter, setMenuFilter] = useState('전체');

  // Load stored nickname on mount (client-side only to prevent SSR hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('kosa_user_nickname') || '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNicknameInput(stored);
  }, []);

  const handleClose = () => {
    setSelectedImage(null);
    onClose();
  };

  // Calculate menu ratings from the reviews
  const menuRatings = useMemo(() => {
    const ratingsMap: Record<string, { sum: number; count: number; avg: number }> = {};
    if (!reviews || reviews.length === 0) return ratingsMap;

    reviews.forEach((rev) => {
      const menu = rev.menuName || '식당 전체';
      if (!ratingsMap[menu]) {
        ratingsMap[menu] = { sum: 0, count: 0, avg: 0 };
      }
      ratingsMap[menu].sum += rev.rating;
      ratingsMap[menu].count += 1;
    });

    Object.keys(ratingsMap).forEach((key) => {
      ratingsMap[key].avg = parseFloat((ratingsMap[key].sum / ratingsMap[key].count).toFixed(1));
    });

    return ratingsMap;
  }, [reviews]);

  // Filter & sort reviews list
  const filteredAndSortedReviews = useMemo(() => {
    if (!reviews) return [];
    
    let result = [...reviews];
    if (menuFilter !== '전체') {
      result = result.filter((r) => r.menuName === menuFilter);
    }
    
    return result.sort((a, b) => {
      if (sortByReviews === 'highest') {
        return b.rating - a.rating || b.createdAt - a.createdAt;
      }
      if (sortByReviews === 'lowest') {
        return a.rating - b.rating || b.createdAt - a.createdAt;
      }
      return b.createdAt - a.createdAt; // default 'latest'
    });
  }, [reviews, menuFilter, sortByReviews]);

  // Image attach handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setReviewImageBase64(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setReviewImageBase64('');
  };

  // Submit review to Firebase RTDB and upload image to Storage
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    if (!nicknameInput.trim() || !commentInput.trim()) return;

    localStorage.setItem('kosa_user_nickname', nicknameInput.trim());
    setIsUploading(true);

    try {
      let uploadedImageUrl = '';
      
      if (reviewImageBase64) {
        const fileExtension = 'jpg';
        const fileName = `${Date.now()}_review.${fileExtension}`;
        const imageRef = sRef(storage, `reviews/${restaurant.id}/${fileName}`);
        
        await uploadString(imageRef, reviewImageBase64, 'data_url');
        uploadedImageUrl = await getDownloadURL(imageRef);
      }

      const reviewRef = ref(db, `reviews/${restaurant.id}`);
      const newReviewRef = push(reviewRef);
      
      const newReview: Review = {
        id: newReviewRef.key || Date.now().toString(),
        nickname: nicknameInput.trim(),
        menuName: selectedMenuInput,
        rating: ratingInput,
        comment: commentInput.trim(),
        createdAt: Date.now()
      };

      if (uploadedImageUrl) {
        newReview.reviewImage = uploadedImageUrl;
      }

      await set(newReviewRef, newReview);
      setCommentInput('');
      setReviewImageBase64('');
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!restaurant) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl w-full rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Restaurant Info & Menus */}
            <div className="space-y-4 md:sticky md:top-0">
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {restaurant.category}
                  </span>
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
                    {restaurant.distance}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 mt-1 w-full min-w-0">
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground truncate min-w-0 flex-1">
                    {restaurant.name}
                  </DialogTitle>
                  {onTogglePool && (
                    <Button
                      size="sm"
                      className={`h-7 px-3 rounded-xl shrink-0 text-xs font-bold gap-1 transition-all duration-200 cursor-pointer ${
                        isInPool 
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80' 
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      onClick={() => onTogglePool(restaurant.name)}
                    >
                      {isInPool ? (
                        <>
                          <Check size={12} className="stroke-[3px]" />
                          <span>룰렛 제외하기</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} className="stroke-[3px]" />
                          <span>룰렛 추가하기</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                  <span className="text-yellow-500 font-extrabold flex items-center gap-0.5">
                    <Star size={13} className="fill-yellow-500 text-yellow-500" />
                    {reviews && reviews.length > 0 ? (
                      `${(reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / reviews.length).toFixed(2)} (${reviews.length}개 평가)`
                    ) : (
                      restaurant.rating && restaurant.rating !== '0' ? restaurant.rating : '평가없음'
                    )}
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
                <motion.div 
                  layoutId={`hero-image-container-${restaurant.name}`}
                  className="w-full h-44 rounded-2xl overflow-hidden my-4 border border-border/50 relative shadow-sm bg-muted flex items-center justify-center cursor-zoom-in"
                  onClick={() => setSelectedImage({ name: restaurant.name, imageUrl: restaurant.image_url!, index: -1 })}
                >
                  <motion.img
                    layoutId={`hero-image-img-${restaurant.name}`}
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover transform hover:scale-102 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </motion.div>
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

                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 scrollbar-thin">
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
                          {menu.imageUrl ? (
                            <motion.div
                              layoutId={`menu-image-container-${menu.name}-${index}`}
                              className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted cursor-zoom-in"
                              onClick={() => setSelectedImage({ name: menu.name, imageUrl: menu.imageUrl!, index })}
                            >
                              <motion.img
                                layoutId={`menu-image-img-${menu.name}-${index}`}
                                whileHover={{ scale: 1.25 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                src={menu.imageUrl}
                                alt={menu.name}
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
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground truncate max-w-[170px] sm:max-w-[220px]">
                              {menu.name}
                            </span>
                            {menuRatings[menu.name] && (
                              <span className="text-[9px] text-yellow-500 font-extrabold flex items-center gap-0.5 mt-0.5">
                                <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                {menuRatings[menu.name].avg} ({menuRatings[menu.name].count}개 평)
                              </span>
                            )}
                          </div>
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
            </div>

            {/* Right Column: Review Writing Form & Review List */}
            <div className="space-y-5 md:pl-6 md:border-l border-border/40">
              
              {/* Review Writing Form */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-foreground flex items-center gap-1.5 border-b border-border/50 pb-2 uppercase tracking-wider">
                  <MessageSquare size={14} className="text-primary" />
                  이용 후기 작성
                </h3>
                
                <form onSubmit={handleSubmitReview} className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-3.5 shadow-sm">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">닉네임</label>
                      <input
                        type="text"
                        required
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="닉네임 입력"
                        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/60 font-semibold"
                        maxLength={12}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">메뉴 선택</label>
                      <div className="relative">
                        <select
                          value={selectedMenuInput}
                          onChange={(e) => setSelectedMenuInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer font-semibold appearance-none"
                        >
                          <option value="식당 전체">식당 전체(선택 안함)</option>
                          {restaurant.menus?.map((m, idx) => (
                            <option key={idx} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between border-t border-b border-border/30 py-2.5 gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">메뉴 평점</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={`cursor-pointer transition-all duration-150 ${
                            star <= (hoverRating || ratingInput)
                              ? 'fill-yellow-500 text-yellow-500 scale-110'
                              : 'text-muted-foreground/30 hover:text-yellow-500/50'
                          }`}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setRatingInput(star)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Image Attachment Field */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">사진 첨부 (선택)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center justify-center w-12 h-12 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer bg-background shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={isCompressing || isUploading}
                        />
                        <Plus size={16} className="text-muted-foreground" />
                      </label>

                      {isCompressing && (
                        <span className="text-[10px] text-muted-foreground font-bold animate-pulse">
                          사진 최적화 중...
                        </span>
                      )}

                      {isUploading && (
                        <span className="text-[10px] text-primary font-bold animate-pulse">
                          사진 업로드 중...
                        </span>
                      )}

                      {reviewImageBase64 && (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border bg-muted">
                          <img
                            src={reviewImageBase64}
                            alt="첨부 이미지"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">한 줄 평</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder={
                          selectedMenuInput === '식당 전체'
                            ? '식당에 대한 한 줄 평을 남겨주세요 (최대 100자)'
                            : `[${selectedMenuInput}] 메뉴는 어떠셨나요? (최대 100자)`
                        }
                        className="w-full pl-3 pr-14 py-2.5 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/60 font-semibold"
                        maxLength={100}
                      />
                      <button
                        type="submit"
                        disabled={!nicknameInput.trim() || !commentInput.trim() || isCompressing || isUploading}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-primary text-white text-[10px] font-black rounded-lg hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground transition-all cursor-pointer shadow-sm"
                      >
                        {isUploading ? '업로드...' : '등록'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Review List Section */}
              <div className="mt-6 space-y-3 flex-grow flex flex-col min-w-0">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Star size={14} className="text-primary fill-primary/10" />
                    리뷰 목록 ({reviews.length}개)
                  </h3>
                  
                  {/* Filters */}
                  <div className="flex items-center gap-2 text-[10px]">
                    <select
                      value={sortByReviews}
                      onChange={(e) => setSortByReviews(e.target.value as 'latest' | 'highest' | 'lowest')}
                      className="bg-muted px-2 py-1 rounded-lg border border-border/40 focus:outline-none cursor-pointer font-bold"
                    >
                      <option value="latest">최신순</option>
                      <option value="highest">평점 높은순</option>
                      <option value="lowest">평점 낮은순</option>
                    </select>

                    <select
                      value={menuFilter}
                      onChange={(e) => setMenuFilter(e.target.value)}
                      className="bg-muted px-2 py-1 rounded-lg border border-border/40 focus:outline-none cursor-pointer max-w-[100px] sm:max-w-[120px] font-bold"
                    >
                      <option value="전체">전체 메뉴</option>
                      {restaurant.menus?.map((m, idx) => (
                        <option key={idx} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredAndSortedReviews.length > 0 ? (
                    filteredAndSortedReviews.map((rev) => (
                      <motion.div
                        key={rev.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-sm space-y-2 hover:border-border/80 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-foreground text-xs">{rev.nickname}</span>
                            <span className="text-[9px] text-muted-foreground font-semibold">
                              {new Date(rev.createdAt).toLocaleString('ko-KR', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 text-yellow-500 text-[10px] font-extrabold bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/10">
                            ★ {rev.rating}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center justify-between">
                          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">
                            {rev.menuName}
                          </span>
                        </div>
                        
                        {/* Attached Image Thumbnail */}
                        {rev.reviewImage && (
                          <motion.div
                            layoutId={`review-image-container-${rev.nickname}-${rev.id}`}
                            className="w-20 h-20 rounded-xl overflow-hidden border border-border/50 bg-muted cursor-zoom-in mt-1.5 relative shrink-0"
                            onClick={() => setSelectedImage({ name: `${rev.nickname}-${rev.id}`, imageUrl: rev.reviewImage!, index: -99 })}
                          >
                            <motion.img
                              layoutId={`review-image-img-${rev.nickname}-${rev.id}`}
                              src={rev.reviewImage}
                              alt="후기 사진"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </motion.div>
                        )}

                        <p className="text-foreground/90 text-xs font-semibold leading-relaxed break-all whitespace-pre-wrap mt-1">
                          {rev.comment}
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                      {menuFilter === '전체' 
                        ? '아직 작성된 리뷰가 없습니다.' 
                        : `[${menuFilter}] 메뉴에 대한 리뷰가 없습니다.`}
                    </div>
                  )}
                </div>
              </div>
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
              layoutId={
                selectedImage.index === -1 
                  ? `hero-image-container-${restaurant.name}` 
                  : selectedImage.index === -99
                    ? `review-image-container-${selectedImage.name}`
                    : `menu-image-container-${selectedImage.name}-${selectedImage.index}`
              }
              className="relative bg-card border border-border max-w-2xl w-full rounded-[32px] overflow-hidden shadow-2xl flex flex-col z-10"
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
                <motion.img
                  layoutId={
                    selectedImage.index === -1 
                      ? `hero-image-img-${restaurant.name}` 
                      : selectedImage.index === -99
                        ? `review-image-img-${selectedImage.name}`
                        : `menu-image-img-${selectedImage.name}-${selectedImage.index}`
                  }
                  src={selectedImage.imageUrl}
                  alt={selectedImage.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="p-6 flex flex-col gap-1.5 bg-card">
                <h4 className="text-sm font-black text-foreground">
                  {selectedImage.index === -99 ? '첨부 이미지 상세보기' : selectedImage.name}
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
