from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://navercafe:navercafe123@localhost:5432/navercafe"

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("Checking for columns in users table...")
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key VARCHAR(200)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key VARCHAR(200)"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS perplexity_api_key VARCHAR(200)"))
    conn.commit()
    print("Migration completed successfully.")
