from typing import List, Tuple, Optional


# Category keywords (Korean)
CATEGORY_KEYWORDS = {
    "행사": ["행사", "이벤트", "축제", "페스티벌", "공연", "전시", "콘서트"],
    "공지": ["공지", "알림", "안내", "공고"],
    "채용": ["채용", "모집", "구인", "일자리", "취업"],
    "지원사업": ["지원", "신청", "보조금", "지원금", "사업", "프로그램"],
    "안전": ["안전", "재난", "사고", "예방", "점검"],
    "교통": ["교통", "도로", "주차", "버스", "운행"],
    "문화": ["문화", "예술", "미술", "음악", "영화"],
    "축제": ["축제", "페스티벌", "한마당"],
    "복지": ["복지", "돌봄", "건강", "의료", "지원"],
    "교육": ["교육", "강좌", "수업", "강의", "학습", "연수"],
    "환경": ["환경", "청소", "정화", "재활용", "쓰레기"],
    "산업": ["산업", "기업", "경제", "투자", "일자리"]
}

# Region keywords
REGION_KEYWORDS = {
    "중구": ["중구"],
    "남구": ["남구"],
    "동구": ["동구"],
    "북구": ["북구"],
    "울주군": ["울주군", "울주"]
}


def classify_category(text: str) -> Optional[str]:
    """
    Classify category based on keyword matching
    Returns category name or None
    """
    text_lower = text.lower()
    
    # Count keyword matches for each category
    matches = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        count = sum(1 for keyword in keywords if keyword in text_lower)
        if count > 0:
            matches[category] = count
    
    # Return category with most matches
    if matches:
        return max(matches.items(), key=lambda x: x[1])[0]
    
    return "공지"  # Default category


def classify_region(text: str) -> str:
    """
    Classify region based on keyword matching
    Returns region name or "울산 전체"
    """
    text_lower = text.lower()
    
    for region, keywords in REGION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return region
    
    return "울산 전체"  # Default region


def generate_tags(title: str, content: str) -> List[str]:
    """
    Generate tags from title and content
    Returns list of tags
    """
    tags = set()
    
    combined_text = f"{title} {content}".lower()
    
    # Extract all matched keywords as tags
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in combined_text:
                tags.add(keyword)
    
    # Extract region keywords
    for region, keywords in REGION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in combined_text:
                tags.add(region)
    
    # Additional common keywords
    extra_keywords = ["울산", "시민", "참여", "무료", "신청", "접수", "문의", "안내"]
    for keyword in extra_keywords:
        if keyword in combined_text:
            tags.add(keyword)
    
    return list(tags)[:10]  # Limit to 10 tags


def classify_item(title: str, content: str) -> Tuple[str, str, List[str]]:
    """
    Classify an item and generate tags
    Returns (category, region, tags)
    """
    combined = f"{title} {content or ''}"
    
    category = classify_category(combined)
    region = classify_region(combined)
    tags = generate_tags(title, content or "")
    
    return category, region, tags
