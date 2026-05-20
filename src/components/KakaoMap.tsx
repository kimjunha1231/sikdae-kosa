'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { MapPin, Key, AlertCircle, Navigation } from 'lucide-react';
import Roulette from './Roulette';

interface Restaurant {
  name: string;
  category: string;
  distance: string;
  rating?: string;
  operating_hours?: string;
  naver_link?: string;
  image_url?: string | null;
  lat: number;
  lng: number;
  menus?: { name: string; price: number | string }[];
}

interface KakaoMapProps {
  restaurants: Restaurant[];
  hoveredRestaurant: Restaurant | null;
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  userLocation: { lat: number; lng: number } | null;
  onViewDetails?: (restaurant: Restaurant) => void;
  roulettePool: string[];
  onWinnerSelected?: (restaurant: Restaurant) => void;
}

export default function KakaoMap({
  restaurants,
  hoveredRestaurant,
  selectedRestaurant,
  onSelectRestaurant,
  userLocation,
  onViewDetails,
  roulettePool,
  onWinnerSelected,
}: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const customOverlayRef = useRef<any>(null);

  const [apiKey, setApiKey] = useState<string>('');
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [loadError, setLoadError] = useState(false);

  // 1. Resolve API Key (from env or localStorage)
  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
    const localKey = localStorage.getItem('kakao_map_app_key');
    const activeKey = envKey || localKey || '';
    
    // Clean key of quotes if any
    const cleanedKey = activeKey.replace(/['"]/g, '').trim();
    setApiKey(cleanedKey);
  }, []);

  // 2. Dynamic Kakao Script Loading (React Strict Mode resilient)
  useEffect(() => {
    if (!apiKey) return;

    const scriptId = 'kakao-map-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initMapInstance = () => {
      const kakao = (window as any).kakao;
      if (!kakao || !kakao.maps) {
        console.error("Kakao Maps script loaded, but window.kakao.maps is missing.");
        setLoadError(true);
        return;
      }
      kakao.maps.load(() => {
        setIsSdkLoaded(true);
        setLoadError(false);
      });
    };

    if (script) {
      if ((window as any).kakao && (window as any).kakao.maps) {
        initMapInstance();
      } else {
        const handleLoad = () => initMapInstance();
        const handleError = () => {
          console.error("Kakao Maps script failed to load on existing script tag.");
          setLoadError(true);
        };
        
        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);
        
        return () => {
          script.removeEventListener('load', handleLoad);
          script.removeEventListener('error', handleError);
        };
      }
      return;
    }

    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      initMapInstance();
    };

    script.onerror = () => {
      console.error("Kakao Maps script failed to load.");
      setLoadError(true);
    };

    document.head.appendChild(script);
  }, [apiKey]);

  // 3. Initialize and Update Map Markers & User Position
  useEffect(() => {
    if (!isSdkLoaded || !mapContainerRef.current) return;

    const kakao = (window as any).kakao;
    const centerLatLng = new kakao.maps.LatLng(37.495055, 127.122270); // Garak-dong default center

    if (!mapRef.current) {
      // Create map
      const options = {
        center: userLocation 
          ? new kakao.maps.LatLng(userLocation.lat, userLocation.lng)
          : centerLatLng,
        level: 3,
      };
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, options);
    }



    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Render Markers for current restaurants list
    restaurants.forEach((res) => {
      const position = new kakao.maps.LatLng(res.lat, res.lng);

      // Create Custom HTML Marker mimicking Toss style
      const categoryColors: Record<string, string> = {
        '한식': 'bg-amber-500',
        '중식': 'bg-red-500',
        '일식': 'bg-teal-500',
        '양식': 'bg-pink-500',
        '분식': 'bg-orange-500',
        '샐러드': 'bg-green-500',
        '카페/베이커리/패스트푸드': 'bg-purple-500',
        '아시안푸드': 'bg-sky-500',
      };
      const catColor = categoryColors[res.category] || 'bg-blue-500';

      const content = document.createElement('div');
      content.className = 'cursor-pointer group relative w-8 h-8 flex items-center justify-center transition-transform duration-200 active:scale-95';
      content.innerHTML = `
        <!-- Floating Restaurant Name Label -->
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card/95 backdrop-blur-md border border-border/80 px-2 py-0.5 rounded-lg shadow-md text-[9px] font-extrabold text-foreground whitespace-nowrap transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary select-none">
          ${res.name}
        </div>
        <!-- Dot -->
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-card border-2 border-white shadow-md hover:shadow-xl hover:scale-110 transition-all duration-200">
          <div class="w-2.5 h-2.5 rounded-full ${catColor}"></div>
        </div>
      `;

      const customMarker = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        map: mapRef.current,
        xAnchor: 0.5,
        yAnchor: 0.5,
      });

      content.addEventListener('click', () => {
        onSelectRestaurant(res);
        showCustomOverlay(res);
      });

      markersRef.current.push(customMarker);
    });
  }, [isSdkLoaded, restaurants, userLocation]);

  // 4. Hover effect - Pan to and open temp overlay
  useEffect(() => {
    if (!isSdkLoaded || !mapRef.current || !hoveredRestaurant) return;
    const kakao = (window as any).kakao;
    const pos = new kakao.maps.LatLng(hoveredRestaurant.lat, hoveredRestaurant.lng);
    mapRef.current.panTo(pos);
  }, [isSdkLoaded, hoveredRestaurant]);

  // 5. Selection effect - Focus and show overlay
  useEffect(() => {
    if (!isSdkLoaded || !mapRef.current || !selectedRestaurant) return;
    const kakao = (window as any).kakao;
    const pos = new kakao.maps.LatLng(selectedRestaurant.lat, selectedRestaurant.lng);
    mapRef.current.panTo(pos);
    showCustomOverlay(selectedRestaurant);
  }, [isSdkLoaded, selectedRestaurant]);

  // Show Toss-style floating overlay card above map marker
  const showCustomOverlay = (res: Restaurant) => {
    if (!mapRef.current) return;
    const kakao = (window as any).kakao;

    if (customOverlayRef.current) {
      customOverlayRef.current.setMap(null);
    }

    const pos = new kakao.maps.LatLng(res.lat, res.lng);

    const overlayEl = document.createElement('div');
    overlayEl.className = 'bg-card text-foreground rounded-2xl p-3 shadow-xl border border-border flex flex-col gap-1.5 w-48 -translate-y-16 relative z-30 pointer-events-auto';
    overlayEl.innerHTML = `
      <div class="flex items-start justify-between">
        <h4 class="text-xs font-bold truncate max-w-[130px]">${res.name}</h4>
        <span class="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-medium">${res.category}</span>
      </div>
      <div class="text-[10px] text-muted-foreground flex items-center gap-1">
        <span class="text-primary font-bold">${res.distance}</span>
        <span>|</span>
        <span class="truncate">${res.operating_hours || '시간 정보 없음'}</span>
      </div>
      <div class="flex justify-between items-center mt-1 border-t border-border/50 pt-1.5">
        <span class="text-[10px] text-yellow-500 font-bold">${res.rating && res.rating !== '-' ? '★ ' + res.rating : '평가 없음'}</span>
        <button id="view-details-btn" class="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0">상세보기 &rarr;</button>
      </div>
      <div class="absolute bottom-[-6px] left-[50%] -translate-x-[50%] w-3 h-3 bg-card border-r border-b border-border rotate-45"></div>
    `;

    const btn = overlayEl.querySelector('#view-details-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onViewDetails) {
          onViewDetails(res);
        }
      });
    }

    customOverlayRef.current = new kakao.maps.CustomOverlay({
      position: pos,
      content: overlayEl,
      xAnchor: 0.5,
      yAnchor: 0.5,
      clickable: true
    });

    customOverlayRef.current.setMap(mapRef.current);
  };

  // Handle manual API key submit
  const handleSaveKey = () => {
    if (!inputKey.trim()) return;
    localStorage.setItem('kakao_map_app_key', inputKey.trim());
    window.location.reload();
  };

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#14151b] p-6 text-center text-foreground rounded-3xl border border-border/50 min-h-[400px]">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6">
          <Key size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">카카오 지도 API 키가 필요합니다</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
          카카오 디벨로퍼스에서 발급받은 <strong>JavaScript 앱 키</strong>를 등록하시면 실시간 지도가 활성화됩니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
          <Input
            type="text"
            placeholder="JavaScript 앱 키 입력"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="flex-grow bg-background/50 border-border rounded-xl text-center"
          />
          <Button onClick={handleSaveKey} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl toss-btn-active">
            등록 및 적용
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          도메인에 <code>http://localhost:3000</code>이 플랫폼에 반드시 등록되어 있어야 작동합니다.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#14151b] p-6 text-center text-foreground rounded-3xl border border-border/50 min-h-[400px]">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">지도 로드 실패</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
          카카오 지도 스크립트를 불러오지 못했습니다. 카카오 디벨로퍼스 등록 키가 맞는지, 혹은 플랫폼 Web 도메인에 <code>http://localhost:3000</code>이 들어가 있는지 확인해 주세요.
        </p>
        <Button 
          variant="outline"
          onClick={() => {
            localStorage.removeItem('kakao_map_app_key');
            window.location.reload();
          }}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
        >
          API 키 재설정
        </Button>
      </div>
    );
  }

  return (
    <Card className="relative w-full h-full min-h-[450px] bg-background border border-border overflow-hidden rounded-3xl shadow-lg">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      {/* Floating Roulette Overlay */}
      {isSdkLoaded && (
        <div className="absolute top-4 right-4 z-10 w-80 max-w-[calc(100vw-2rem)]">
          <Roulette 
            filteredRestaurants={restaurants} 
            customPool={roulettePool}
            onWinnerSelected={(winner) => {
              onSelectRestaurant(winner);
              if (onWinnerSelected) onWinnerSelected(winner);
            }} 
          />
        </div>
      )}
    </Card>
  );
}
