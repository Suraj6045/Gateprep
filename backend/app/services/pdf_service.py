"""
PDF Question Extractor
======================
Supports three GATE question types:
  - MCQ  (Single correct, 4 options, negative marking)
  - MSQ  (Multiple correct, 4 options, no negative)
  - NAT  (Numerical, no options, no negative)

Expected PDF format (heuristic parser):
  Q.1  What is the time complexity of ...?          [MCQ]
  (A) O(n)   (B) O(log n)   (C) O(n²)   (D) O(1)
  Answer: B

  Q.2  Which of the following are correct?           [MSQ]
  (A) ...  (B) ...  (C) ...  (D) ...
  Answer: A,C

  Q.3  The value of x is ___                        [NAT]
  Answer: 42  (or Answer: 41.5-42.5 for range)

Marks format (optional, default 1/2 marks):
  [2 marks]  or  (1 mark)
"""

import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Default marks by question type
DEFAULT_MARKS = {"mcq": 1.0, "msq": 2.0, "nat": 2.0}
DEFAULT_NEGATIVE = {"mcq": 0.33, "msq": 0.0, "nat": 0.0}


def extract_questions_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """Main entry point — tries pdfplumber then PyMuPDF."""
    text = _extract_text(pdf_path)
    if not text.strip():
        logger.error("Could not extract any text from PDF")
        return []

    questions = _parse_gate_questions(text)
    logger.info(f"Extracted {len(questions)} questions from {pdf_path}")
    return questions


