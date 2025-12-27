from app.models.item import Item
from typing import Optional


def generate_cafe_post(item: Item) -> str:
    """
    Generate Naver Cafe post from item
    
    Format:
    - Title: [울산] [지역명] [카테고리] 핵심키워드
    - Body: 
      - 한 줄 요약
      - 핵심 정보 (항목식)
      - 원문 링크
      - 주의 문구
    """
    # Generate title
    region_prefix = f"[{item.region}]" if item.region and item.region != "울산 전체" else "[울산]"
    category_prefix = f"[{item.category}]" if item.category else ""
    title = f"{region_prefix} {category_prefix} {item.title}"
    
    # Generate body
    body_parts = []
    
    # Summary
    if item.summary_text:
        body_parts.append(f"📌 {item.summary_text}")
        body_parts.append("")
    
    # Core information
    body_parts.append("▶ 핵심 정보")
    
    # Extract dates if available
    if item.published_at:
        body_parts.append(f"• 게시일: {item.published_at.strftime('%Y년 %m월 %d일')}")
    
    if item.category:
        body_parts.append(f"• 분류: {item.category}")
    
    if item.region and item.region != "울산 전체":
        body_parts.append(f"• 지역: {item.region}")
    
    # Tags
    if item.tags:
        tags_str = " #".join(item.tags[:5])
        body_parts.append(f"• 키워드: #{tags_str}")
    
    body_parts.append("")
    
    # Original link
    body_parts.append("▶ 원문 보기")
    body_parts.append(f"{item.url}")
    body_parts.append("")
    
    # Notice
    body_parts.append("─" * 30)
    body_parts.append("※ 본 게시물은 원문을 요약한 것입니다.")
    body_parts.append("※ 자세한 내용은 원문 링크를 참고해주세요.")
    body_parts.append("※ 문의사항은 해당 기관으로 직접 연락하시기 바랍니다.")
    
    # Combine
    full_post = f"{title}\n\n" + "\n".join(body_parts)
    
    return full_post


def generate_custom_post(
    item: Item,
    title_template: Optional[str] = None,
    body_template: Optional[str] = None
) -> str:
    """
    Generate custom cafe post with templates
    
    Template variables:
    - {region}, {category}, {title}, {summary}, {url}, {tags}, {published_at}
    """
    if not title_template:
        return generate_cafe_post(item)
    
    # Replace variables
    variables = {
        "region": item.region or "울산 전체",
        "category": item.category or "공지",
        "title": item.title,
        "summary": item.summary_text or "",
        "url": item.url,
        "tags": " #".join(item.tags) if item.tags else "",
        "published_at": item.published_at.strftime('%Y년 %m월 %d일') if item.published_at else ""
    }
    
    title = title_template.format(**variables)
    body = body_template.format(**variables) if body_template else generate_cafe_post(item)
    
    return f"{title}\n\n{body}"
