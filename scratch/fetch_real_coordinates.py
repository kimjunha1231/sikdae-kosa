import json
import urllib.parse
import urllib.request
import time
import re

def search_kakao_place(keyword, apiKey):
    # Set up URL with center around IT Venture Tower (37.492323, 127.121946) and 2km radius
    params = {
        "query": keyword,
        "x": "127.121946",
        "y": "37.492323",
        "radius": "2000"
    }
    url = "https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"KakaoAK {apiKey}")
    req.add_header("KA", "sdk/1.0 os/javascript lang/ko-KR origin/http://localhost:3000")
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
            return data.get("documents", [])
    except Exception as e:
        print(f"Error searching for '{keyword}': {e}")
        return []

def main():
    apiKey = "7a99373ebcca8bea6d12ed7d0971a1b0"
    file_path = "/Users/junha/coding/sikdae-kosa/src/data/restaurants.json"
    
    with open(file_path, "r", encoding="utf-8") as f:
        restaurants = json.load(f)
        
    print(f"Loaded {len(restaurants)} restaurants. Starting Kakao Local API lookup...")
    
    updated_count = 0
    fallback_count = 0
    
    for idx, res in enumerate(restaurants):
        name = res["name"]
        
        # 1. Try search with exact name
        docs = search_kakao_place(name, apiKey)
        
        # 2. If nothing found, try stripping branch name (e.g. '가락점', '가락본점', '가락중앙점', '송파가락점')
        if not docs:
            simplified_name = re.sub(r'\s*(가락점|가락본점|가락중앙점|송파가락점|문정점|문정역점|송파점|본점|가락시장역점|시장역점|로데오점|송파가락점)$', '', name)
            # Remove any trailing "점" if it is preceded by a word
            simplified_name = re.sub(r'\s+\S+점$', '', simplified_name)
            
            if simplified_name != name:
                print(f"[{idx+1}/{len(restaurants)}] Exact name '{name}' not found. Trying simplified: '{simplified_name}'")
                docs = search_kakao_place(simplified_name, apiKey)
            else:
                # Try just splitting the first word if it has spaces
                parts = name.split()
                if len(parts) > 1:
                    print(f"[{idx+1}/{len(restaurants)}] Exact name '{name}' not found. Trying first token: '{parts[0]}'")
                    docs = search_kakao_place(parts[0], apiKey)
        
        if docs:
            # Pick the first matching document (usually the closest/most relevant)
            best_match = docs[0]
            lat = float(best_match["y"])
            lng = float(best_match["x"])
            
            # If distance is provided in document, we can also use it
            kakao_distance = best_match.get("distance")
            
            # Print update
            print(f"[{idx+1}/{len(restaurants)}] SUCCESS: Found '{name}' -> Kakao Name: '{best_match['place_name']}' ({lat}, {lng}) - Dist: {kakao_distance}m")
            
            res["lat"] = lat
            res["lng"] = lng
            # Update distance if Kakao returns it and it makes sense
            if kakao_distance:
                res["distance"] = f"{kakao_distance}m"
            updated_count += 1
        else:
            print(f"[{idx+1}/{len(restaurants)}] WARNING: No place found for '{name}'. Keeping fallback coordinates.")
            fallback_count += 1
            
        # Throttling to prevent rate limiting
        time.sleep(0.05)
        
    # Save back to file
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(restaurants, f, ensure_ascii=False, indent=2)
        
    print("\n--- Search Completion Summary ---")
    print(f"Total: {len(restaurants)}")
    print(f"Successfully matched & updated real coordinates: {updated_count}")
    print(f"Kept fallback coordinates (not found): {fallback_count}")

if __name__ == "__main__":
    main()
