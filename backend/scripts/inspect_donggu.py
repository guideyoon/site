import requests
from bs4 import BeautifulSoup

url = "https://www.donggu.ulsan.kr/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000323"
response = requests.get(url, verify=False)
soup = BeautifulSoup(response.text, 'html.parser')

rows = soup.select('tbody tr')
print(f"Found {len(rows)} rows")

if rows:
    first_row = rows[0]
    print("First row HTML snippet:")
    print(first_row.prettify()[:1000])
    
    # Test a few selectors
    print("\nTesting selectors on first row:")
    print(f"a: {[a.get_text(strip=True) for a in first_row.select('a')]}")
    print(f"td.ta_l a: {[a.get_text(strip=True) for a in first_row.select('td.ta_l a')]}")
    print(f"td.subject a: {[a.get_text(strip=True) for a in first_row.select('td.subject a')]}")
    print(f"td: {[td.get_text(strip=True) for td in first_row.select('td')]}")
