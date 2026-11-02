"""Export the FastAPI OpenAPI schema using a throwaway environment.

Run from backend/:  python -m app.scripts.export_openapi --out ../frontend/openapi.json
Never reads a real .env, never touches a real database, never starts the app.
"""
import argparse
import json
import os
import tempfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    out = Path(parser.parse_args().out).resolve()  # resolve BEFORE chdir

    original_cwd = os.getcwd()
    with tempfile.TemporaryDirectory() as tmp:
        os.chdir(tmp)  # empty cwd: no .env, no uploads/ written into the repo
        try:
            for key in [k for k in os.environ if k.startswith(("CLOUDINARY_", "REDIS_"))]:
                os.environ.pop(key)
            os.environ.update(  # assign, never setdefault: shell values must not win
                {
                    "DATABASE_URL": f"sqlite:///{Path(tmp, 'openapi.sqlite3').as_posix()}",
                    "SECRET_KEY": "openapi-export-throwaway-secret-key-32chars-min",
                    "CORS_ORIGINS": "http://127.0.0.1:5173",
                    "UPLOAD_DIR": Path(tmp, "uploads").as_posix(),
                }
            )
            from app.main import app

            schema = app.openapi()
        finally:
            os.chdir(original_cwd)  # leave tmp before cleanup (required on Windows)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
