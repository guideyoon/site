import sys
import os
import requests
import feedparser
import re
from typing import List, Dict, Any

def extract_blog_id(url: str) -> str:
    if 'rss.blog.naver.com' in url:
        return url.split('/')[-1].replace('.xml', '')
    
    clean_url = url.replace('https://', '').replace('http://', '').replace('m.blog.naver.com', 'blog.naver.com')
    
    if 'blogId=' in clean_url:
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        return params.get('blogId', [None])[0]
    else:
        parts = clean_url.split('blog.naver.com/')
        if len(parts) > 1:
            return parts[1].split('/')[0].split('?')[0]
    return None

def test_blog_id(url):
    print(f"URL: {url}")
    blog_id = extract_blog_id(url)
    print(f"Extracted Blog ID: {blog_id}")
    
    if not blog_id:
        print("Failed to extract Blog ID")
        return
        
    rss_url = f"https://rss.blog.naver.com/{blog_id}.xml"
    print(f"RSS URL: {rss_url}")
    
    try:
        response = requests.get(rss_url, timeout=10)
        print(f"RSS Response Code: {response.status_code}")
        
        if response.status_code == 200:
            feed = feedparser.parse(response.text)
            print(f"Feed entries count: {len(feed.entries)}")
            for i, entry in enumerate(feed.entries[:3]):
                print(f"[{i+1}] {entry.title}")
                print(f"    Link: {entry.link}")
                print(f"    Published: {entry.get('published', 'N/A')}")
        else:
            print(f"RSS Feed not accessible: {response.text[:200]}")
    except Exception as e:
        print(f"Error fetching RSS: {e}")

if __name__ == "__main__":
    target_url = "https://blog.naver.com/ulsanin_"
    test_blog_id(target_url)
    
    # Test with trailing slash
    test_blog_id(target_url + "/")
