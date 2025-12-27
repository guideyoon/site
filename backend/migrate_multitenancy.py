import sys
import os
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta, timezone

# Add backend to path to import settings
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.config import settings

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("Starting manual migration...")
        
        # 1. Add expires_at to users
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;"))
            print("Added expires_at to users table.")
        except Exception as e:
            print(f"Note: Could not add expires_at to users (maybe exists): {e}")

        # 2. Add user_id to sources
        try:
            conn.execute(text("ALTER TABLE sources ADD COLUMN user_id INTEGER REFERENCES users(id);"))
            print("Added user_id to sources table.")
        except Exception as e:
            print(f"Note: Could not add user_id to sources: {e}")

        # 3. Add user_id to items
        try:
            conn.execute(text("ALTER TABLE items ADD COLUMN user_id INTEGER REFERENCES users(id);"))
            print("Added user_id to items table.")
        except Exception as e:
            print(f"Note: Could not add user_id to items: {e}")

        # 4. Assign existing data to the first admin
        first_user = conn.execute(text("SELECT id FROM users ORDER BY id ASC LIMIT 1;")).fetchone()
        if first_user:
            user_id = first_user[0]
            print(f"Assigning existing data to user ID: {user_id}")
            
            conn.execute(text(f"UPDATE sources SET user_id = {user_id} WHERE user_id IS NULL;"))
            conn.execute(text(f"UPDATE items SET user_id = {user_id} WHERE user_id IS NULL;"))
            
            # Set default expires_at for existing users (1 year from now)
            exp_date = datetime.now(timezone.utc) + timedelta(days=365)
            conn.execute(text(f"UPDATE users SET expires_at = '{exp_date.isoformat()}' WHERE expires_at IS NULL;"))
            
            conn.commit()
            print("Migration completed successfully.")
        else:
            print("No users found to assign data to.")

if __name__ == "__main__":
    migrate()
