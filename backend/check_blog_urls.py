from sqlalchemy import create_engine, text

POSTGRES_URL = "postgresql://navercafe:navercafe123@localhost:5432/navercafe"

def check_urls():
    engine = create_engine(POSTGRES_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, title, url FROM items WHERE source_id = 3 LIMIT 5"))
        for row in result:
            print(f"ID: {row[0]}")
            print(f"Title: {row[1]}")
            print(f"URL: {row[2]}")
            print("-" * 20)

if __name__ == "__main__":
    check_urls()
