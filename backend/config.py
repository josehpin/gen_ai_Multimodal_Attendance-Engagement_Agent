import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in backend or root
env_path = Path(__file__).resolve().parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    root_env = Path(__file__).resolve().parent.parent / '.env'
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)

class Config:
    BASE_DIR = Path(__file__).resolve().parent
    INSTANCE_DIR = BASE_DIR / 'instance'
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    DATABASE_PATH = INSTANCE_DIR / 'attendance.db'
    
    # AI / Gemini API
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash').strip()
    
    # Server / Upload limits
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 500 * 1024 * 1024))  # 500 MB
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # CV / Analytics parameters
    SAMPLE_RATE_SECONDS = float(os.getenv('SAMPLE_RATE_SECONDS', 1.0))  # Process frame every N seconds
    MOVEMENT_THRESHOLD = float(os.getenv('MOVEMENT_THRESHOLD', 5.0))    # Pixel change threshold
    ATTENDANCE_PRESENT_RATIO = float(os.getenv('ATTENDANCE_PRESENT_RATIO', 0.70))  # >=70% = Present
    ATTENDANCE_LATE_RATIO = float(os.getenv('ATTENDANCE_LATE_RATIO', 0.40))     # >=40% = Late/Partial

    @classmethod
    def init_app(cls):
        cls.INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
        cls.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
