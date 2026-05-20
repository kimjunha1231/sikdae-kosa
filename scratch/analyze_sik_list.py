import json

def main():
    file_path = "/Users/junha/coding/sikdae-kosa/src/data/sik_list.json"
    with open(file_path, "r", encoding="utf-8") as f:
        restaurants = json.load(f)
        
    for idx, r in enumerate(restaurants):
        name = r["name"]
        lat = r["latitude"]
        lng = r["longitude"]
        
        area = "Other"
        if lat > 37.55 and lng < 127.02:
            area = "Daehakro / Hyehwa"
        elif lat > 37.55 and lng >= 127.02:
            area = "Cheongnyangni / Jegi-dong"
        elif lat < 37.51 and lng > 127.10:
            area = "Garak-dong / Munjeong"
            
        if area == "Other":
            print(f"Other restaurant: '{name}' at ({lat}, {lng})")

if __name__ == "__main__":
    main()
