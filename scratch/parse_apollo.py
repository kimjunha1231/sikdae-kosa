import json

def main():
    with open("scratch/extracted_data.json", "r", encoding="utf-8") as f:
        content = f.read().strip()
    
    print("Content length:", len(content))
    
    # Try parsing directly
    try:
        data = json.loads(content)
        print("Success loading direct JSON!")
    except json.JSONDecodeError as e:
        print(f"JSONDecodeError: {e}")
        pos = e.pos
        print("Context around error:")
        start_pos = max(0, pos - 100)
        end_pos = min(len(content), pos + 100)
        print(f"[{start_pos}:{end_pos}]")
        print(content[start_pos:end_pos])
        
        # Let's see if we can slice it to make it valid JSON
        # If there's extra data, it means it's valid JSON up to pos.
        # Let's try parsing content[:pos]
        try:
            data = json.loads(content[:pos])
            print("Successfully parsed sliced JSON up to position:", pos)
            
            # Let's look for menu items in this parsed data
            found_items = []
            for k, v in data.items():
                if isinstance(v, dict):
                    if "name" in v and ("price" in v or "priceType" in v):
                        found_items.append((k, v))
                        
            print(f"\nFound {len(found_items)} dicts containing 'name' and ('price' or 'priceType'). Samples:")
            for k, v in found_items[:15]:
                name = v.get("name")
                price = v.get("price")
                images = v.get("images") or v.get("image") or v.get("imageUrl")
                print(f"  Key: {k}")
                print(f"    Name: {name}")
                print(f"    Price: {price}")
                print(f"    Images/Image: {images}")
                
        except Exception as ex:
            print("Failed to parse slice:", ex)

if __name__ == "__main__":
    main()
