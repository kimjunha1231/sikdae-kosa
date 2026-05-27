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

def get_clean_query(name, lat, lng):
    # 1. Clean parentheses to extract branch information (e.g. 아비꼬(가락시장역점) -> 아비꼬 가락시장역점)
    clean_name = re.sub(r'\((.*?)\)', r' \1', name)
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    # 2. Get area suffix based on lat/lng
    area = get_area_suffix(lat, lng).strip()
    
    # 3. If area name is already in the clean name, don't append it again
    if area:
        keyword = area
        if "동" in area:
            keyword = area.replace("동", "")
        if keyword in clean_name:
            return clean_name
        else:
            return f"{clean_name} {area}"
    return clean_name


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

def estimate_gimgane_price(menu_name):
    # Gimgane default price map
    GIMGANE_PRICE_MAP = {
        "김가네김밥": 4500,
        "참치김밥": 5000,
        "치즈김밥": 5000,
        "멸추김밥": 5300,
        "돈까스김밥": 5300,
        "소고기김밥": 5500,
        "라볶이": 7000,
        "쌀떡볶이": 6000,
        "쫄면": 7500,
        "라면": 4500,
        "돈까스": 9500,
        "치즈돈까스": 10500,
        "오믈렛": 8500,
        "김치볶음밥": 8000,
        "제육덮밥": 8500,
        "낙지덮밥": 9000,
        "육개장": 9000,
        "순두부찌개": 8000,
        "부대찌개": 8500,
        "찐만두": 5500,
        "갈비만두": 6000,
        "어린이돈까스": 7500,
        "물쫄면": 7500,
        "뚝배기불고기": 9000,
        "꼬마김밥": 3500,
        "더블치즈김밥": 5300,
        "통새우롤": 6000,
        "돈까스롤": 6000,
        "소고기주먹밥": 4000,
        "철판치즈불닭쫄면": 9000,
        "떡만두국": 8000,
        "냉소바": 8000,
        "잔치국수": 6500,
        "김치말이국수": 7500,
        "초계국수": 8500,
        "물냉면": 7500,
    }
    
    # Exact match check
    for k, v in GIMGANE_PRICE_MAP.items():
        if k in menu_name or menu_name in k:
            return v
            
    # Keyword match check
    if "김밥" in menu_name:
        return 5000
    elif "라면" in menu_name:
        return 4500
    elif "우동" in menu_name:
        return 6500
    elif "돈까스" in menu_name or "돈카츠" in menu_name:
        return 9500
    elif "볶음밥" in menu_name or "덮밥" in menu_name or "비빔밥" in menu_name:
        return 8000
    elif "찌개" in menu_name or "국밥" in menu_name:
        return 8500
    elif "만두" in menu_name:
        return 5500
    elif "떡볶이" in menu_name or "라볶이" in menu_name:
        return 6000
    elif "면" in menu_name or "국수" in menu_name or "소바" in menu_name:
        return 7500
    return 7000  # Default fallback price

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
                    # Find all keys starting with "Menu:" or containing menu items, including Baemin menus
                    menu_keys = sorted([k for k in data.keys() if k.startswith("Menu:") or k.startswith("PlaceDetail_BaeminMenu:")])
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
                                        # Split by range delimiters (e.g. 13,000~14,900 or 13,000 / 14,900)
                                        for delimiter in ['~', '/', '-']:
                                            if delimiter in price:
                                                price = price.split(delimiter)[0]
                                                break
                                        price_clean = re.sub(r'[^0-9]', '', price)
                                        price_val = int(price_clean) if price_clean else 0
                                    else:
                                        price_val = int(price)
                                except Exception:
                                    price_val = 0
                            
                            # Gimgane price correction
                            if place_id == "21597534" and price_val == 0:
                                price_val = estimate_gimgane_price(name)
                            
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
        
        # If cache exists but place_id is empty/0 or has abnormally high prices (>= 1,000,000) or has no menus, bypass cache
        is_invalid_cache = False
        if scraped_data:
            pid = scraped_data.get("place_id")
            if not pid or pid == "0":
                is_invalid_cache = True
            else:
                # Check for abnormally high price (like merged range values) or empty menus
                cached_menus = scraped_data.get("menus", [])
                if not cached_menus:
                    is_invalid_cache = True
                else:
                    for m in cached_menus:
                        price = m.get("price")
                        if price and isinstance(price, (int, float)) and price >= 1000000:
                            is_invalid_cache = True
                            break
        
        if scraped_data and not is_invalid_cache:
            print(f"[{idx+1}/{len(restaurants)}] Cache HIT: '{name}'")
            place_id = scraped_data.get("place_id")
            best_image = scraped_data.get("best_image")
            menus = scraped_data.get("menus", [])
            
            # Gimgane price correction in cache hit
            if place_id == "21597534":
                updated = False
                for m in menus:
                    if m.get("price") == 0:
                        m["price"] = estimate_gimgane_price(m.get("name"))
                        updated = True
                if updated:
                    print("  Correcting Gimgane prices in cache...")
                    cache[cache_key]["menus"] = menus
                    save_cache(cache)
        else:
            if is_invalid_cache:
                print(f"[{idx+1}/{len(restaurants)}] Cache exists but is invalid (no place_id). Re-scraping '{name}'...")
            
            # Query area suffix to ensure high accuracy with clean query
            query = get_clean_query(name, lat, lng)
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
                clean_name_only = re.sub(r'\((.*?)\)', r' \1', name)
                clean_name_only = re.sub(r'\s+', ' ', clean_name_only).strip()
                print(f"  WARNING: Place ID not found for query '{query}'. Searching name only with clean name '{clean_name_only}'...")
                place_id, search_image = search_naver_place(clean_name_only)
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
