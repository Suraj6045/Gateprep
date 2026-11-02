import logging
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
KATEX_DIR = STATIC_DIR / "katex"
FONTS_DIR = STATIC_DIR / "fonts"


def _read_file_safe(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8")
    logger.warning("Expected static asset not found at %s", path)
    return ""


@lru_cache(maxsize=1)
def _load_static_assets() -> Dict[str, str]:
    """
    Read static KaTeX and font assets into memory once.
    Cached for the lifetime of the process.
    """
    katex_css = _read_file_safe(KATEX_DIR / "katex-inline.css")
    fonts_css = _read_file_safe(FONTS_DIR / "fonts-inline.css")
    katex_js = _read_file_safe(KATEX_DIR / "katex.min.js")
    katex_autorender_js = _read_file_safe(KATEX_DIR / "auto-render.min.js")

    return {
        "katex_css": katex_css,
        "fonts_css": fonts_css,
        "katex_js": katex_js,
        "katex_autorender_js": katex_autorender_js,
    }


def _format_datetime(value: Any) -> str:
    if not value:
        return "-"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return value
    if hasattr(value, "strftime"):
        return value.strftime("%d %b %Y, %I:%M %p UTC")
    return str(value)


@lru_cache(maxsize=1)
def _get_jinja_env() -> Environment:
    """
    Initialize and cache Jinja2 environment.
    """
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["format_datetime"] = _format_datetime
    return env


def generate_result_html(payload: dict) -> str:
    """
    Render a self-contained, offline-ready HTML result report
    with base64 inlined KaTeX math and branded typography.
    """
    env = _get_jinja_env()
    template = env.get_template("result_report.html")
    assets = _load_static_assets()

    generated_at = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p UTC")

    return template.render(
        payload=payload,
        katex_css=assets["katex_css"],
        fonts_css=assets["fonts_css"],
        katex_js=assets["katex_js"],
        katex_autorender_js=assets["katex_autorender_js"],
        generated_at=generated_at,
    )
