import requests
from bs4 import BeautifulSoup
import re

urls = [
    "https://www.donggu.ulsan.kr/cop/bbs/selectBoardArticle.do?bbsId=BBSMSTR_000000000323&nttId=208069",
    "https://www.ulsannamgu.go.kr/cop/bbs/selectBoardArticle.do?bbsId=namguNews&nttId=507325"
]

for url in urls:
    print(f"\n{'='*50}")
    print(f"URL: {url}")
    print(f"{'='*50}")
    
    response = requests.get(url, verify=False)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Try common content containers
    containers = [
        '.view-content', '.detailCon', '.data_table', '.contents_inner', 
        '.bbs_detail', '.board_view', '.v_content', '#content'
    ]
    
    for selector in containers:
        elem = soup.select_one(selector)
        if elem:
            print(f"\n[FOUND] Selector: {selector}")
            print(f"Text preview: {elem.get_text(strip=True)[:200]}...")
    
    # Check for attachments
    print("\n[LINKS] Checking for attachments:")
    for link in soup.select('a'):
        href = link.get('href', '')
        onclick = link.get('onclick', '')
        text = link.get_text(strip=True)
        if any(keyword in str(href).lower() or keyword in str(onclick).lower() for keyword in ['file', 'down', 'blob']):
            print(f"- Text: {text}, Href: {href}, Onclick: {onclick}")

    # Look for table with th '내용'
    content_th = soup.find('th', string=re.compile('내용'))
    if content_th:
        print(f"\n[FOUND] Table '내용' th found.")
        td = content_th.find_next_sibling('td')
        if td:
            print(f"TD content preview: {td.get_text(strip=True)[:200]}...")
