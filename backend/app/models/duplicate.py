from sqlalchemy import Column, Integer, ForeignKey, Float
from app.database import Base


class Duplicate(Base):
    __tablename__ = "duplicates"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    duplicate_of_item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    similarity = Column(Float)  # 0.0 to 1.0
