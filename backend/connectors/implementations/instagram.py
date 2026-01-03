import logging
import os
import re
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from urllib.parse import urljoin, unquote
from playwright.sync_api import sync_playwright

from connectors.base import ConnectorBase

logger = logging.getLogger(__name__)


class InstagramConnector(ConnectorBase):
    """
    Connector for Instagram profiles.
    Uses Playwright to render the page and bypass anti-scraping measures.
    """

    def fetch_list(self) -> List[Dict[str, Any]]:
        """Fetch list of items from Instagram profile using Playwright"""
        try:
            url = self.base_url
            if not url.startswith('http'):
                url = f"https://www.instagram.com/{url.lstrip('@').rstrip('/')}/"
            
            logger.info(f"Starting Playwright collection for {url}")
            
            with sync_playwright() as p:
                # Launch browser with stealth args
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-infobars',
                        '--window-position=0,0',
                        '--ignore-certifcate-errors',
                        '--ignore-certifcate-errors-spki-list',
                        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    ]
                )
                
                # Context with specific User-Agent if provided
                ua = os.getenv('INSTAGRAM_USER_AGENT')
                context_args = {
                    "viewport": {"width": 1280, "height": 800},
                    "java_script_enabled": True,
                    "permissions": ["geolocation"],
                }
                if ua:
                    context_args["user_agent"] = ua

                context = browser.new_context(**context_args)
                
                # Apply stealth scripts
                context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                
                # Add cookies
                cookie_string = os.getenv('INSTAGRAM_COOKIE_STRING')
                session_id = os.getenv('INSTAGRAM_SESSION_ID')
                
                cookies = []
                if cookie_string:
                    # Simple parsing of cookie string
                    for cookie in cookie_string.split('; '):
                        if '=' in cookie:
                            name, value = cookie.split('=', 1)
                            cookies.append({
                                "name": name, 
                                "value": value.strip('"'), # Remove quotes if present
                                "domain": ".instagram.com", 
                                "path": "/"
                            })
                elif session_id:
                    session_id = unquote(session_id)
                    cookies.append({"name": "sessionid", "value": session_id, "domain": ".instagram.com", "path": "/"})
                    
                    parts = session_id.split(':')
                    if len(parts) > 0:
                         cookies.append({"name": "ds_user_id", "value": parts[0], "domain": ".instagram.com", "path": "/"})

                if cookies:
                    context.add_cookies(cookies)
                    logger.debug(f"Added {len(cookies)} cookies to Playwright context")

                page = context.new_page()
                
                # Navigate
                try:
                    logger.debug(f"Navigating to {url}")
                    page.goto(url, wait_until="commit", timeout=60000)
                    
                    # Wait for specific content to ensure loading (e.g. article tag or specific profile element)
                    # We wait for 5s regardless to let JS render
                    page.wait_for_timeout(8000) 
                    
                except Exception as e:
                    logger.warning(f"Navigation warning (might still have content): {e}")

                html = page.content()
                browser.close()
            
            # Look for scripts containing post data (Threads uses RelayPrefetchedStreamCache)
            # Instagram might use the same or window._sharedData
            
            scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
            
            found_nodes = []
            seen_shortcodes = set()

            def find_media_nodes(obj):
                if isinstance(obj, dict):
                    # Check for 'edges' (generic Meta pattern)
                    if 'edges' in obj and isinstance(obj['edges'], list):
                        for edge in obj['edges']:
                            node = edge.get('node', {})
                            if isinstance(node, dict) and 'shortcode' in node:
                                shortcode = node.get('shortcode')
                                if shortcode and shortcode not in seen_shortcodes:
                                    seen_shortcodes.add(shortcode)
                                    found_nodes.append(node)
                    
                    # Direct shortcode check
                    if 'shortcode' in obj and ('display_url' in obj or 'edge_media_to_caption' in obj):
                        shortcode = obj.get('shortcode')
                        if shortcode and shortcode not in seen_shortcodes:
                            seen_shortcodes.add(shortcode)
                            found_nodes.append(obj)

                    for v in obj.values():
                        find_media_nodes(v)
                elif isinstance(obj, list):
                    for i in obj:
                        find_media_nodes(i)

            # Scan all scripts for JSON data
            for script in scripts:
                if "shortcode" in script or "display_url" in script:
                    # Find all potential JSON objects
                    matches = re.findall(r'({.*?})', script)
                    for match in matches:
                        if len(match) > 500: # Ignore small objects
                            try:
                                data = json.loads(match)
                                find_media_nodes(data)
                            except:
                                continue
            
            items = []
            for node in found_nodes:
                parsed = self._parse_node(node)
                if parsed:
                    items.append(parsed)

            if not items and ("Login" in html or "Log In" in html):
                logger.warning(f"Instagram profile {url} redirected to login page")

            logger.info(f"Successfully extracted {len(items)} items from Instagram")
            return items

        except Exception as e:
            logger.error(f"Error fetching Instagram posts from {self.base_url}: {e}")
            return []

    def _parse_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Instagram media node to standard format"""
        try:
            shortcode = node.get('shortcode')
            if not shortcode: return None

            url = f"https://www.instagram.com/p/{shortcode}/"
            
            # Caption
            caption_edges = node.get('edge_media_to_caption', {}).get('edges', [])
            text = caption_edges[0].get('node', {}).get('text', '') if caption_edges else ''
            if not text:
                text = node.get('caption', {}).get('text', '') # Alternative structure
            
            title = text.split('\n')[0][:100] or f"Instagram Post {shortcode}"
            
            # Timestamp
            timestamp = node.get('taken_at_timestamp') or node.get('taken_at')
            published_at = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp else None
            
            # Images
            image_urls = []
            display_url = node.get('display_url')
            if display_url:
                image_urls.append(display_url)
            
            # If carousel
            sidecar_edges = node.get('edge_sidecar_to_media', {}).get('edges', [])
            for edge in sidecar_edges:
                s_node = edge.get('node', {})
                s_url = s_node.get('display_url')
                if s_url and s_url not in image_urls:
                    image_urls.append(s_url)
            
            # If alternative carousel structure
            carousel_media = node.get('carousel_media', [])
            if isinstance(carousel_media, list):
                for m in carousel_media:
                    m_url = m.get('display_url') or m.get('image_versions2', {}).get('candidates', [{}])[0].get('url')
                    if m_url and m_url not in image_urls:
                        image_urls.append(m_url)

            return {
                'title': title,
                'url': url,
                'source_item_id': shortcode,
                'published_at': published_at,
                'raw_text': text,
                'image_urls': image_urls,
                'meta_json': {
                    'like_count': node.get('edge_liked_by', {}).get('count') or node.get('like_count'),
                    'comment_count': node.get('edge_media_to_comment', {}).get('count') or node.get('comment_count'),
                    'is_video': node.get('is_video', False)
                }
            }
        except Exception as e:
            logger.warning(f"Error parsing Instagram node: {e}")
            return None
