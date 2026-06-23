export interface Menu {
  name: string;
  price: number | string;
  imageUrl?: string | null;
}

export interface Restaurant {
  id?: string;
  name: string;
  category: string;
  distance: string;
  distanceVal?: number;
  rating?: string;
  operating_hours?: string;
  naver_link?: string;
  instagram_link?: string | null;
  image_url?: string | null;
  lat: number;
  lng: number;
  menus?: Menu[];
  reviewCount?: number;
}

export interface Review {
  id: string;
  nickname: string;
  menuName: string;   // 리뷰 대상 메뉴 이름 (예: "모듬 초밥")
  rating: number;     // 1 ~ 5 별점
  comment: string;    // 한 줄 평
  createdAt: number;  // 타임스탬프 (밀리초)
  reviewImage?: string; // 첨부 이미지 (Base64)
}

