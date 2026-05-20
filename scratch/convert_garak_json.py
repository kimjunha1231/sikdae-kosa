import json
import math
import re
import urllib.parse
import urllib.request
import time

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000 # Earth radius in meters
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist = R * c
    if dist < 1000:
        return f"{round(dist)}m"
    else:
        return f"{(dist / 1000):.1f}km"

def get_distance_meters(lat1, lon1, lat2, lon2):
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371000 * c

def normalize(name):
    s = name.lower()
    s = s.replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
    s = s.replace("픗양", "풍양")
    s = re.sub(r'(가락점|가락본점|가락중앙점|송파가락점|문정점|문정역점|송파점|본점|가락시장역점|시장역점|로데오점|지점|가락|문정)$', '', s)
    return s

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
    elif cat in ['카페', '베이커리', '패스트푸드', '치킨']:
        return '카페/베이커리/패스트푸드'
    return '한식'

def search_kakao_place(keyword, apiKey):
    # Try searching locally first (within 3km of IT Venture Tower)
    params = {
        "query": keyword,
        "x": "127.121946",
        "y": "37.492323",
        "radius": "3000"
    }
    url = "https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"KakaoAK {apiKey}")
    req.add_header("KA", "sdk/1.0 os/javascript lang/ko-KR origin/http://localhost:3000")
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            docs = data.get("documents", [])
            if docs:
                return docs
    except Exception:
        pass
        
    # Global search (fallback without radius limit)
    params_global = {"query": keyword}
    url_global = "https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode(params_global)
    req_global = urllib.request.Request(url_global)
    req_global.add_header("Authorization", f"KakaoAK {apiKey}")
    req_global.add_header("KA", "sdk/1.0 os/javascript lang/ko-KR origin/http://localhost:3000")
    try:
        with urllib.request.urlopen(req_global) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get("documents", [])
    except Exception:
        pass
    return []

def search_kakao_address(address, apiKey):
    params = {"query": address}
    url = "https://dapi.kakao.com/v2/local/search/address.json?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"KakaoAK {apiKey}")
    req.add_header("KA", "sdk/1.0 os/javascript lang/ko-KR origin/http://localhost:3000")
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            docs = data.get("documents", [])
            if docs:
                return docs[0]
    except Exception:
        pass
    return None

