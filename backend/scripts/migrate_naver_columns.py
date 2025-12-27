from sqlalchemy import create_engine, text
import os
import sys

def migrate():
    # 1. Read .env file directly
    # Script is in backend/scripts/, so .env is in ../../.env
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    database_url = "sqlite:///./sql_app.db" # Fallback default
    
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=', 1)[1].strip('"').strip("'")
                    break
    
    print(f"Using DATABASE_URL: {database_url}")
    
    # 2. Connect and migrate
    engine = create_engine(database_url)
    with engine.connect() as conn:
        print("Migrating users table...")
        
        columns_to_add = [
            ("naver_client_id", "VARCHAR(200)"),
            ("naver_client_secret", "VARCHAR(200)"),
            ("naver_access_token", "VARCHAR(200)"),
            ("naver_refresh_token", "VARCHAR(200)"),
            ("naver_token_expires_at", "TIMESTAMP")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                print(f"Added {col_name}")
            except Exception as e:
                # Likely already exists
                print(f"Skipped {col_name} (might already exist): {e}")

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
