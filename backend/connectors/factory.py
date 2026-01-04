# Imports moved inside get_connector to prevent global crash on missing dependencies (e.g. playwright)
from app.models.source import Source
import logging

logger = logging.getLogger(__name__)


def get_connector(source: Source):
    """
    Factory function to get appropriate connector for a source
    """
    from connectors.implementations.generic_board import GenericBoardConnector
    from connectors.implementations.naver_blog import NaverBlogConnector
    from connectors.implementations.threads import ThreadsConnector
    from connectors.implementations.x import XConnector
    
    # Try importing Instagram (might fail due to playwright)
    InstagramConnector = None
    try:
        from connectors.implementations.instagram import InstagramConnector
    except ImportError as e:
        logger.warning(f"Could not import InstagramConnector: {e}. Instagram collection will be unavailable.")

    connector_map = {
        "generic_board": GenericBoardConnector,
        "naver_blog": NaverBlogConnector,
        "threads": ThreadsConnector,
        "instagram": InstagramConnector,
        "x": XConnector,
    }
    
    connector_class = connector_map.get(source.type)
    
    if not connector_class:
        logger.warning(f"No connector found or available for source type: {source.type}")
        # Default to generic board connector
        connector_class = GenericBoardConnector
    
    return connector_class(source)
