import urllib.request
import urllib.parse
import json
import re
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

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
            return place_id
    except Exception as e:
        print(f"Error searching: {e}")
    return None

def fetch_menu_details(place_id):
    url = f"https://m.place.naver.com/restaurant/{place_id}/menu/list"
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Referer": f"https://m.place.naver.com/restaurant/{place_id}/home",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            for match in re.finditer(r'window\.__APOLLO_STATE__\s*=\s*(.*?);\s*</script>', html, re.DOTALL):
                json_str = match.group(1).strip()
                data = None
                try:
                    data = json.loads(json_str)
                except json.JSONDecodeError as e:
                    try:
                        data = json.loads(json_str[:e.pos])
                    except Exception as ex:
                        pass
                
                if data:
                    menus = []
                    menu_keys = sorted([k for k in data.keys() if k.startswith("Menu:") or k.startswith("PlaceDetail_BaeminMenu:")])
                    for k in menu_keys:
                        v = data[k]
                        if isinstance(v, dict) and "name" in v:
                            name = v.get("name")
                            price = v.get("price")
                            price_val = 0
                            if price:
                                try:
                                    price_clean = re.sub(r'[^0-9]', '', str(price))
                                    price_val = int(price_clean) if price_clean else 0
                                except Exception:
                                    price_val = 0
                            
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
        print(f"Error fetching: {e}")
    return []

test_queries = [
    "김가네 대학로점",
    "김가네 공덕역점",
    "김가네 청량리역점",
    "김가네 서초점",
    "김가네 여의도점",
    "김가네 대치점",
    "김가네 압구정점"
]

for q in test_queries:
    print(f"Searching for '{q}'...")
    pid = search_naver_place(q)
    if pid:
        print(f"  Found Place ID: {pid}. Fetching menus...")
        menus = fetch_menu_details(pid)
        print(f"  Fetched {len(menus)} menus.")
        if menus:
            non_zero_prices = [m for m in menus if m["price"] > 0]
            print(f"  Menus with non-zero prices: {len(non_zero_prices)}")
            if non_zero_prices:
                print("  Sample menus with prices:")
                for m in non_zero_prices[:5]:
                    print(f"    - {m['name']}: {m['price']} ({m['imageUrl'] is not None})")
                # Break if we found a branch with prices
                break
    time.sleep(1)
