from pathlib import Path
from pypdf import PdfReader

roots = [
    Path(r"C:\Users\王小明\.codex\.chatgpt-projects\g-p-69b7592c94888191b183b282c07ab94d\sources"),
    Path(r"C:\Users\王小明\OneDrive - UNSW\桌面\职称论文\电磁感应项目\有关文献"),
]

for root in roots:
    print(f"ROOT\t{root}")
    for path in sorted(root.glob("*.pdf")):
        try:
            reader = PdfReader(str(path))
            page_lengths = []
            for page in reader.pages:
                try:
                    page_lengths.append(len(page.extract_text() or ""))
                except Exception:
                    page_lengths.append(-1)
            print(
                f"{path.name}\t{len(reader.pages)}\t"
                f"{sum(x for x in page_lengths if x > 0)}\t"
                f"{sum(1 for x in page_lengths if x > 50)}"
            )
        except Exception as exc:
            print(f"ERROR\t{path.name}\t{exc}")
