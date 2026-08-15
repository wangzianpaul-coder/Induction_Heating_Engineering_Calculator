import argparse
from pathlib import Path

from pypdf import PdfReader


parser = argparse.ArgumentParser()
parser.add_argument("pdf")
parser.add_argument("output")
args = parser.parse_args()

reader = PdfReader(args.pdf)
pieces = []
for page_number, page in enumerate(reader.pages, 1):
    try:
        text = page.extract_text() or ""
    except Exception as exc:
        text = f"[EXTRACTION ERROR: {exc}]"
    pieces.append(f"\n\n===== PDF PAGE {page_number} =====\n\n{text}")

Path(args.output).write_text("".join(pieces), encoding="utf-8")
