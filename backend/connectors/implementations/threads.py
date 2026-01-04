import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any
from urllib.parse import urljoin

from connectors.base import ConnectorBase

logger = logging.getLogger(__name__)


class ThreadsConnector(ConnectorBase):
    """
    Connector for Threads.net profiles.
    Parses the JSON data embedded in the profile's HTML page.
    """

    def fetch_list(self) -> List[Dict[str, Any]]:
        """Fetch list of items from Threads profile"""
        try:
            url = self.base_url
            # Normalize to threads.com (Threads' primary domain as of 2024/2025)
            if 'threads.net' in url:
                url = url.replace('threads.net', 'threads.com')
            
            # Ensure it starts with https://www.threads.com/@
            if not url.startswith('http'):
                url = f"https://www.threads.com/@{url.lstrip('@')}"
            elif 'threads.com' in url and '@' not in url.split('/')[-1]:
                # If it's something like https://www.threads.com/user, add @
                parts = url.rstrip('/').split('/')
                if not parts[-1].startswith('@'):
                    parts[-1] = f"@{parts[-1]}"
                    url = "/".join(parts)

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
            soup = self.parse_html(html)
            
            # Look for scripts containing post data
            scripts = soup.find_all('script')
            items = []
            
            for i, script in enumerate(scripts):
                content = script.string or ""
                if "RelayPrefetchedStreamCache" in content:
                    try:
                        # Try to find JSON-like structure
                        match = re.search(r'({.*})', content)
                        if match:
                            data = json.loads(match.group(1))
                        else:
                            continue

                        edges = self._find_edges(data)
                        if edges:
                            parsed_items = self._parse_edges(edges)
                            items.extend(parsed_items)
                            # Usually there's only one main feed script
                            if items:
                                break
                    except Exception as e:
                        logger.debug(f"Error parsing script content in script {i}: {e}")
                        continue

            
            logger.info(f"Successfully extracted {len(items)} items from Threads")
            return items

        except Exception as e:
            logger.error(f"Error fetching Threads posts from {self.base_url}: {e}")
            return []

    def _find_edges(self, obj: Any) -> List[Dict[str, Any]]:
        """Recursively find 'edges' that look like post data"""
        if isinstance(obj, dict):
            if 'edges' in obj and isinstance(obj['edges'], list):
                # Check if these edges look like post edges
                if len(obj['edges']) > 0 and 'node' in obj['edges'][0]:
                    node = obj['edges'][0].get('node', {})
                    if 'thread_items' in node or 'caption' in node:
                        return obj['edges']
            
            for key, value in obj.items():
                res = self._find_edges(value)
                if res: return res
        
        elif isinstance(obj, list):
            for item in obj:
                res = self._find_edges(item)
                if res: return res
        return []

    def _parse_edges(self, edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Parse edges into standard item format"""
        items = []
        for edge in edges:
            try:
                if not isinstance(edge, dict):
                    continue
                node = edge.get('node', {})
                if not node:
                    continue

                thread_items = node.get('thread_items')
                if not isinstance(thread_items, list):
                    thread_items = []
                
                post = {}
                if not thread_items and 'caption' in node:
                    # Fallback or different structure
                    post = node
                elif thread_items:
                    # Safely get the first item
                    first_item = thread_items[0] if thread_items else {}
                    post = first_item.get('post', {}) if isinstance(first_item, dict) else {}
                
                if not post or not isinstance(post, dict):
                    continue

                caption = post.get('caption', {})
                text = caption.get('text', '') if isinstance(caption, dict) and caption else ''
                
                if not text:
                    # Try text_post_app_info -> text_fragments
                    fragments = post.get('text_post_app_info', {}).get('text_fragments', {}).get('fragments', [])
                    if isinstance(fragments, list):
                        text = " ".join([f.get('plaintext', '') for f in fragments if isinstance(f, dict)])
                
                if not text:
                    continue

                code = post.get('code', '')
                pk = post.get('pk', '')
                item_id = code or pk
                
                # Construct URL
                url = f"https://www.threads.net/t/{code}/" if code else self.base_url
                
                # Title is first line of text
                title = text.split('\n')[0][:100]
                
                # Timestamp
                taken_at = post.get('taken_at')
                from datetime import timezone
                published_at = datetime.fromtimestamp(taken_at, tz=timezone.utc) if isinstance(taken_at, (int, float)) else None
                
                # Images & Videos
                image_urls = []
                video_urls = []
                
                # Check single media
                image_versions = post.get('image_versions2', {})
                if isinstance(image_versions, dict):
                    candidates = image_versions.get('candidates', [])
                    if isinstance(candidates, list) and candidates:
                        url_cand = candidates[0].get('url') if isinstance(candidates[0], dict) else None
                        if url_cand:
                            image_urls.append(url_cand)
                
                video_versions = post.get('video_versions', [])
                if isinstance(video_versions, list) and video_versions:
                    v_url = video_versions[0].get('url') if isinstance(video_versions[0], dict) else None
                    if v_url:
                        video_urls.append(v_url)
                
                # Check carousel
                carousel = post.get('carousel_media', [])
                if isinstance(carousel, list):
                    for media in carousel:
                        if not isinstance(media, dict):
                            continue
                        
                        # Image in carousel
                        c_image_versions = media.get('image_versions2', {})
                        if isinstance(c_image_versions, dict):
                            c_candidates = c_image_versions.get('candidates', [])
                            if isinstance(c_candidates, list) and c_candidates:
                                c_url_cand = c_candidates[0].get('url') if isinstance(c_candidates[0], dict) else None
                                if c_url_cand:
                                    image_urls.append(c_url_cand)
                        
                        # Video in carousel
                        c_video_versions = media.get('video_versions', [])
                        if isinstance(c_video_versions, list) and c_video_versions:
                            cv_url = c_video_versions[0].get('url') if isinstance(c_video_versions[0], dict) else None
                            if cv_url:
                                video_urls.append(cv_url)
                
                # Filter None and empty
                image_urls = [u for u in image_urls if u]
                video_urls = [u for u in video_urls if u]
                
                # Metadata
                text_app_info = post.get('text_post_app_info', {})
                if not isinstance(text_app_info, dict):
                    text_app_info = {}
                
                items.append({
                    'title': title,
                    'url': url,
                    'source_item_id': str(item_id),
                    'published_at': published_at,
                    'raw_text': text,
                    'image_urls': image_urls,
                    'meta_json': {
                        'like_count': post.get('like_count'),
                        'reply_count': text_app_info.get('direct_reply_count'),
                        'repost_count': text_app_info.get('repost_count'),
                        'video_urls': video_urls,
                        'is_video': len(video_urls) > 0
                    }
                })
            except Exception as e:
                logger.warning(f"Error parsing edge: {e}", exc_info=True)
                continue
        return items
