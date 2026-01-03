import json
import re

def analyze():
    with open('instagram_debug.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    print(f"HTML Length: {len(html)}")
    print(f"Login present: {'Login' in html or 'Log In' in html}")
    print(f"Shortcode count: {html.count('shortcode')}")
    print(f"Display_url count: {html.count('display_url')}")
    
    # Extract some snippets of scripts
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    print(f"Number of scripts: {len(scripts)}")
    
    for i, script in enumerate(scripts):
        if "shortcode" in script:
            print(f"--- Script {i} (Length: {len(script)}) ---")
            print(script[:500] + "...")

if __name__ == "__main__":
    analyze()
