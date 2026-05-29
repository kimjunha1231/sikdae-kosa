import json
import os

def main():
    with open("scratch/extracted_data.json", "r", encoding="utf-8") as f:
        content = f.read().strip()
    
    print("Content length:", len(content))
    
    try:
        # Slicing like before
        pos = content.find("window.__PLACE_STATE__")
        if pos != -1:
            # strip trailing semicolon/whitespace before placing in loads
            json_str = content[:pos].strip()
            if json_str.endswith(";"):
                json_str = json_str[:-1].strip()
            data = json.loads(json_str)
            print("Successfully parsed sliced JSON up to PLACE_STATE!")
        else:
            data = json.loads(content)
            print("Successfully parsed full JSON!")
            
        matching_keys = []
        for k in data.keys():
            if k.startswith("Menu:") or "menu" in k.lower():
                matching_keys.append(k)
        
        print(f"Found {len(matching_keys)} keys starting with Menu or containing menu:")
        for k in matching_keys[:30]:
            print(f"  Key: {k}")
            print(f"    Value: {repr(data[k])[:200]}")
            
    except Exception as ex:
        print("Failed to parse:", ex)

if __name__ == "__main__":
    main()
