import requests
import re
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def inspect_threads(url):
    from playwright.sync_api import sync_playwright
    logger.info(f"Fetching {url} with Playwright...")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            )
            page = context.new_page()
            page.goto(url, wait_until="networkidle")
            
            # Wait a bit more for dynamic content
            page.wait_for_timeout(5000)
            
            html = page.content()
            with open('threads_raw.html', 'w', encoding='utf-8') as f:
                f.write(html)
            
            # Look for scripts
            scripts = page.query_selector_all('script')
            data_found = False
            for i, script in enumerate(scripts):
                content = script.inner_text() or ""
                if "RelayPrefetchedStreamCache" in content or "xdt_api__v1__text_post__app_info" in content:
                    logger.info(f"Found data script at index {i}")
                    data_found = True
                    try:
                        # Extract the first large JSON object
                        match = re.search(r'({.*})', content)
                        if match:
                            data = json.loads(match.group(1))
                            with open(f'threads_debug_{i}.json', 'w', encoding='utf-8') as f:
                                json.dump(data, f, indent=2, ensure_ascii=False)
                            
                            # Search for video
                            def find_videos(obj, path=""):
                                if isinstance(obj, dict):
                                    if 'video_versions' in obj:
                                        logger.info(f"Found video_versions at {path}")
                                    for k, v in obj.items():
                                        find_videos(v, f"{path}.{k}")
                                elif isinstance(obj, list):
                                    for i, v in enumerate(obj):
                                        find_videos(v, f"{path}[{i}]")
                            find_videos(data)
                    except:
                        pass
            
            if not data_found:
                logger.warning("No data scripts found")
                
            browser.close()
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    # Inspect the specific post mentioned by the user
    inspect_threads("https://www.threads.net/@ulsaninsta/post/DS95kUcAR1F")
