from connectors.base import ConnectorBase
from connectors.implementations.generic_board import GenericBoardConnector
from connectors.implementations.naver_blog import NaverBlogConnector
from connectors.implementations.threads import ThreadsConnector
from app.models.source import Source
import logging

logger = logging.getLogger(__name__)


def get_connector(source: Source) -> ConnectorBase:
    """
    Factory function to get appropriate connector for a source
    
    Args:
        source: Source model instance
    
    Returns:
        Connector instance or None
    """
    connector_map = {
        "generic_board": GenericBoardConnector,
        "naver_blog": NaverBlogConnector,
        "threads": ThreadsConnector,
        # Add more connector types as needed
        # "ulsan_city_hall": UlsanCityHallConnector,
        # "ulsan_culture": UlsanCultureConnector,
    }
    
    connector_class = connector_map.get(source.type)
    
    if not connector_class:
        logger.warning(f"No connector found for source type: {source.type}")
        # Default to generic board connector
        connector_class = GenericBoardConnector
    
    return connector_class(source)
