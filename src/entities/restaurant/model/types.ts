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
  image_url?: string | null;
  lat: number;
  lng: number;
  menus?: Menu[];
}