def _extract_text(pdf_path: str) -> str:
    """Try pdfplumber first, fall back to PyMuPDF."""
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
            text = "\n".join(pages)
            if text.strip():
                return text
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    try:
        import fitz
        doc = fitz.open(pdf_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    except Exception as e:
        logger.warning(f"PyMuPDF failed: {e}")

    return ""


def _detect_question_type(q_text: str, options: List[str], answer: str) -> str:
    """Detect question type from context clues."""
    lower = q_text.lower()
    # NAT: no options, numerical answer
    if not options and _is_numeric(answer.split("-")[0]):
        return "nat"
    # NAT keyword hints
    if any(k in lower for k in ["blank", "___", "value of", "equal to _", "find the"]):
        if not options:
            return "nat"
    # MSQ: multiple answers
    if "," in answer and all(c.strip() in "ABCD" for c in answer.split(",")):
        return "msq"
    # MSQ keyword hints
    if any(k in lower for k in ["which of the following are", "select all", "multiple correct"]):
        return "msq"
    return "mcq"


def _is_numeric(s: str) -> bool:
    try:
        float(s.strip())
        return True
    except (ValueError, AttributeError):
        return False


def _parse_marks(line: str) -> float:
    """Extract marks value from text like '[2 marks]' or '(1 mark)'."""
    m = re.search(r'[\[(](\d+(?:\.\d+)?)\s*marks?[\])]', line, re.IGNORECASE)
    return float(m.group(1)) if m else 0


def _parse_gate_questions(text: str) -> List[Dict[str, Any]]:
    """
    Parse the full PDF text into structured question dicts.
    Handles varied formatting with multiple heuristic passes.
    """
    questions = []

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")

    # ── Strategy 1: Block-based parsing (Q.N / Question N pattern) ──
    # Split on question boundaries
    q_boundary = re.compile(
        r'^(?:Q\.?\s*(\d+)|Question\s+(\d+))[.):\s]',
        re.IGNORECASE
    )

    blocks = []
    current_block = []
    current_num = None

    for line in lines:
        m = q_boundary.match(line.strip())
        if m:
            if current_block:
                blocks.append((current_num, "\n".join(current_block)))
            current_num = int(m.group(1) or m.group(2))
            # Remove the Q.N prefix from the line
            cleaned = q_boundary.sub("", line.strip()).strip()
            current_block = [cleaned] if cleaned else []
        else:
            if current_block is not None:
                current_block.append(line)

    if current_block:
        blocks.append((current_num, "\n".join(current_block)))

    for q_num, block in blocks:
        parsed = _parse_question_block(block, q_num)
        if parsed:
            questions.append(parsed)

    # ── Strategy 2: Fallback — numbered list without Q. prefix ──
    if not questions:
        questions = _parse_numbered_list(text)

    return questions


def _parse_question_block(block: str, q_num: int) -> Dict[str, Any]:
    """Parse a single question block into a structured dict."""
    lines = [l.strip() for l in block.strip().split("\n") if l.strip()]
    if not lines:
        return None

    # Option patterns: (A) / A) / A. / [A]
    option_pat = re.compile(r'^[(\[]?([A-Da-d])[)\].][\s]+(.+)', re.DOTALL)
    # Answer line
    answer_pat = re.compile(r'^(?:Ans(?:wer)?|Correct)[.:)]\s*(.+)', re.IGNORECASE)
    # Marks
    marks_pat = re.compile(r'[\[(](\d+(?:\.\d+)?)\s*marks?[\])]', re.IGNORECASE)

    question_lines = []
    options = []
    answer = None
    marks_val = 0

    i = 0
    # Collect question text (lines before first option/answer)
    while i < len(lines):
        line = lines[i]
        if option_pat.match(line) or answer_pat.match(line):
            break
        # Check for marks annotation
        mm = marks_pat.search(line)
        if mm:
            marks_val = float(mm.group(1))
            # Remove marks annotation from question text
            line = marks_pat.sub("", line).strip()
        if line:
            question_lines.append(line)
        i += 1

    # Collect options
    while i < len(lines):
        line = lines[i]
        om = option_pat.match(line)
        if om:
            options.append(om.group(2).strip())
            i += 1
        elif answer_pat.match(line):
            break
        else:
            # Might be continuation of last option
            if options:
                options[-1] += " " + line
            i += 1

    # Extract answer
    while i < len(lines):
        line = lines[i]
        am = answer_pat.match(line)
        if am:
            answer = am.group(1).strip().rstrip(".")
            break
        i += 1

    if not question_lines:
        return None

    question_text = " ".join(question_lines).strip()
    q_type = _detect_question_type(question_text, options, answer or "")

    if not marks_val:
        marks_val = DEFAULT_MARKS.get(q_type, 1.0)

    neg_marks = DEFAULT_NEGATIVE.get(q_type, 0.33)

    # Normalize answer: uppercase letters
    if answer:
        answer = answer.upper().replace(" ", "")
    else:
        answer = "A"  # fallback

    return {
        "question_type": q_type,
        "question_text": question_text,
        "options": options[:4] if options else [],
        "correct_answer": answer,
        "marks": marks_val,
        "negative_marks": neg_marks,
    }


def _parse_numbered_list(text: str) -> List[Dict[str, Any]]:
    """Fallback: simple numbered list parser for 1. / 1) style."""
    questions = []
    pattern = re.compile(r'(\d+)[.)]\s+(.+?)(?=\d+[.)]\s+|\Z)', re.DOTALL)

    for m in pattern.finditer(text):
        block = m.group(2)
        parsed = _parse_question_block(block, int(m.group(1)))
        if parsed:
            questions.append(parsed)

    return questions


def validate_json_questions(data: list) -> List[Dict[str, Any]]:
    """
    Validate and normalize manually-uploaded JSON questions.
    Ensures all required fields are present with sensible defaults.
    """
    normalized = []
    for i, q in enumerate(data):
        q_type = q.get("question_type", "mcq").lower()
        if q_type not in ("mcq", "msq", "nat"):
            q_type = "mcq"

        normalized.append({
            "question_type": q_type,
            "question_text": str(q.get("question_text", "")).strip(),
            "options": q.get("options", []),
            "correct_answer": str(q.get("correct_answer", "A")).strip().upper(),
            "marks": float(q.get("marks", DEFAULT_MARKS[q_type])),
            "negative_marks": float(q.get("negative_marks", DEFAULT_NEGATIVE[q_type])),
            "subject": q.get("subject"),
            "topic": q.get("topic"),
        })

    return [q for q in normalized if q["question_text"]]
