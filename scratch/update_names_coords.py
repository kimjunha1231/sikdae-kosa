import json
import urllib.parse
import urllib.request
import time
import sys

def search_kakao_place(keyword, apiKey):
    params = {
        "query": keyword
    }
    url = "https://dapi.kakao.com/v2/local/search/keyword.json?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"KakaoAK {apiKey}")
    req.add_header("KA", "sdk/1.0 os/javascript lang/ko-KR origin/http://localhost:3000")
    
    try:
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data.get("documents", [])
    except Exception as e:
        print(f"Error searching for '{keyword}': {e}")
        return []

def main():
    apiKey = "7a99373ebcca8bea6d12ed7d0971a1b0"
    file_path = "/Users/junha/coding/sikdae-kosa/src/data/restaurants.json"
    
    # 1. Back up current file
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            restaurants = json.load(f)
        with open(file_path + ".bak2", "w", encoding="utf-8") as f:
            json.dump(restaurants, f, ensure_ascii=False, indent=2)
        print("Backup created successfully.")
    except Exception as e:
        print(f"Failed to create backup: {e}")
        sys.exit(1)
        
    # 2. Define index-based mappings to restore original names and operating hours
    updates = {
        0: {"name": "맘스터치 종로대학로점", "operating_hours": "10시~오더마감 21:30", "query": "맘스터치 종로대학로점", "fallback": "맘스터치 대학로점"},
        1: {"name": "돈천동식당", "operating_hours": "-", "query": "돈천동식당", "fallback": "돈천동식당 대학로점"},
        2: {"name": "헤비스테이크(대학로점)", "operating_hours": "-", "query": "헤비스테이크 대학로점", "fallback": "헤비스테이크 대학로"},
        3: {"name": "CGV대학로", "operating_hours": "-", "query": "CGV대학로", "fallback": "CGV 대학로"},
        4: {"name": "킨토토(혜화점)", "operating_hours": "-", "query": "킨토토 혜화점", "fallback": "킨토토 혜화"},
        5: {"name": "노모어피자(대학로점)", "operating_hours": "24시간 운영", "query": "노모어피자 대학로점", "fallback": "노모어피자 대학로"},
        6: {"name": "부부식당", "operating_hours": "11:00~20:00", "query": "부부식당 대학로", "fallback": "부부식당"},
        7: {"name": "삼삼뚝배기", "operating_hours": "6:00~21:00", "query": "삼삼뚝배기", "fallback": "삼삼뚝배기 혜화"},
        8: {"name": "광나루찌개", "operating_hours": "09:00~21:00", "query": "광나루찌개", "fallback": "광나루찌개 혜화"},
        9: {"name": "본죽 성균관대점", "operating_hours": "본죽 성균관대점", "query": "본죽 성균관대점", "fallback": "본죽 성대"},
        10: {"name": "함흥면옥(혜화)", "operating_hours": "한식전문점", "query": "함흥면옥 혜화점", "fallback": "함흥면옥 혜화"},
        11: {"name": "모스버거(대학로점)", "operating_hours": "-", "query": "모스버거 대학로점", "fallback": "모스버거 대학로"},
        12: {"name": "본가통영식당", "operating_hours": "9시30분~21시20분", "query": "본가통영식당", "fallback": "본가통영식당 가락"},
        13: {"name": "마이클커피", "operating_hours": "9:30~19:00", "query": "마이클커피", "fallback": "마이클커피 청량리"},
        14: {"name": "크리스피크림도넛 롯데청량리점", "operating_hours": "10:30 ~ 20:00", "query": "크리스피크림도넛 롯데청량리점", "fallback": "크리스피크림 롯데청량리"},
        15: {"name": "육도락 청량리역점", "operating_hours": "10:00~20:30 / 브레이크타임 15:00~17:00", "query": "육도락 청량리역점", "fallback": "육도락 청량리"},
        16: {"name": "롯데리아 제기역", "operating_hours": "09:00 ~ 22:00", "query": "롯데리아 제기역점", "fallback": "롯데리아 제기역"},
        17: {"name": "부부김밥", "operating_hours": "9:00~20:00", "query": "부부김밥", "fallback": "부부김밥 혜화"},
        18: {"name": "포브라더스 가락점", "operating_hours": "베트남음식 전문점", "query": "포브라더스 가락점", "fallback": "포브라더스 가락"},
        19: {"name": "파리바게뜨 가락중앙", "operating_hours": "-", "query": "파리바게뜨 가락중앙점", "fallback": "파리바게뜨 가락중앙"},
        22: {"name": "야키니쿠히오리", "operating_hours": "운영시간 11시 ~ 23시", "query": "야키니쿠히오리", "fallback": "야키니쿠히오리 가락"},
        23: {"name": "오부찌 문정 직영점", "operating_hours": "오부찌 5호 문정 직영점", "query": "오부찌 문정직영점", "fallback": "오부찌 문정"},
        24: {"name": "킨토토(혜화점)", "operating_hours": "-", "query": "킨토토 혜화점", "fallback": "킨토토 혜화"},
        25: {"name": "노모어피자(대학로점)", "operating_hours": "24시간 운영", "query": "노모어피자 대학로점", "fallback": "노모어피자 대학로"},
        26: {"name": "본죽 대학로본점", "operating_hours": "본죽 대학로본점", "query": "본죽 대학로본점", "fallback": "본죽 대학로점"},
        27: {"name": "맛밥", "operating_hours": "-", "query": "맛밥", "fallback": "맛밥 혜화"},
        28: {"name": "롯데리아 혜화", "operating_hours": "09:00 ~ 22:00", "query": "롯데리아 혜화점", "fallback": "롯데리아 혜화"},
        29: {"name": "올라포케 공덕점", "operating_hours": "운영시간 10:30 ~ 20:00", "query": "올라포케 공덕점", "fallback": "올라포케 공덕"}
    }
    
    print("Applying updates and fetching real coordinates...")
    for idx, info in updates.items():
        res = restaurants[idx]
        old_name = res["name"]
        new_name = info["name"]
        
        # Update fields
        res["name"] = new_name
        res["operating_hours"] = info["operating_hours"]
        
        # Fetch from Kakao Local API
        docs = search_kakao_place(info["query"], apiKey)
        if not docs and "fallback" in info:
            print(f"Query '{info['query']}' failed. Trying fallback '{info['fallback']}'...")
            docs = search_kakao_place(info["fallback"], apiKey)
            
        if docs:
            best_match = docs[0]
            lat = float(best_match["y"])
            lng = float(best_match["x"])
            res["lat"] = lat
            res["lng"] = lng
            # Update naver_link optionally if place_name is found
            print(f"[{idx}] {old_name} -> {new_name} SUCCESS: Found '{best_match['place_name']}' ({lat}, {lng})")
        else:
            print(f"[{idx}] {old_name} -> {new_name} WARNING: Kakao search failed. Keeping coordinates ({res.get('lat')}, {res.get('lng')})")
            
        time.sleep(0.05)
        
    # Save updated data
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(restaurants, f, ensure_ascii=False, indent=2)
    print("\nRestaurants coordinate update successfully completed.")

if __name__ == "__main__":
    main()
