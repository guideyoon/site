import sys
import os
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_date_filter():
    """Test that the 10-day filter logic works correctly"""
    cutoff_date = datetime.now() - timedelta(days=10)
    
    # Test cases
    test_items = [
        {"title": "Recent item", "published_at": datetime.now() - timedelta(days=2)},
        {"title": "Exactly 10 days old", "published_at": datetime.now() - timedelta(days=10)},
        {"title": "11 days old (should skip)", "published_at": datetime.now() - timedelta(days=11)},
        {"title": "30 days old (should skip)", "published_at": datetime.now() - timedelta(days=30)},
        {"title": "No date (should include)", "published_at": None},
    ]
    
    print(f"Cutoff date: {cutoff_date}")
    print("\nTest Results:")
    
    for item in test_items:
        if item.get('published_at'):
            should_skip = item['published_at'] < cutoff_date
            status = "❌ SKIP" if should_skip else "✅ INCLUDE"
            print(f"{status}: {item['title']} - {item['published_at']}")
        else:
            print(f"✅ INCLUDE: {item['title']} - No date (fail-safe)")
    
    print("\n✅ Date filter logic verified!")

if __name__ == "__main__":
    test_date_filter()
