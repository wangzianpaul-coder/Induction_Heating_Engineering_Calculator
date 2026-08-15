import argparse
import re
import sys
from pathlib import Path

from pypdf import PdfReader


parser = argparse.ArgumentParser()
parser.add_argument("pdf")
parser.add_argument("patterns", nargs="+")
args = parser.parse_args()
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

path = Path(args.pdf)
reader = PdfReader(str(path))
compiled = [re.compile(pattern, re.IGNORECASE) for pattern in args.patterns]

for page_number, page in enumerate(reader.pages, 1):
    try:
        text = page.extract_text() or ""
    except Exception as exc:
        print(f"PAGE {page_number}: extraction error: {exc}")
        continue
    flattened = " ".join(text.split())
    for pattern, regex in zip(args.patterns, compiled):
        match = regex.search(flattened)
        if match:
            start = max(0, match.start() - 180)
            end = min(len(flattened), match.end() + 320)
            print(f"PAGE {page_number} | {pattern} | {flattened[start:end]}")
