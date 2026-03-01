from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

db = os.environ["DATABASE_URL"]

try:
    engine = create_engine(db)
    conn = engine.connect()
    print("✅ Database connected successfully!")
    conn.close()
except Exception as e:
    print("❌ Connection failed:", e)