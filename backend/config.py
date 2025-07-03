import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # BD SQLite
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'db', 'database.sqlite3')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Carpeta de uploads
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

    # Para CORS (si necesitas cabeceras especiales)
    CORS_HEADERS = 'Content-Type'
