import json
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from urllib.parse import urljoin

from connectors.base import ConnectorBase

logger = logging.getLogger(__name__)


class InstagramConnector(ConnectorBase):
    """
    Connector for Instagram profiles.
    Attempts to parse JSON data from the public profile page.
    """

    def fetch_list(self) -> List[Dict[str, Any]]:
        """Fetch list of items from Instagram profile using robust JSON scanning"""
        try:
            url = self.base_url
            if not url.startswith('http'):
                url = f"https://www.instagram.com/{url.lstrip('@').rstrip('/')}/"
            
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

            response = self.client.get(url, headers=headers)
            response.raise_for_status()
            
            html = response.text
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

    def _parse_node(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Instagram media node to standard format"""
        try:
            shortcode = node.get('shortcode')
            if not shortcode: return None

            url = f"https://www.instagram.com/p/{shortcode}/"
            
            # Caption
            caption_edges = node.get('edge_media_to_caption', {}).get('edges', [])
            text = caption_edges[0].get('node', {}).get('text', '') if caption_edges else ''
            
            title = text.split('\n')[0][:100] or f"Instagram Post {shortcode}"
            
            # Timestamp
            timestamp = node.get('taken_at_timestamp')
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

            return {
                'title': title,
                'url': url,
                'source_item_id': shortcode,
                'published_at': published_at,
                'raw_text': text,
                'image_urls': image_urls,
                'meta_json': {
                    'like_count': node.get('edge_liked_by', {}).get('count'),
                    'comment_count': node.get('edge_media_to_comment', {}).get('count'),
                    'is_video': node.get('is_video', False)
                }
            }
        except Exception as e:
            logger.warning(f"Error parsing Instagram node: {e}")
            return None
