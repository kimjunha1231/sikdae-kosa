import re
import json

def main():
    try:
        with open("scratch/menu_page.html", "r", encoding="utf-8") as f:
            html = f.read()
    except Exception as e:
        print("Error reading menu_page.html:", e)
        return

    print("HTML length:", len(html))

    # Find all <script> tags
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    print("Found scripts count:", len(scripts))

    # Also find application/json scripts
    json_scripts = re.findall(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html, re.DOTALL)
    print("Found application/json scripts count:", len(json_scripts))

    # Recursive function to look for menu list structure
    # Usually menus look like a list of dicts with keys: name, price
    def find_menu_structure(d, path=""):
        if isinstance(d, dict):
            # Check if this dict represents a menu item
            if "name" in d and ("price" in d or "priceType" in d):
                # Ensure it's a real menu, not translation
                name_val = d.get("name")
                if isinstance(name_val, str) and len(name_val) > 1 and len(name_val) < 50:
                    # Let's print this match
                    print(f"  [Match at {path}] Name: {name_val}, Price: {d.get('price')}")
            for k, v in d.items():
                find_menu_structure(v, f"{path}.{k}")
        elif isinstance(d, list):
            for i, item in enumerate(d):
                find_menu_structure(item, f"{path}[{i}]")

    # Inspect application/json scripts
    for idx, script in enumerate(json_scripts):
        script = script.strip()
        if not script:
            continue
        try:
            parsed_data = json.loads(script)
            print(f"\n--- Parsed application/json script {idx} (length {len(script)}) ---")
            if isinstance(parsed_data, dict):
                print("Root keys:", list(parsed_data.keys()))
                find_menu_structure(parsed_data, f"json_script_{idx}")
        except Exception as e:
            print(f"Failed parsing json script {idx}: {e}")

    for idx, script in enumerate(scripts):
        script = script.strip()
        if not script:
            continue
            
        # Search for window.XXX = { ... }
        matches = re.finditer(r'(window\.[a-zA-Z0-9_]+)\s*=\s*(.*?);', script, re.DOTALL)
        for m in matches:
            var_name = m.group(1)
            val_str = m.group(2).strip()
            
            parsed_data = None
            try:
                parsed_data = json.loads(val_str)
            except json.JSONDecodeError as e:
                try:
                    parsed_data = json.loads(val_str[:e.pos])
                except Exception as ex:
                    pass
            
            if parsed_data:
                print(f"\nFound variable: {var_name} (JSON length: {len(val_str)})")
                if isinstance(parsed_data, dict):
                    print("Keys:", list(parsed_data.keys())[:10])
                    find_menu_structure(parsed_data, var_name)
                else:
                    print("Type:", type(parsed_data))

if __name__ == "__main__":
    main()
