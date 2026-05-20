import urllib.request
import urllib.parse
import re
import ssl
import json

def search_place_id(query):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    encoded_query = urllib.parse.quote(query)
    url = f"https://search.naver.com/search.naver?query={encoded_query}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            # Look for place ID
            place_ids = re.findall(r'VisitorReviewStatsResult:([0-9]+)', html)
            if not place_ids:
                place_ids = re.findall(r'place-id(?:\\u002F|/)([0-9]+)', html)
            if not place_ids:
                place_ids = re.findall(r'https://pcmap.place.naver.com/restaurant/([0-9]+)', html)
            if not place_ids:
                place_ids = re.findall(r'\"id\":\"([0-9]+)\"', html)
                
            return place_ids[0] if place_ids else None
    except Exception as e:
        print(f"Error searching {query}: {e}")
        return None

def fetch_menu_details(place_id):
    if not place_id:
        return None
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    # Let's request the mobile place menu list page
    url = f"https://m.place.naver.com/restaurant/{place_id}/menu/list"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Referer": f"https://m.place.naver.com/restaurant/{place_id}/home",
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            
            # Let's save a snippet to analyze
            with open("scratch/menu_page.html", "w", encoding="utf-8") as f:
                f.write(html)
            
            # Let's check for window.__APOLLO_STATE__ or similar JSON script
            print("Successfully fetched HTML, page length:", len(html))
            
            # Find script tags containing JSON data
            for match in re.finditer(r'window\.__APOLLO_STATE__\s*=\s*(.*?);\s*</script>', html, re.DOTALL):
                json_str = match.group(1)
                print("Found APOLLO STATE! Length:", len(json_str))
                return "apollo", json_str
                
            for match in re.finditer(r'window\.__INITIAL_STATE__\s*=\s*(.*?);\s*</script>', html, re.DOTALL):
                json_str = match.group(1)
                print("Found INITIAL STATE! Length:", len(json_str))
                return "initial", json_str
                
            # If not found directly, let's see if we have JSON scripts
            json_scripts = re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL)
            print(f"Found {len(json_scripts)} application/json script tags.")
            for i, script in enumerate(json_scripts):
                if "menu" in script or "price" in script:
                    print(f"Script {i} contains 'menu' or 'price'. Length: {len(script)}")
                    return f"script_{i}", script
            
            # Let's try to extract menu items and prices by regex if no JSON script
            # e.g., menu name and price
            # We will inspect the html manually or write patterns
            
    except Exception as e:
        print(f"Error fetching menu for {place_id}: {e}")
    return None, None

def main():
    place_name = "가락정초밥"
    print(f"Searching place ID for '{place_name}'...")
    place_id = search_place_id(place_name + " 가락동")
    print(f"Found Place ID: {place_id}")
    if place_id:
        type_found, data_str = fetch_menu_details(place_id)
        if data_str:
            with open("scratch/extracted_data.json", "w", encoding="utf-8") as f:
                f.write(data_str)
            print(f"Saved extracted data type '{type_found}' to scratch/extracted_data.json")
        else:
            print("Could not find structured data block in HTML.")

if __name__ == "__main__":
    main()
