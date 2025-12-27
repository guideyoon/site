import os
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
import openai
import google.generativeai as genai

router = APIRouter()

class RewriteRequest(BaseModel):
    text: str
    api_key: Optional[str] = None
    provider: str = "openai"  # openai, gemini, perplexity
    model: Optional[str] = None
    instruction: Optional[str] = "Make this text more engaging and suitable for a blog post."

@router.post("/rewrite")
async def rewrite_content(
    request: RewriteRequest,
    current_user: User = Depends(get_current_user)
):
    """Rewrite text using AI (OpenAI, Gemini, Perplexity)"""
    
    provider = request.provider.lower()
    
    if provider == "openai":
        api_key = request.api_key or current_user.openai_api_key
        if not api_key:
            raise HTTPException(status_code=400, detail="OpenAI API Key is required.")
        
        model = request.model or "gpt-3.5-turbo"
        
        try:
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful blog writing assistant. Rewrite the provided text to be natural, engaging, and suitable for a Naver Blog post in Korean."},
                    {"role": "user", "content": f"{request.instruction}\n\n---\n{request.text}"}
                ]
            )
            return {"text": response.choices[0].message.content}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI processing failed: {str(e)}")

    elif provider == "perplexity":
        api_key = request.api_key or current_user.perplexity_api_key
        if not api_key:
            raise HTTPException(status_code=400, detail="Perplexity API Key is required.")
            
        # Perplexity uses OpenAI client structure
        model = request.model or "sonar" # Default to sonar if not specified
        
        try:
            client = openai.OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful blog writing assistant. Rewrite the provided text to be natural, engaging, and suitable for a Naver Blog post in Korean."},
                    {"role": "user", "content": f"{request.instruction}\n\n---\n{request.text}"}
                ]
            )
            return {"text": response.choices[0].message.content}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Perplexity processing failed: {str(e)}")

    elif provider == "gemini":
        api_key = request.api_key or current_user.gemini_api_key
        if not api_key:
            raise HTTPException(status_code=400, detail="Gemini API Key is required.")
            
        try:
            genai.configure(api_key=api_key)
            model_name = request.model or "gemini-pro"
            model = genai.GenerativeModel(model_name)
            
            prompt = f"""
            You are a helpful blog writing assistant. Rewrite the provided text to be natural, engaging, and suitable for a Naver Blog post in Korean.
            
            Instruction: {request.instruction}
            
            Text to rewrite:
            {request.text}
            """
            
            response = model.generate_content(prompt)
            return {"text": response.text}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini processing failed: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
