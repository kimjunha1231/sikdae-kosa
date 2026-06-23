import { useState, useEffect, useMemo } from 'react';
import { Restaurant } from './types';
import { getHaversineDistance } from '@/shared/lib/utils';

export function useRestaurantList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');

  // User location state (Fixed to 37.495055, 127.122270)
  const userLocation = useMemo(() => ({
    lat: 37.495055,
    lng: 127.122270,
  }), []);

  // Fetch restaurant list
  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      setRestaurants(data);
    } catch (e) {
      console.error('Failed to load restaurants', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Inject dynamic distance to each restaurant
  const restaurantsWithDistance = useMemo(() => {
    return restaurants.map((res) => {
      const distM = getHaversineDistance(userLocation.lat, userLocation.lng, res.lat, res.lng);
      const formattedDistance = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;

      return {
        ...res,
        distanceVal: distM,
        distance: formattedDistance,
      };
    });
  }, [restaurants, userLocation]);

  // Clean rating helper for numeric sorting
  const getNumericRating = (ratingStr?: string) => {
    if (!ratingStr || ratingStr === '-') return 0;
    const val = parseFloat(ratingStr);
    return isNaN(val) ? 0 : val;
  };

  // Memoized filtered & sorted list of restaurants
  const filteredAndSorted = useMemo(() => {
    return restaurantsWithDistance
      .filter((res) => {
        const matchesSearch =
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (res.menus &&
            res.menus.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesCategory = selectedCategory === '전체' || res.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return (a.distanceVal ?? 0) - (b.distanceVal ?? 0);
        }
        if (sortBy === 'rating') {
          return getNumericRating(b.rating) - getNumericRating(a.rating);
        }
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [restaurantsWithDistance, searchQuery, selectedCategory, sortBy]);

  return {
    restaurants: restaurantsWithDistance, // 전체 식당 리스트 (거리 정보 포함)
    filteredAndSorted,                  // 필터링 및 정렬이 끝난 리스트
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    userLocation,
    refresh: fetchRestaurants,
  };
}
