from playwright.sync_api import sync_playwright
import logging
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_embed(post_code):
    url = f"https://www.threads.net/embed/{post_code}"
    logger.info(f"Checking embed URL: {url}")
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle")
            
            content = page.content()
            
            # Check for video tag
            if "<video" in content:
                logger.info("FOUND VIDEO TAG IN EMBED!")
                video_src = page.locator("video").get_attribute("src")
                logger.info(f"Video Src: {video_src}")
            else:
                logger.info("No video tag found in embed.")
                
            # Check for JSON data in scripts
            scripts = page.query_selector_all('script')
            for s in scripts:
                text = s.inner_text()
                if "video_versions" in text or ".mp4" in text:
                    logger.info("Found potential video data in script!")
                    # simplistic extraction
                    matches = re.findall(r'https://[^"]+\.mp4[^"]*', text)
                    for m in matches:
                        logger.info(f"Found MP4 URL: {m}")
            
            browser.close()
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    check_embed("DS95kUcAR1F")
