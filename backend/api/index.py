import sys
from pathlib import Path

# api/ is a sibling of app/, not a parent — put the backend root on sys.path
# explicitly so this import resolves regardless of Vercel's working directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402
