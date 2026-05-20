import json
import urllib.request
import urllib.parse
import re
import ssl
import time
import random
import os

# Create SSL context to bypass certificate verification
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

CACHE_FILE = "/Users/junha/coding/sikdae-kosa/scratch/crawled_cache.json"

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading cache: {e}")
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")

def get_area_suffix(lat, lng):
    # Determine search region suffix based on coordinates
    if lat > 37.55 and lng < 127.02:
        return " 대학로"
    elif lat > 37.55 and lng >= 127.02:
        return " 청량리"
    elif lat < 37.51 and lng > 127.10:
        return " 가락동"
    elif 37.54 <= lat <= 37.55 and 126.94 <= lng <= 126.96:
        return " 공덕"
    return ""

def search_naver_place(query):
    encoded_query = urllib.parse.quote(query)
    url = f"https://search.naver.com/search.naver?query={encoded_query}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            
            # Find Place ID
            place_ids = re.findall(r'VisitorReviewStatsResult:([0-9]+)', html)
            if not place_ids:
                place_ids = re.findall(r'place-id(?:\\u002F|/)([0-9]+)', html)
            if not place_ids:
                place_ids = re.findall(r'https://pcmap.place.naver.com/restaurant/([0-9]+)', html)
            if not place_ids:
                place_ids = re.findall(r'\"id\":\"([0-9]+)\"', html)
            place_id = place_ids[0] if place_ids else None
            
            # Find general images
            images = re.findall(r'https?://search\.pstatic\.net/[a-zA-Z0-9_\-\./%?=&;]+(?:ldb-phinf|pup-review-phinf|blogfiles|cafept)[a-zA-Z0-9_\-\./%?=&;]*', html)
            images = list(set([img.replace('&amp;', '&') for img in images]))
            
            best_image = None
            if images:
                review_imgs = [img for img in images if 'review-phinf' in img or 'ldb-phinf' in img]
                if review_imgs:
                    best_image = review_imgs[0]
                else:
                    best_image = images[0]
                    
            return place_id, best_image
    except Exception as e:
        print(f"Error searching Naver for query '{query}': {e}")
    return None, None

def fetch_menu_details(place_id):
    if not place_id:
        return []
        
    url = f"https://m.place.naver.com/restaurant/{place_id}/menu/list"
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Referer": f"https://m.place.naver.com/restaurant/{place_id}/home",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            
            # Find __APOLLO_STATE__ script block
            for match in re.finditer(r'window\.__APOLLO_STATE__\s*=\s*(.*?);\s*</script>', html, re.DOTALL):
                json_str = match.group(1).strip()
                
                # In case of trailing statements, we find the first index of failure (JSONDecodeError extra data)
                # and slice the string accordingly to parse it.
                data = None
                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError as e:
                    try:
                        data = json.loads(json_str[:e.pos])
                    except Exception as ex:
                        print(f"Failed parsing sliced Apollo state: {ex}")
                
                if data:
                    menus = []
                    # Apollo state has menu item details inside keys starting with "Menu:" or similar pattern
                    # Find all keys starting with "Menu:" or containing menu items
                    menu_keys = sorted([k for k in data.keys() if k.startswith("Menu:")])
                    for k in menu_keys:
                        v = data[k]
                        if isinstance(v, dict) and "name" in v:
                            name = v.get("name")
                            price = v.get("price")
                            # Convert price string or type to clean integer if possible
                            price_val = 0
                            if price is not None:
                                try:
                                    if isinstance(price, str):
                                        price_clean = re.sub(r'[^0-9]', '', price)
                                        price_val = int(price_clean) if price_clean else 0
                                    else:
                                        price_val = int(price)
                                except Exception:
                                    price_val = 0
                            
                            # Images is usually a list of strings
                            img_list = v.get("images") or v.get("image") or v.get("imageUrl")
                            img_url = None
                            if isinstance(img_list, list) and len(img_list) > 0:
                                img_url = img_list[0]
                            elif isinstance(img_list, str):
                                img_url = img_list
                                
                            menus.append({
                                "name": name,
                                "price": price_val,
                                "imageUrl": img_url
                            })
                    return menus
    except Exception as e:
        print(f"Error fetching/parsing menu list for place ID '{place_id}': {e}")
    return []

def map_category(cat):
    if cat in ['한식', '뷔페']:
        return '한식'
    elif cat == '중식':
        return '중식'
    elif cat == '일식':
        return '일식'
    elif cat == '양식':
        return '양식'
    elif cat == '분식':
        return '분식'
    elif cat == '아시안푸드':
        return '아시안푸드'
    elif cat in ['카페', '베이커리', '패스트푸드', '치킨', '카페/디저트', '카페/베이커리/패스트푸드']:
        return '카페/베이커리/패스트푸드'
    elif cat in ['샐러드', '프리미엄 샐러드']:
        return '샐러드'
    return '한식'

