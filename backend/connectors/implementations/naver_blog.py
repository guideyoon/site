import feedparser
import logging
import requests
import re
import json
from datetime import datetime
from typing import List, Dict, Any
from connectors.base import ConnectorBase
from dateutil import parser as date_parser
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class NaverBlogConnector(ConnectorBase):
    """
    Connector for Naver Blog using RSS feeds for listing and mobile site for images and full text.
    """
    
    def fetch_list(self) -> List[Dict[str, Any]]:
        """Fetch latest posts from Naver Blog RSS and then get full detail for images and text"""
        blog_url = self.base_url
        blog_id = self._extract_blog_id(blog_url)
        
        if not blog_id:
            logger.error(f"Could not extract Naver Blog ID from URL: {blog_url}")
            return []
            
        rss_url = f"https://rss.blog.naver.com/{blog_id}.xml"
        logger.info(f"Fetching Naver Blog RSS: {rss_url}")
        
        try:
            response = requests.get(rss_url, timeout=10)
            response.raise_for_status()
            
            feed = feedparser.parse(response.text)
            
            items = []
            for entry in feed.entries:
                # Basic info from RSS
                pub_date = None
                if 'published' in entry:
                    try:
                        pub_date = date_parser.parse(entry.published)
                    except:
                        pass
                
                # Snippet from RSS as fallback
                rss_snippet = entry.get('description', '')
                
                item = {
                    'title': entry.title,
                    'url': entry.link,
                    'published_at': pub_date,
                    'raw_text': rss_snippet,
                    'image_urls': [], 
                    'source_item_id': self._extract_log_no(entry.link)
                }
                
                # Attempt to get full detail
                try:
                    detail = self.fetch_detail(entry.link)
                    if detail['raw_text'] and len(detail['raw_text']) > len(rss_snippet):
                        item['raw_text'] = detail['raw_text']
                        logger.info(f"Updated raw_text for '{item['title']}' (len: {len(item['raw_text'])})")
                    
                    if detail['image_urls']:
                        item['image_urls'] = detail['image_urls']
                        logger.info(f"Updated image_urls for '{item['title']}' (count: {len(item['image_urls'])})")
                    else:
                        # If no images found in detail, keep thumbnails from RSS if any
                        # (But we prefer high-res from detail)
                        pass
                except Exception as detail_err:
                    logger.error(f"Error fetching detail for {entry.link}: {detail_err}")
                
                items.append(item)
                
            return items
            
        except Exception as e:
            logger.error(f"Error fetching Naver Blog RSS: {e}")
            return []

    def fetch_detail(self, url: str) -> Dict[str, Any]:
        """
        Fetch full blog post content and extract all images using mobile bypass.
        """
        logger.info(f"Fetching Naver Blog detail: {url}")
        
        # Bypass using mobile URL
        mobile_url = url
        if 'm.blog.naver.com' not in url:
            match = re.search(r'blog\.naver\.com/([^/?]+)/(\d+)', url)
            if match:
                blog_id = match.group(1)
                log_no = match.group(2)
                mobile_url = f"https://m.blog.naver.com/{blog_id}/{log_no}"
            else:
                import urllib.parse
                parsed = urllib.parse.urlparse(url)
                params = urllib.parse.parse_qs(parsed.query)
                blog_id = params.get('blogId', [None])[0]
                log_no = params.get('logNo', [None])[0]
                if blog_id and log_no:
                    mobile_url = f"https://m.blog.naver.com/{blog_id}/{log_no}"

        logger.info(f"Using mobile URL: {mobile_url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://m.blog.naver.com/'
        }
        
        try:
            response = requests.get(mobile_url, headers=headers, timeout=15)
            if response.status_code != 200:
                logger.warning(f"Failed to fetch {mobile_url}: {response.status_code}")
                return {'raw_text': '', 'image_urls': [], 'meta_json': {}}
                
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 1. Container Detection
            # Naver Blog has many versions. Try all common ones.
            content_area = (
                soup.find('div', class_='se-main-container') or 
                soup.find('div', class_='se_component_wrap') or
                soup.find('div', id='postViewArea') or 
                soup.find('div', class_='post_ct') or
                soup.find('div', class_='viewer')
            )
            
            full_text = ""
            image_urls = []
            
            if content_area:
                # 2. Text Extraction
                # Clone area to avoid modifying original
                area_copy = BeautifulSoup(str(content_area), 'html.parser')
                for tag in area_copy.find_all(['script', 'style', 'button']):
                    tag.decompose()
                full_text = area_copy.get_text(separator=' ', strip=True)
                # Cleanup multiple spaces
                full_text = re.sub(r'\s+', ' ', full_text)
                
                # 3. Image Extraction
                for img in content_area.find_all('img'):
                    # data-lazy-src is preferred for high-res
                    src = img.get('data-lazy-src') or img.get('src')
                    if src and src.startswith('http'):
                        # Skip UI/Social icons
                        if any(x in src for x in ['buddy', 'logIn.png', 'ico_', 'sticker', 'stat.blog.naver.com']):
                            continue
                        
                        # High-res logic for pstatic.net
                        if 'pstatic.net' in src:
                            # Keep type=w800 or similar if present
                            if 'type=' in src:
                                # Replace smaller types with w800 if desired, or just keep as is
                                if 'type=w80' in src and 'type=w800' not in src:
                                    src = src.replace('type=w80', 'type=w800')
                                image_urls.append(src)
                            else:
                                # No type, maybe original? Or add w800.
                                # Let's keep it clean but if it's mblogthumb, it usually NEEDS a type.
                                if 'mblogthumb' in src:
                                    image_urls.append(src + '?type=w800')
                                else:
                                    image_urls.append(src.split('?')[0])
                        else:
                            image_urls.append(src)

            # Deduplicate
            image_urls = list(dict.fromkeys(image_urls))
            
            # Fallback if specific containers missed
            if not full_text:
                full_text = soup.body.get_text(separator=' ', strip=True) if soup.body else ""
            
            logger.info(f"Finished extraction for {mobile_url}: {len(full_text)} chars, {len(image_urls)} images")
            return {
                'raw_text': full_text,
                'image_urls': image_urls,
                'meta_json': {}
            }
            
        except Exception as e:
            logger.error(f"Error in fetch_detail for {mobile_url}: {e}")
            return {'raw_text': '', 'image_urls': [], 'meta_json': {}}

    def _extract_blog_id(self, url: str) -> str:
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

    def _extract_log_no(self, url: str) -> str:
        match = re.search(r'/([^/?]+)/(\d+)', url)
        if match:
            return match.group(2)
        if 'logNo=' in url:
            import urllib.parse
            parsed = urllib.parse.urlparse(url)
            params = urllib.parse.parse_qs(parsed.query)
            return params.get('logNo', [None])[0]
        return url.split('/')[-1].split('?')[0] if '/' in url else url
