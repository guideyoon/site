
import requests
from bs4 import BeautifulSoup
import re

url = "https://www.ulsan.go.kr/u/rep/bbs/list.ulsan?bbsId=BBS_0000000000000003&mId=001004001001000000"
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

try:
    response = requests.get(url, headers=headers, verify=False) # Skip SSL verify if needed
    soup = BeautifulSoup(response.text, 'html.parser')
    
    print(f"Status Code: {response.status_code}")
    
    # Try common row selectors
    rows = soup.select('tr')
    print(f"Found {len(rows)} 'tr' rows")
    
    if len(rows) > 0:
        # Print items in the first valid row (skip header if possible)
        for i, row in enumerate(rows[:5]):
            print(f"\n--- Row {i} ---")
            print(row.prettify()[:500]) # Print first 500 chars of row
            
    # Try to find a list item if not tr
    items = soup.select('.list-item, .board-list li')
    print(f"\nFound {len(items)} other list items")

    # Fetch a detail page
    detail_url = "https://www.ulsan.go.kr/u/rep/bbs/view.do?mId=001004001001000000&bbsId=BBS_0000000000000003&dataId=177740"
    print(f"\nFetching detail: {detail_url}")
    detail_res = requests.get(detail_url, headers=headers, verify=False)
    detail_soup = BeautifulSoup(detail_res.text, 'html.parser')
    
    # Simulate GenericBoardConnector logic
    print("\n--- Simulating GenericBoardConnector Logic ---\n")
    content_elem = None
    content_th = detail_soup.find('th', string=re.compile('내용'))
    if content_th:
        print("Found '내용' th")
        content_elem = content_th.find_next_sibling('td')
    
    if not content_elem:
        print("Fallback to generic containers")
        content_elem = detail_soup.select_one('.view-content, .detailCon, .data_table, .contents_inner')
    
    if content_elem:
        print("Content Element Found!")
        raw_text = content_elem.get_text(separator='\n', strip=True)
        print(f"Extracted Text (first 500 chars):\n{raw_text[:500]}")
        
        imgs = content_elem.select('img')
        print(f"Images: {len(imgs)}")
        
        # Attachments
        print("\nChecking Attachments...")
        attachment_candidates = detail_soup.select('.tbl_bd_view a, .contents_inner a')
        attachments = []
        for link in attachment_candidates:
            href = link.get('href', '')
            onclick = link.get('onclick', '')
            text = link.get_text(strip=True)
            
            is_file = False
            if any(ext in text.lower() for ext in ['.pdf', '.hwp', '.doc', '.xls', '.zip', '.png', '.jpg']):
                is_file = True
            elif 'fileDown' in onclick or 'fileDown' in href:
                is_file = True
            
            if is_file:
                file_url = href
                if not file_url or file_url.startswith('#') or 'javascript' in file_url:
                    file_url = onclick
                
                if not any(a['url'] == file_url for a in attachments):
                    attachments.append({'url': file_url, 'name': text})
                    print(f"Found Attachment: {text} -> {file_url[:50]}...")
    else:
        print("Failed to find content element with new logic.")

except Exception as e:
    print(f"Error: {e}")