def main():
    apiKey = "7a99373ebcca8bea6d12ed7d0971a1b0"
    center_lat = 37.492323
    center_lng = 127.121946
    
    name_corrections = {
        "양귀푸마라탕 가락점": {"type": "keyword", "query": "양궈푸마라탕 가락점"},
        "최박사돈까스냉면 가락직영점": {"type": "keyword", "query": "최박사돈까스냉면"},
        "픗양이부대앤김치찌개 가락본점": {"type": "coord", "lat": 37.4934309, "lng": 127.1204692},
        "조선닭꼬치 가락점": {"type": "address", "query": "서울특별시 송파구 송파대로30길 27-1"},
        "맛있는 샤브돈까스": {"type": "address", "query": "서울특별시 송파구 송파대로30길 16"},
        "폭샵": {"type": "address", "query": "서울특별시 송파구 송파대로22길 12"},
        "오부찌 문정직영점": {"type": "keyword", "query": "오부찌 문정"},
        "한솥도시락 가락성원점": {"type": "address", "query": "서울특별시 송파구 송파대로28길 27"},
        "연안식당 가락시장점": {"type": "address", "query": "서울특별시 송파구 송파대로30길 25"},
        "하남돼지집 가락직영점": {"type": "address", "query": "서울특별시 송파구 송파대로30길 22"},
        "BBQ치킨 가락스타점": {"type": "address", "query": "서울특별시 송파구 송파대로28길 12"},
        "가락동 불타는곱창": {"type": "address", "query": "서울특별시 송파구 송파대로30길 37"},
        "스시마이우 가락직영점": {"type": "address", "query": "서울특별시 송파구 송파대로30길 41"},
        "VIPS 올림픽점": {"type": "keyword", "query": "빕스 올림픽공원점"},
        "새마을식당 가락점": {"type": "address", "query": "서울특별시 송파구 송파대로32길 4"},
        "오목집 가락점": {"type": "address", "query": "서울특별시 송파구 송파대로30길 11"},
        "마포갈매기 가락점": {"type": "address", "query": "서울특별시 송파구 송파대로30길 13"},
        "상무초밥 가락점": {"type": "address", "query": "서울특별시 송파구 중대로 105"}
    }
    
    # Load backup to match rating/operating hours
    try:
        with open('/Users/junha/.gemini/antigravity-ide/brain/57276025-d808-4fab-ae47-91fad4fa6734/data_backup.json', 'r', encoding='utf-8') as f:
            backup = json.load(f)
        backup_map = {normalize(x['name']): x for x in backup}
    except Exception as e:
        print(f"Error loading backup: {e}")
        backup_map = {}

    # Load new Garak 84 JSON
    with open('src/data/garak_84_stores_with_menu_images.json', 'r', encoding='utf-8') as f:
        new_data = json.load(f)
        
    converted = []
    matched_count = 0
    precise_coords_count = 0
    fallback_coords_count = 0
    
    print("Converting and querying Kakao Local API with corrected query search & fallback addresses...")
    for idx, x in enumerate(new_data):
        name = x['name']
        orig_lat = x['lat']
        orig_lng = x['lng']
        category = map_category(x['category'])
        
        lat, lng = None, None
        
        # Check if we have a hardcoded name correction or address lookup
        correction = name_corrections.get(name)
        if correction:
            if correction["type"] == "coord":
                lat = correction["lat"]
                lng = correction["lng"]
                precise_coords_count += 1
                print(f"[{idx+1}/{len(new_data)}] hardcoded precise coordinates used for '{name}': ({lat}, {lng})")
            elif correction["type"] == "address":
                addr_res = search_kakao_address(correction["query"], apiKey)
                if addr_res:
                    lat = float(addr_res['y'])
                    lng = float(addr_res['x'])
                    precise_coords_count += 1
                    print(f"[{idx+1}/{len(new_data)}] precise coordinates found via address search for '{name}': ({lat}, {lng})")
            elif correction["type"] == "keyword":
                docs = search_kakao_place(correction["query"], apiKey)
                if docs:
                    lat = float(docs[0]['y'])
                    lng = float(docs[0]['x'])
                    precise_coords_count += 1
                    print(f"[{idx+1}/{len(new_data)}] precise coordinates found via keyword correction for '{name}': ({lat}, {lng})")
        
        # Fallback to standard Kakao keyword search
        if lat is None or lng is None:
            docs = search_kakao_place(name, apiKey)
            if not docs:
                simplified = re.sub(r'\s*(가락점|가락본점|가락중앙점|송파가락점|문정점|문정역점|송파점|본점|가락시장역점|시장역점|로데오점|지점|가락|문정)$', '', name)
                if simplified != name:
                    docs = search_kakao_place(simplified, apiKey)
            
            if docs:
                best_match = docs[0]
                lat_candidate = float(best_match['y'])
                lng_candidate = float(best_match['x'])
                
                search_dist = get_distance_meters(center_lat, center_lng, lat_candidate, lng_candidate)
                if search_dist > 3000:
                    print(f"[{idx+1}/{len(new_data)}] WARNING: Kakao search result for '{name}' is too far ({search_dist/1000:.1f}km: {lat_candidate}, {lng_candidate}). Using original coordinates.")
                    lat = orig_lat
                    lng = orig_lng
                    fallback_coords_count += 1
                else:
                    lat = lat_candidate
                    lng = lng_candidate
                    precise_coords_count += 1
                    print(f"[{idx+1}/{len(new_data)}] precise coordinates found for '{name}': ({lat}, {lng})")
            else:
                lat = orig_lat
                lng = orig_lng
                fallback_coords_count += 1
                print(f"[{idx+1}/{len(new_data)}] WARNING: Kakao search failed for '{name}'. Using original: ({lat}, {lng})")
            
        # Calculate distance relative to IT Venture Tower
        distance = calculate_distance(center_lat, center_lng, lat, lng)
        
        # Match backup for rating / operating hours
        norm_name = normalize(name)
        backup_item = backup_map.get(norm_name)
        
        rating = "-"
        operating_hours = "-"
        if backup_item:
            rating = backup_item.get('rating', '-')
            operating_hours = backup_item.get('operating_hours', '-')
            matched_count += 1
            
        # Get image_url from the first menu item
        image_url = None
        menus = []
        if 'menus' in x and len(x['menus']) > 0:
            image_url = x['menus'][0].get('imageUrl')
            for m in x['menus']:
                menus.append({
                    "name": m.get('item', ''),
                    "price": m.get('price', 0),
                    "imageUrl": m.get('imageUrl')
                })
                
        converted.append({
            "id": f"garak-{idx}",
            "name": name,
            "category": category,
            "distance": distance,
            "rating": rating,
            "operating_hours": operating_hours,
            "naver_link": x.get('naverMapMenuUrl') or f"https://search.naver.com/search.naver?query={urllib.parse.quote(name)}",
            "place_id": None,
            "image_url": image_url,
            "lat": lat,
            "lng": lng,
            "menus": menus
        })
        
        # Throttling to respect rate limits
        time.sleep(0.04)
        
    # Write to restaurants.json
    with open('src/data/restaurants.json', 'w', encoding='utf-8') as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)
        
    print("\n--- Search Completion Summary ---")
    print(f"Total converted: {len(converted)}")
    print(f"Matched with backup for details: {matched_count}")
    print(f"Precise coordinates updated: {precise_coords_count}")
    print(f"Fallback to original coordinates: {fallback_coords_count}")

if __name__ == '__main__':
    main()
