from typing import Optional
from app.config import settings


def extractive_summarize(text: str, max_sentences: int = 3) -> str:
    """
    Simple extractive summarization - takes first N sentences
    """
    if not text:
        return ""
    
    # Split by common Korean sentence endings
    sentences = []
    current = ""
    
    for char in text:
        current += char
        if char in ['.', '!', '?', '。'] or (char == '\n' and current.strip()):
            sentence = current.strip()
            if sentence and len(sentence) > 5:  # Filter out very short sentences
                sentences.append(sentence)
            current = ""
    
    # Add last sentence if exists
    if current.strip():
        sentences.append(current.strip())
    
    # Return first N sentences
    summary_sentences = sentences[:max_sentences]
    return ' '.join(summary_sentences)


def llm_summarize(text: str, max_length: int = 200) -> Optional[str]:
    """
    Use OpenAI API for summarization (if configured)
    """
    if not settings.OPENAI_API_KEY:
        return None
    
    try:
        import openai
        openai.api_key = settings.OPENAI_API_KEY
        
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 울산 지역 정보를 요약하는 전문가입니다. 네이버 카페 게시용으로 간결하고 핵심적인 요약을 작성해주세요."},
                {"role": "user", "content": f"다음 내용을 {max_length}자 이내로 요약해주세요:\n\n{text[:2000]}"}
            ],
            max_tokens=150,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"LLM summarization failed: {e}")
        return None


def summarize_content(text: str, mode: Optional[str] = None) -> str:
    """
    Summarize content based on configured mode
    
    Args:
        text: Text to summarize
        mode: 'rule' or 'llm', defaults to settings.SUMMARY_MODE
    
    Returns:
        Summarized text
    """
    if not text:
        return ""
    
    mode = mode or settings.SUMMARY_MODE
    
    if mode == "llm":
        llm_summary = llm_summarize(text)
        if llm_summary:
            return llm_summary
        # Fallback to rule-based if LLM fails
    
    # Rule-based extractive summarization
    return extractive_summarize(text)
