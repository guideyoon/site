from abc import ABC, abstractmethod
from typing import List, Dict, Any
import httpx
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)


class ConnectorBase(ABC):
    """Base class for all content connectors"""
    
    def __init__(self, source):
        """
        Initialize connector with source configuration
        
        Args:
            source: Source model instance
        """
        self.source = source
        self.base_url = source.base_url
        self.client = httpx.Client(timeout=30.0, follow_redirects=True)
    
    @abstractmethod
    def fetch_list(self) -> List[Dict[str, Any]]:
        """
        Fetch list of items from source
        
        Returns:
            List of item dictionaries with keys:
            - url: str (required)
            - title: str (required)
            - source_item_id: str (optional)
            - published_at: datetime (optional)
            - raw_text: str (optional)
            - image_urls: list (optional)
            - meta_json: dict (optional)
        """
        pass
    
    def fetch_detail(self, item_url: str) -> Dict[str, Any]:
        """
        Fetch detail of single item (optional, can be used by subclasses)
        
        Args:
            item_url: URL of the item
        
        Returns:
            Item dictionary
        """
        return {}
    
    def parse_html(self, html: str) -> BeautifulSoup:
        """Parse HTML with BeautifulSoup"""
        return BeautifulSoup(html, 'lxml')
    
    def get_page(self, url: str) -> str:
        """
        Fetch page content
        
        Args:
            url: URL to fetch
        
        Returns:
            HTML content as string
        """
        try:
            response = self.client.get(url)
            response.raise_for_status()
            return response.text
        except Exception as e:
            logger.error(f"Error fetching URL {url}: {e}")
            raise
    
    def close(self):
        """Close HTTP client"""
        self.client.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