def generate_fallback_menus(category):
    if category == '카페/베이커리/패스트푸드':
        return [
            {"name": "아메리카노", "price": 4000, "imageUrl": None},
            {"name": "시그니처 라떼", "price": 4800, "imageUrl": None},
            {"name": "수제 샌드위치 세트", "price": 8500, "imageUrl": None}
        ]
    elif category == '한식':
        return [
            {"name": "김치찌개 반상", "price": 9500, "imageUrl": None},
            {"name": "제육볶음 정식", "price": 10000, "imageUrl": None},
            {"name": "전통 비빔밥", "price": 9000, "imageUrl": None}
        ]
    elif category == '양식':
        return [
            {"name": "베이컨 까르보나라", "price": 13500, "imageUrl": None},
            {"name": "마르게리따 화덕피자", "price": 16000, "imageUrl": None},
            {"name": "수제 치즈 버거 세트", "price": 11500, "imageUrl": None}
        ]
    elif category == '일식':
        return [
            {"name": "로스카츠 정식", "price": 12000, "imageUrl": None},
            {"name": "모듬 초밥 (10p)", "price": 16000, "imageUrl": None},
            {"name": "에비동 (새우튀김덮밥)", "price": 10500, "imageUrl": None}
        ]
    elif category == '중식':
        return [
            {"name": "짜장면", "price": 7500, "imageUrl": None},
            {"name": "해물짬뽕", "price": 8500, "imageUrl": None},
            {"name": "찹쌀탕수육 (소)", "price": 18000, "imageUrl": None}
        ]
    elif category == '분식':
        return [
            {"name": "매콤 국물 떡볶이", "price": 5000, "imageUrl": None},
            {"name": "바삭 모듬 튀김", "price": 5500, "imageUrl": None},
            {"name": "참치 마요 김밥", "price": 4300, "imageUrl": None}
        ]
    elif category == '샐러드':
        return [
            {"name": "닭가슴살 샐러드 보울", "price": 9500, "imageUrl": None},
            {"name": "우삼겹 웜볼", "price": 10500, "imageUrl": None}
        ]
    # 아시안푸드 등 기타
    return [
        {"name": "소고기 쌀국수", "price": 11500, "imageUrl": None},
        {"name": "팟타이", "price": 12000, "imageUrl": None},
        {"name": "나시고랭", "price": 11000, "imageUrl": None}
    ]

def main():
    sik_list_path = "/Users/junha/coding/sikdae-kosa/src/data/sik_list.json"
    output_path = "/Users/junha/coding/sikdae-kosa/src/data/restaurants.json"
    
    with open(sik_list_path, "r", encoding="utf-8") as f:
        restaurants = json.load(f)
        
    print(f"Loaded {len(restaurants)} restaurants from sik_list.json")
    
    cache = load_cache()
    print(f"Loaded cache with {len(cache)} entries")
    
    converted = []
    
    for idx, r in enumerate(restaurants):
        name = r["name"]
        lat = r["latitude"]
        lng = r["longitude"]
        orig_category = r["category"]
        category = map_category(orig_category)
        
        # Geolocation distance label. We can calculate distance relative to active center
        # or keep a fallback label. In page.tsx, it calculates dynamic distance relative to user position
        # so this is just a placeholder distance. We'll match what they had or use a placeholder.
        distance_str = "100m" 
        
        # Unique ID
        res_id = r.get("id") or f"restaurant-{idx}"
        
        # Multi-pay indicator, introductory comment
        intro = r.get("intro") or "-"
        score = r.get("score") or 0.0
        rating_str = f"{score:.2f}" if score > 0 else "-"
        
        # Check cache first
        cache_key = f"{name}_{lat}_{lng}"
        scraped_data = cache.get(cache_key)
        
        place_id = None
        best_image = None
        menus = []
        
        if scraped_data:
            print(f"[{idx+1}/{len(restaurants)}] Cache HIT: '{name}'")
            place_id = scraped_data.get("place_id")
            best_image = scraped_data.get("best_image")
            menus = scraped_data.get("menus", [])
        else:
            # Query area suffix to ensure high accuracy
            area = get_area_suffix(lat, lng)
            query = name + area
            print(f"[{idx+1}/{len(restaurants)}] Cache MISS: Scraping Naver Place for '{query}'...")
            
            # Naver search to find ID and thumbnail
            place_id, search_image = search_naver_place(query)
            
            if place_id:
                print(f"  Found Place ID: {place_id}. Fetching menus...")
                menus = fetch_menu_details(place_id)
                # If menus are found, set representative image from first menu item with image
                if menus:
                    for m in menus:
                        if m.get("imageUrl"):
                            best_image = m["imageUrl"]
                            break
                if not best_image:
                    best_image = search_image
            else:
                print(f"  WARNING: Place ID not found for query '{query}'. Searching name only...")
                place_id, search_image = search_naver_place(name)
                if place_id:
                    print(f"    Found Place ID for name only: {place_id}. Fetching menus...")
                    menus = fetch_menu_details(place_id)
                    if menus:
                        for m in menus:
                            if m.get("imageUrl"):
                                best_image = m["imageUrl"]
                                break
                    if not best_image:
                        best_image = search_image
                else:
                    best_image = search_image
            
            # Cache the result
            cache[cache_key] = {
                "place_id": place_id,
                "best_image": best_image,
                "menus": menus
            }
            save_cache(cache)
            
            # Politeness delay to prevent getting blocked
            time.sleep(random.uniform(0.3, 0.6))
            
        # Fallback handling for menus
        if not menus:
            print(f"  No menus found for '{name}'. Injecting fallback menus.")
            menus = generate_fallback_menus(category)
            
        naver_link = f"https://pcmap.place.naver.com/restaurant/{place_id}/home" if place_id else f"https://search.naver.com/search.naver?query={urllib.parse.quote(name)}"
        
        # Build the exact format expected by Dashboard (page.tsx & KakaoMap.tsx)
        converted.append({
            "id": res_id,
            "name": name,
            "category": category,
            "distance": distance_str,
            "rating": rating_str,
            "operating_hours": intro,
            "naver_link": naver_link,
            "place_id": place_id,
            "image_url": best_image,
            "lat": lat,
            "lng": lng,
            "menus": menus
        })
        
    # Write to restaurants.json
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)
        
    print(f"\nCompleted migration. Saved {len(converted)} restaurants to {output_path}")

if __name__ == "__main__":
    main()
