import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        items = []
        
        # Helper to extract items from edges
        def extract_items(obj):
            if isinstance(obj, dict):
                if 'edges' in obj and isinstance(obj['edges'], list):
                    for edge in obj['edges']:
                        if 'node' in edge:
                            node = edge['node']
                            # Check for thread_items
                            if 'thread_items' in node:
                                for item in node['thread_items']:
                                    if 'post' in item:
                                        items.append(item['post'])
                            elif 'thread_items' not in node and 'caption' in node:
                                # Sometimes direct post node
                                items.append(node)
                
                for k, v in obj.items():
                    extract_items(v)
            elif isinstance(obj, list):
                for i in obj:
                    extract_items(i)

        extract_items(data)
        
        logger.info(f"Found {len(items)} posts.")
        
        for i, post in enumerate(items):
            code = post.get('code')
            pk = post.get('pk')
            media_type = post.get('media_type')
            video_versions = post.get('video_versions')
            carousel_media = post.get('carousel_media')
            original_width = post.get('original_width')
            original_height = post.get('original_height')
            
            has_video = bool(video_versions)
            carousel_videos = 0
            if carousel_media:
                for media in carousel_media:
                    if media.get('video_versions'):
                        carousel_videos += 1
            
            logger.info(f"Post {i}: Code={code}, PK={pk}, Type={media_type}, HasVideo={has_video}, CarouselVideos={carousel_videos}")
            
            if code == 'DS95kUcAR1F':
                logger.info("Found target post DS95kUcAR1F!")
                logger.info(json.dumps(post, indent=2))

    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    import glob
    files = glob.glob('threads_debug_*.json')
    for f in files:
        logger.info(f"Analyzing {f}...")
        analyze_json(f)
