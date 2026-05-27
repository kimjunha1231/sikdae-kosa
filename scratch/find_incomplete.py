import json
import os

CACHE_FILE = "/Users/junha/coding/sikdae-kosa/scratch/crawled_cache.json"

def main():
    if not os.path.exists(CACHE_FILE):
        print(f"Error: {CACHE_FILE} does not exist.")
        return

    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)

    print(f"Total cached items: {len(cache)}")
    print("=" * 60)

    # 1. place_id가 없거나 '0' 또는 null인 경우
    no_place_id = []
    # 2. place_id는 있는데 menus가 비어있는 경우 (단, place_id가 '0'이나 null이 아님)
    no_menus = []
    # 3. best_image가 없는 경우
    no_image = []

    for key, data in cache.items():
        place_id = data.get("place_id")
        best_image = data.get("best_image")
        menus = data.get("menus", [])

        # Parse key to get the restaurant name
        # Key format is usually 'Name_Lat_Lng'
        parts = key.rsplit("_", 2)
        name = parts[0] if parts else key

        is_incomplete = False
        reason = []

        if not place_id or place_id == "0":
            no_place_id.append((name, key, place_id, len(menus), best_image))
        elif not menus:
            no_menus.append((name, key, place_id, len(menus), best_image))
        elif not best_image:
            no_image.append((name, key, place_id, len(menus), best_image))

    print(f"1. No valid Place ID (place_id is null or '0'): {len(no_place_id)} items")
    for name, key, pid, menu_count, img in no_place_id[:30]:
        print(f"  - {name} (place_id: {pid}, menus: {menu_count}, img: {img})")
    if len(no_place_id) > 30:
        print(f"  ... and {len(no_place_id) - 30} more")

    print("\n" + "=" * 60)
    print(f"2. Has Place ID but NO menus: {len(no_menus)} items")
    for name, key, pid, menu_count, img in no_menus[:30]:
        print(f"  - {name} (place_id: {pid}, img: {img})")
    if len(no_menus) > 30:
        print(f"  ... and {len(no_menus) - 30} more")

    print("\n" + "=" * 60)
    print(f"3. Has Place ID & menus but NO best_image: {len(no_image)} items")
    for name, key, pid, menu_count, img in no_image[:30]:
        print(f"  - {name} (place_id: {pid}, menus: {menu_count})")
    if len(no_image) > 30:
        print(f"  ... and {len(no_image) - 30} more")

    print("\n" + "=" * 60)
    print(f"Total incomplete items (No Place ID or No Menus): {len(no_place_id) + len(no_menus)}")

if __name__ == "__main__":
    main()
