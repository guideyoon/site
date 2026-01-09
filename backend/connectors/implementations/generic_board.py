from connectors.base import ConnectorBase
from typing import List, Dict, Any
from datetime import datetime
import json
import re
import logging

logger = logging.getLogger(__name__)


class GenericBoardConnector(ConnectorBase):
    """
    Generic connector for standard Korean government/institution bulletin boards
    
    This connector uses CSS selectors from crawl_policy to extract items
    """
    
    def fetch_list(self) -> List[Dict[str, Any]]:
        """Fetch list of items from bulletin board"""
        try:
            # Get configuration from crawl_policy
            config = json.loads(self.source.crawl_policy) if self.source.crawl_policy else {}
            
            list_url = config.get('list_url', self.base_url)
            selectors = config.get('selectors', {})
            
            # Default selectors for common Korean board layouts
            row_selector = selectors.get('row', 'tr, .board-list-item, .notice-item')
            title_selector = selectors.get('title', 'a, .title')
            date_selector = selectors.get('date', '.date, .reg-date, td:last-child')

            # Preset for Ulsan agencies (City Hall, District Offices)
            if 'ulsan' in self.base_url:
                row_selector = selectors.get('row', 'tbody tr')
                # Try multiple common title selectors for Ulsan agencies
                title_selector = selectors.get('title', 'td.subject a, td.ta_l a, td.title a, .subject a')
                date_selector = selectors.get('date', 'td.regDate, td.date, td:nth-of-type(4)')
            
            # Fetch page
            html = self.get_page(list_url)
            soup = self.parse_html(html)
            
            items = []
            rows = soup.select(row_selector)
            
            logger.info(f"Found {len(rows)} rows using selector: {row_selector}")
            
            for row in rows[:50]:  # Limit to first 50 items
                try:
                    # Extract title and URL
                    title_elem = row.select_one(title_selector)
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    
                    # CLEAN TITLE: Remove [123] or [Number] prefix common in Korean boards
                    # specific for Onsan Cultural Center and others
                    title = re.sub(r'^\[\d+\]\s*', '', title)
                    
                    href = title_elem.get('href', '')
                    
                    if not title or not href:
                        continue
                    
                    # Make URL absolute
                    from urllib.parse import urljoin, urlparse
                    if href.startswith('javascript:') or href.startswith('#'):
                        # Skip javascript links
                        continue
                    elif href.startswith('/'):
                        url = urljoin(self.base_url, href)
                    elif not href.startswith('http'):
                        # Handle relative URLs like ./view.do
                        url = urljoin(list_url, href)
                    else:
                        url = href
                    
                    # Extract date if available
                    date_elem = row.select_one(date_selector)
                    published_at = None
                    if date_elem:
                        date_text = date_elem.get_text(strip=True)
                        published_at = self._parse_date(date_text)
                    
                    # Extract ID from URL if possible
                    source_item_id = self._extract_id_from_url(url)
                    
                    # Fetch detail page to get full content
                    detail_data = self.fetch_detail(url)
                    
                    items.append({
                        'title': title,
                        'url': url,
                        'source_item_id': source_item_id,
                        'published_at': published_at,
                        'raw_text': detail_data.get('raw_text', title),
                        'image_urls': detail_data.get('image_urls', []),
                        'meta_json': detail_data.get('meta_json', {})
                    })
                    
                except Exception as e:
                    logger.warning(f"Error parsing row: {e}")
                    continue
            
            logger.info(f"Successfully extracted {len(items)} items")
            return items
            
        except Exception as e:
            logger.error(f"Error fetching list from {self.source.name}: {e}")
            return []
    
    def fetch_detail(self, url: str) -> Dict[str, Any]:
        """Fetch detail page and extract full content"""
        try:
            html = self.get_page(url)
            soup = self.parse_html(html)
            
            # Extract content based on site
            raw_text = ''
            image_urls = []
            attachments = []
            
            if 'ulsan' in url:
                # Ulsan agencies specific selectors
                # Try to find content in the table structure first (th '내용' -> td)
                content_elem = None
                content_th = soup.find('th', string=re.compile('내용'))
                if content_th:
                    content_elem = content_th.find_next_sibling('td')
                
                # Fallback to general containers
                if not content_elem:
                    content_elem = soup.select_one('.view-content, .detailCon, .data_table, .contents_inner, .bbs_detail')
                
                if content_elem:
                    # Get text content
                    raw_text = content_elem.get_text(separator='\n', strip=True)
                    
                    # Extract images
                    for img in content_elem.select('img'):
                        img_src = img.get('src', '')
                        if img_src:
                            from urllib.parse import urljoin
                            if not img_src.startswith('http'):
                                img_src = urljoin(url, img_src)
                            image_urls.append(img_src)
                    
                    # Extract attachments
                    # Check all links in the main table or content area
                    # Often attachments are in a specific row, need to scan
                    attachment_candidates = soup.select('.tbl_bd_view a, .contents_inner a, .bbs_detail a')
                    for link in attachment_candidates:
                        href = link.get('href', '')
                        onclick = link.get('onclick', '')
                        text = link.get_text(strip=True)
                        
                        # Check if it looks like a file
                        is_file = False
                        if any(ext in text.lower() for ext in ['.pdf', '.hwp', '.doc', '.xls', '.zip', '.png', '.jpg']):
                            is_file = True
                        elif 'fileDown' in onclick or 'fileDown' in href:
                            is_file = True
                        
                        if is_file:
                            # Avoid duplicates
                            file_url = href
                            if not file_url or file_url.startswith('#') or 'javascript' in file_url:
                                file_url = onclick # store onclick as URL if real URL is missing
                                
                            # If url is still relative
                            from urllib.parse import urljoin
                            if file_url and not file_url.startswith('http') and not file_url.startswith('HHBbs'): 
                                # HHBbs is the JS function name, don't prepend http
                                file_url = urljoin(url, file_url)

                            # Check if already added
                            if not any(a['url'] == file_url for a in attachments):
                                attachments.append({
                                    'url': file_url,
                                    'name': text
                                })
            else:
                # Generic content extraction
                content_elem = soup.select_one('article, .content, .view-content, .post-content, main')
                if content_elem:
                    raw_text = content_elem.get_text(separator='\n', strip=True)
                    
                    # Extract images
                    for img in content_elem.select('img'):
                        img_src = img.get('src', '')
                        if img_src:
                            from urllib.parse import urljoin
                            if not img_src.startswith('http'):
                                img_src = urljoin(url, img_src)
                            image_urls.append(img_src)
            
            return {
                'raw_text': raw_text,
                'image_urls': image_urls,
                'meta_json': {'attachments': attachments} if attachments else {}
            }
            
        except Exception as e:
            logger.warning(f"Error fetching detail from {url}: {e}")
            return {'raw_text': '', 'image_urls': [], 'meta_json': {}}
    
    def _parse_date(self, date_str: str) -> datetime:
        """Parse Korean date format"""
        try:
            # Common formats: 2024-12-22, 2024.12.22, 24-12-22
            date_str = date_str.strip()
            
            # Replace dots with dashes
            date_str = date_str.replace('.', '-')
            
            # Extract date pattern
            match = re.search(r'(\d{2,4})-(\d{1,2})-(\d{1,2})', date_str)
            if match:
                year, month, day = match.groups()
                
                # Handle 2-digit year
                if len(year) == 2:
                    year = f"20{year}"
                
                return datetime(int(year), int(month), int(day))
            
        except Exception as e:
            logger.warning(f"Error parsing date '{date_str}': {e}")
        
        return None
    
    def _extract_id_from_url(self, url: str) -> str:
        """Extract ID from URL query parameters"""
        try:
            # Look for common ID patterns: ?id=123, ?no=123, ?seq=123, ?dataId=123
            match = re.search(r'[?&](id|no|seq|idx|num|dataId)=(\d+)', url, re.IGNORECASE)
            if match:
                return match.group(2)
        except Exception:
            pass
        
        return url  # Return URL as fallback
