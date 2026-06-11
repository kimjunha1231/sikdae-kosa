import json
import os
import sys

# Append current directory to import from fetch_menus_images
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fetch_menus_images import estimate_gimgane_price, fetch_menu_details

CACHE_FILE = "/Users/junha/coding/sikdae-kosa/scratch/crawled_cache.json"
RESTAURANTS_FILE = "/Users/junha/coding/sikdae-kosa/src/data/restaurants.json"
PLACE_ID = "21597534"
CACHE_KEY = "김가네(가락본동점)_37.49561_127.1215"

def main():
    print("Surgically updating Kimgane (Garak Bondong branch)...")
    
    # 1. Fetch menu details
    print(f"Fetching menu details from Naver Place ID {PLACE_ID}...")
    menus = fetch_menu_details(PLACE_ID)
    if not menus:
        print("Error: Failed to fetch menu details.")
        return
        
    print(f"Successfully fetched {len(menus)} menu items.")
    
    # 2. Correct prices and find best image
    best_image = None
    for m in menus:
        if m.get("price") == 0:
            m["price"] = estimate_gimgane_price(m.get("name"))
        if not best_image and m.get("imageUrl"):
            best_image = m["imageUrl"]
            
    print(f"Best Image: {best_image}")
    
    # 3. Update crawled_cache.json
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)
    else:
        cache = {}
        
    cache[CACHE_KEY] = {
        "place_id": PLACE_ID,
        "best_image": best_image,
        "menus": menus
    }
    
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print("Updated crawled_cache.json successfully.")
    
    # 4. Update restaurants.json
    if os.path.exists(RESTAURANTS_FILE):
        with open(RESTAURANTS_FILE, "r", encoding="utf-8") as f:
            restaurants = json.load(f)
            
        found = False
        for r in restaurants:
            if r.get("name") == "김가네(가락본동점)":
                r["place_id"] = PLACE_ID
                r["image_url"] = best_image
                r["menus"] = menus
                r["naver_link"] = f"https://pcmap.place.naver.com/restaurant/{PLACE_ID}/home"
                found = True
                break
                
        if found:
            with open(RESTAURANTS_FILE, "w", encoding="utf-8") as f:
                json.dump(restaurants, f, ensure_ascii=False, indent=2)
            print("Updated restaurants.json successfully.")
        else:
            print("Error: '김가네(가락본동점)' not found in restaurants.json")
    else:
        print(f"Error: {RESTAURANTS_FILE} does not exist.")

if __name__ == "__main__":
    main()
