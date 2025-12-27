import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.source import Source
from app.models.user import User
from app.auth import get_password_hash

def seed_data():
    db = SessionLocal()
    
    try:
        # 관리자 계정 생성
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin)
            print("✓ 관리자 계정 생성 (username: admin, password: admin123)")
        else:
            print("✓ 관리자 계정 이미 존재")
        
        # 울산광역시청 소스 추가
        ulsan_source = db.query(Source).filter(Source.name == "울산광역시청").first()
        if not ulsan_source:
            ulsan_source = Source(
                name="울산광역시청",
                type="generic_board",
                base_url="https://www.ulsan.go.kr",
                crawl_policy='{"list_url": "https://www.ulsan.go.kr/u/rep/bbs/list.ulsan?bbsId=BBS_0000000000000003&mId=001004001001000000"}',
                enabled=True
            )
            db.add(ulsan_source)
            print("✓ 울산광역시청 소스 추가")
        else:
            print("✓ 울산광역시청 소스 이미 존재")
        
        db.commit()
        print("\n초기 데이터 설정 완료!")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
