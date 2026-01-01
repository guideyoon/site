
import requests
import json
import re
from bs4 import BeautifulSoup
from datetime import datetime

def fetch_threads_posts(username):
    url = f"https://www.threads.net/@{username}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for ALL scripts
        scripts = soup.find_all('script')
        
        print(f"Found {len(scripts)} total scripts.")
        
        for i, script in enumerate(scripts):
            content = script.string or ""
            if len(content) > 1000:
                print(f"Script {i} length: {len(content)}")
                preview = content[:100].replace('\n', ' ')
                print(f"Preview: {preview}")
                
            # Inspect for RelayPrefetchedStreamCache
            if "RelayPrefetchedStreamCache" in content:
                print(f"Script {i} matches RelayPrefetchedStreamCache")
                try:
                    data = json.loads(content)
                    
                    # Traverse the weird structure
                    # expected: data['require'][...]['__bbox']['require'][...][1]['__bbox']['result']['data']['mediaData']['edges']
                    
                    def find_thread_items(obj):
                        if isinstance(obj, dict):
                            if 'thread_items' in obj and isinstance(obj['thread_items'], list):
                                return obj['thread_items']
                            
                            for key, value in obj.items():
                                res = find_thread_items(value)
                                if res: return res
                                
                        elif isinstance(obj, list):
                            for item in obj:
                                res = find_thread_items(item)
                                if res: return res
                        return None

                    # Search directly for edges since thread_items is deeper
                    def find_edges(obj):
                         if isinstance(obj, dict):
                            if 'edges' in obj and isinstance(obj['edges'], list):
                                # Check if these edges look like post edges
                                if len(obj['edges']) > 0 and 'node' in obj['edges'][0]:
                                     return obj['edges']
                            
                            for key, value in obj.items():
                                res = find_edges(value)
                                if res: return res
                        
                         elif isinstance(obj, list):
                            for item in obj:
                                res = find_edges(item)
                                if res: return res
                         return None
                    
                    edges = find_edges(data)
                    if edges:
                        print(f"!!! FOUND {len(edges)} POSTS IN SCRIPT {i} !!!")
                        for edge in edges:
                            node = edge.get('node', {})
                            thread_items = node.get('thread_items', [])
                            if thread_items:
                                post = thread_items[0].get('post', {})
                                caption = post.get('caption', {})
                                text = caption.get('text', '') if caption else ''
                                user = post.get('user', {}).get('username', '')
                                print(f"Post by {user}: {text[:50]}...")
                        
                        # Save the clean extracted data
                        with open(f"threads_extracted_zuck.json", "w", encoding="utf-8") as f:
                            json.dump(edges, f, indent=2, ensure_ascii=False)
                        return # Stop after finding the feed

                except Exception as e:
                    print(f"Error parsing JSON in script {i}: {e}")
            elif "caption" in content:
                 print(f"Found 'caption' in script {i}")

        # Fallback: Look for open graph tags
        og_description = soup.find("meta", property="og:description")
        if og_description:
            print(f"OG Description: {og_description.get('content')}")

    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    fetch_threads_posts("zuck")
