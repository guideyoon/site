import json
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from urllib.parse import urljoin

from connectors.base import ConnectorBase

logger = logging.getLogger(__name__)


class XConnector(ConnectorBase):
    """
    Connector for X (formerly Twitter) profiles.
    Attempts to parse JSON data from the public profile page.
    """

    def fetch_list(self) -> List[Dict[str, Any]]:
        """Fetch list of items from X profile"""
        try:
            url = self.base_url
            # Normalize URL
            if not url.startswith('http'):
                url = f"https://x.com/{url.lstrip('@').rstrip('/')}"
            
            # X often redirects twitter.com to x.com
            url = url.replace('twitter.com', 'x.com')

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Upgrade-Insecure-Requests': '1',
            }

            response = self.client.get(url, headers=headers)
            response.raise_for_status()
            
            html = response.text
            soup = self.parse_html(html)
            
            items = []
            
            # Look for __INITIAL_STATE__
            scripts = soup.find_all('script')
            for script in scripts:
                content = script.string or ""
                if "window.__INITIAL_STATE__" in content:
                    try:
                        # Sometimes it's window.__INITIAL_STATE__ = { ... };
                        match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({.*?});', content)
                        if not match:
                            # Or just the object if it's in a specific script tag
                            match = re.search(r'({.*})', content)
                        
                        if match:
                            data = json.loads(match.group(1))
                            items.extend(self._parse_initial_state(data))
                            if items: break
                    except Exception as e:
                        logger.debug(f"Error parsing __INITIAL_STATE__: {e}")
                        continue

            logger.info(f"Successfully extracted {len(items)} items from X")
            return items

        except Exception as e:
            logger.error(f"Error fetching X posts from {self.base_url}: {e}")
            return []

    def _parse_initial_state(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Recursively find all tweet objects in the initial state"""
        items = []
        found_tweets = []

        def find_tweets(obj):
            if isinstance(obj, dict):
                # Look for objects that look like tweets
                if 'full_text' in obj and 'id_str' in obj:
                    found_tweets.append(obj)
                # Also look for modern GraphQL tweet objects
                if 'legacy' in obj and isinstance(obj['legacy'], dict):
                    legacy = obj['legacy']
                    if 'full_text' in legacy and 'id_str' in legacy:
                        # Merge or use legacy
                        found_tweets.append(obj)
                
                for v in obj.values():
                    find_tweets(v)
            elif isinstance(obj, list):
                for i in obj:
                    find_tweets(i)

        find_tweets(data)
        
        # Deduplicate by ID
        seen_ids = set()
        for tweet_obj in found_tweets:
            # Handle both legacy and new structure
            tweet = tweet_obj.get('legacy', tweet_obj)
            item_id = tweet.get('id_str')
            if item_id and item_id not in seen_ids:
                seen_ids.add(item_id)
                parsed = self._parse_tweet(tweet_obj, data)
                if parsed:
                    items.append(parsed)
        
        return items

    def _parse_tweet(self, tweet_obj: Dict[str, Any], full_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a tweet object to standard format"""
        try:
            # Handle both legacy and new structure
            tweet = tweet_obj.get('legacy', tweet_obj)
            item_id = tweet.get('id_str')
            if not item_id: return None

            # User data might be in tweet_obj.core.user_results.result.legacy
            # or in full_data.entities.users
            user = {}
            user_results = tweet_obj.get('core', {}).get('user_results', {}).get('result', {})
            if user_results:
                user = user_results.get('legacy', {})
            
            if not user:
                # Fallback to searching in entities
                user_id = tweet.get('user_id_str')
                users = full_data.get('entities', {}).get('users', {})
                user = users.get(user_id, {})

            screen_name = user.get('screen_name', 'user')
            url = f"https://x.com/{screen_name}/status/{item_id}"
            text = tweet.get('full_text', tweet.get('text', ''))
            
            title = text.split('\n')[0][:100] or f"X Post {item_id}"
            
            # Timestamp
            created_at_str = tweet.get('created_at')
            published_at = None
            if created_at_str:
                try:
                    # X format: "Thu Jan 01 00:00:00 +0000 1970"
                    published_at = datetime.strptime(created_at_str, '%a %b %d %H:%M:%S %z %Y')
                except:
                    pass
            
            # Images
            image_urls = []
            extended_entities = tweet.get('extended_entities', {})
            media = extended_entities.get('media', [])
            for m in media:
                if m.get('type') in ['photo', 'video', 'animated_gif']:
                    image_urls.append(m.get('media_url_https'))

            return {
                'title': title,
                'url': url,
                'source_item_id': item_id,
                'published_at': published_at,
                'raw_text': text,
                'image_urls': image_urls,
                'meta_json': {
                    'favorite_count': tweet.get('favorite_count'),
                    'retweet_count': tweet.get('retweet_count'),
                    'reply_count': tweet.get('reply_count'),
                }
            }
        except Exception as e:
            logger.warning(f"Error parsing tweet: {e}")
            return None
