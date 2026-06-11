import urllib.request
import urllib.parse
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

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
            with open("test_page_garak.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Saved test_page_garak.html")
            
            title = re.search(r"<title>(.*?)</title>", html)
            if title:
                print("Title:", title.group(1))
            if "__APOLLO_STATE__" in html:
                print("Found __APOLLO_STATE__ in html!")
            else:
                print("__APOLLO_STATE__ NOT found in html!")
    except Exception as e:
        print(f"Error: {e}")

fetch_menu_details("21597534")
