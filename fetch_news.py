import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

queries = ['지정학 물류', '스마트 항만', '항만 크레인 미국']

for q in queries:
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote(q)}&hl=ko&gl=KR&ceid=KR:ko"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read()
        root = ET.fromstring(html)
        print(f"\n--- {q} ---")
        for item in root.findall('.//item')[:3]:
            title = item.find('title').text
            link = item.find('link').text
            print(f"{title} | {link}")
    except Exception as e:
        print(f"Error fetching {q}: {e}")
