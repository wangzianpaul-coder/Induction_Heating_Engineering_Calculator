from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import zipfile
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET


NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}


def q(ns: str, tag: str) -> str:
    return "{%s}%s" % (NS[ns], tag)


def xml_root(z: zipfile.ZipFile, name: str):
    try:
        return ET.fromstring(z.read(name))
    except KeyError:
        return None


def rel_target(base: str, target: str) -> str:
    base_dir = PurePosixPath(base).parent
    parts = []
    for part in (base_dir / target).parts:
        if part == ".":
            continue
        if part == "..":
            if parts:
                parts.pop()
        else:
            parts.append(part)
    return "/".join(parts)


def rels_for(z: zipfile.ZipFile, part: str):
    pp = PurePosixPath(part)
    relname = str(pp.parent / "_rels" / (pp.name + ".rels"))
    root = xml_root(z, relname)
    out = {}
    if root is not None:
        for el in root:
            out[el.attrib.get("Id")] = {
                "target": rel_target(part, el.attrib.get("Target", "")),
                "type": el.attrib.get("Type", ""),
                "target_mode": el.attrib.get("TargetMode"),
            }
    return out


def text_of(el):
    if el is None:
        return ""
    return "".join(t.text or "" for t in el.iter() if t.tag.endswith("}t") or t.tag == "t")


def parse_shared_strings(z):
    root = xml_root(z, "xl/sharedStrings.xml")
    if root is None:
        return []
    return [text_of(si) for si in root.findall(q("m", "si"))]


def parse_styles(z):
    root = xml_root(z, "xl/styles.xml")
    if root is None:
        return {"custom_numfmts": {}, "cell_xfs": []}
    custom = {}
    numfmts = root.find(q("m", "numFmts"))
    if numfmts is not None:
        for nf in numfmts:
            custom[nf.attrib.get("numFmtId")] = nf.attrib.get("formatCode")
    xfs = []
    cellxfs = root.find(q("m", "cellXfs"))
    if cellxfs is not None:
        for xf in cellxfs:
            xfs.append(dict(xf.attrib))
    return {"custom_numfmts": custom, "cell_xfs": xfs}


def parse_comments(z, part, shared_authors=None):
    root = xml_root(z, part)
    if root is None:
        return []
    authors_el = root.find(q("m", "authors"))
    authors = [] if authors_el is None else [a.text or "" for a in authors_el]
    comments = []
    cl = root.find(q("m", "commentList"))
    if cl is not None:
        for c in cl:
            aid = int(c.attrib.get("authorId", 0))
            comments.append({
                "ref": c.attrib.get("ref"),
                "author": authors[aid] if aid < len(authors) else str(aid),
                "text": text_of(c.find(q("m", "text"))),
            })
    return comments


def anchor_point(el):
    if el is None:
        return None
    return {
        "col": int(el.findtext(q("xdr", "col"), "0")),
        "col_off": int(el.findtext(q("xdr", "colOff"), "0")),
        "row": int(el.findtext(q("xdr", "row"), "0")),
        "row_off": int(el.findtext(q("xdr", "rowOff"), "0")),
    }


def parse_drawing(z, part):
    root = xml_root(z, part)
    if root is None:
        return []
    rels = rels_for(z, part)
    items = []
    for idx, anc in enumerate(list(root), 1):
        kind = anc.tag.split("}")[-1]
        fr = anchor_point(anc.find(q("xdr", "from")))
        to = anchor_point(anc.find(q("xdr", "to")))
        ext = anc.find(q("xdr", "ext"))
        pic = anc.find(q("xdr", "pic"))
        shape = anc.find(q("xdr", "sp"))
        frame = anc.find(q("xdr", "graphicFrame"))
        item = {"index": idx, "anchor_kind": kind, "from": fr, "to": to}
        if ext is not None:
            item["extent_emu"] = {"cx": int(ext.attrib.get("cx", 0)), "cy": int(ext.attrib.get("cy", 0))}
        obj = pic or shape or frame
        if pic is not None:
            item["object_kind"] = "picture"
            nv = pic.find(".//" + q("xdr", "cNvPr"))
            if nv is not None:
                item["name"] = nv.attrib.get("name")
                item["descr"] = nv.attrib.get("descr")
                item["title"] = nv.attrib.get("title")
            blip = pic.find(".//" + q("a", "blip"))
            if blip is not None:
                rid = blip.attrib.get(q("r", "embed")) or blip.attrib.get(q("r", "link"))
                item["relationship_id"] = rid
                item["target"] = rels.get(rid, {}).get("target")
        elif frame is not None:
            item["object_kind"] = "graphicFrame"
            nv = frame.find(".//" + q("xdr", "cNvPr"))
            if nv is not None:
                item["name"] = nv.attrib.get("name")
            item["xml"] = ET.tostring(frame, encoding="unicode")[:1000]
        elif shape is not None:
            item["object_kind"] = "shape"
            nv = shape.find(".//" + q("xdr", "cNvPr"))
            if nv is not None:
                item["name"] = nv.attrib.get("name")
            item["text"] = text_of(shape)
        else:
            item["object_kind"] = kind
        items.append(item)
    return items


def parse_cell(c, shared, styles):
    ref = c.attrib.get("r")
    typ = c.attrib.get("t")
    style_id = int(c.attrib.get("s", 0))
    f = c.find(q("m", "f"))
    v = c.find(q("m", "v"))
    inline = c.find(q("m", "is"))
    raw = None if v is None else v.text
    value = raw
    if typ == "s" and raw is not None:
        try:
            value = shared[int(raw)]
        except Exception:
            pass
    elif typ == "inlineStr":
        value = text_of(inline)
    elif typ == "b" and raw is not None:
        value = raw == "1"
    elif typ in (None, "n") and raw is not None:
        try:
            value = float(raw)
            if value.is_integer():
                value = int(value)
        except Exception:
            pass
    xf = styles["cell_xfs"][style_id] if style_id < len(styles["cell_xfs"]) else {}
    return {
        "ref": ref,
        "type": typ,
        "style_id": style_id,
        "numFmtId": xf.get("numFmtId"),
        "value": value,
        "cached_raw": raw,
        "formula": None if f is None else (f.text or ""),
        "formula_attrs": {} if f is None else dict(f.attrib),
    }


def parse_sheet(z, name, part, shared, styles):
    root = xml_root(z, part)
    rels = rels_for(z, part)
    cells = []
    rows = []
    hidden_cols = []
    drawings = []
    comments = []
    if root is None:
        return {"name": name, "part": part, "error": "missing XML"}
    dim = root.find(q("m", "dimension"))
    sheet_data = root.find(q("m", "sheetData"))
    if sheet_data is not None:
        for row in sheet_data:
            rinfo = dict(row.attrib)
            rows.append(rinfo)
            for c in row.findall(q("m", "c")):
                cells.append(parse_cell(c, shared, styles))
    cols = root.find(q("m", "cols"))
    if cols is not None:
        for col in cols:
            if col.attrib.get("hidden") == "1":
                hidden_cols.append(dict(col.attrib))
    drawing_el = root.find(q("m", "drawing"))
    if drawing_el is not None:
        rid = drawing_el.attrib.get(q("r", "id"))
        dpart = rels.get(rid, {}).get("target")
        drawings = parse_drawing(z, dpart) if dpart else []
    for rid, rel in rels.items():
        if rel["type"].endswith("/comments"):
            comments.extend(parse_comments(z, rel["target"]))
    dvs = []
    dve = root.find(q("m", "dataValidations"))
    if dve is not None:
        for dv in dve:
            rec = dict(dv.attrib)
            for child in dv:
                rec[child.tag.split("}")[-1]] = child.text
            dvs.append(rec)
    cfs = []
    for cf in root.findall(q("m", "conditionalFormatting")):
        cfs.append({"sqref": cf.attrib.get("sqref"), "rules": [dict(x.attrib) for x in cf]})
    hyperlinks = []
    hle = root.find(q("m", "hyperlinks"))
    if hle is not None:
        for hl in hle:
            x = dict(hl.attrib)
            rid = x.get(q("r", "id"))
            if rid:
                x["target"] = rels.get(rid)
            hyperlinks.append(x)
    merges = []
    me = root.find(q("m", "mergeCells"))
    if me is not None:
        merges = [x.attrib.get("ref") for x in me]
    protections = root.find(q("m", "sheetProtection"))
    af = root.find(q("m", "autoFilter"))
    tables = [rel for rel in rels.values() if rel["type"].endswith("/table")]
    extlinks = [rel for rel in rels.values() if rel.get("target_mode") == "External"]
    return {
        "name": name,
        "part": part,
        "dimension": None if dim is None else dim.attrib.get("ref"),
        "cells": cells,
        "row_attributes": rows,
        "hidden_rows": [r for r in rows if r.get("hidden") == "1"],
        "hidden_columns": hidden_cols,
        "merges": merges,
        "data_validations": dvs,
        "conditional_formatting": cfs,
        "hyperlinks": hyperlinks,
        "drawing_objects": drawings,
        "comments": comments,
        "protection": None if protections is None else dict(protections.attrib),
        "auto_filter": None if af is None else dict(af.attrib),
        "tables": tables,
        "external_relationships": extlinks,
        "relationships": rels,
    }


def audit(path: Path):
    data = {
        "path": str(path),
        "bytes": path.stat().st_size,
        "mtime": path.stat().st_mtime,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest().upper(),
    }
    with zipfile.ZipFile(path) as z:
        data["parts"] = [{"name": i.filename, "size": i.file_size, "compressed": i.compress_size} for i in z.infolist()]
        shared = parse_shared_strings(z)
        styles = parse_styles(z)
        wb = xml_root(z, "xl/workbook.xml")
        wbrels = rels_for(z, "xl/workbook.xml")
        sheets = []
        sheet_el = wb.find(q("m", "sheets")) if wb is not None else None
        if sheet_el is not None:
            for s in sheet_el:
                rid = s.attrib.get(q("r", "id"))
                sheets.append({
                    "name": s.attrib.get("name"),
                    "sheetId": s.attrib.get("sheetId"),
                    "state": s.attrib.get("state", "visible"),
                    "relationship_id": rid,
                    "part": wbrels.get(rid, {}).get("target"),
                })
        calc = wb.find(q("m", "calcPr")) if wb is not None else None
        wbpr = wb.find(q("m", "workbookPr")) if wb is not None else None
        names = []
        dne = wb.find(q("m", "definedNames")) if wb is not None else None
        if dne is not None:
            for n in dne:
                x = dict(n.attrib)
                x["formula"] = n.text
                names.append(x)
        data["workbook"] = {
            "calcPr": None if calc is None else dict(calc.attrib),
            "workbookPr": None if wbpr is None else dict(wbpr.attrib),
            "defined_names": names,
            "sheets": sheets,
            "external_relationships": [r for r in wbrels.values() if r.get("target_mode") == "External" or "externalLink" in r.get("type", "")],
        }
        data["sheets"] = [parse_sheet(z, s["name"], s["part"], shared, styles) for s in sheets]
        data["media"] = []
        for i in z.infolist():
            if i.filename.startswith("xl/media/") and not i.is_dir():
                b = z.read(i.filename)
                data["media"].append({"part": i.filename, "bytes": len(b), "sha256": hashlib.sha256(b).hexdigest().upper()})
        data["external_link_parts"] = [x.filename for x in z.infolist() if x.filename.startswith("xl/externalLinks/")]
        data["custom_xml_parts"] = [x.filename for x in z.infolist() if x.filename.startswith("customXml/") or x.filename.startswith("xl/custom")]
        data["macros"] = [x.filename for x in z.infolist() if "vbaProject" in x.filename]
        data["embedded_objects"] = [x.filename for x in z.infolist() if x.filename.startswith("xl/embeddings/")]
        for prop_part in ("docProps/core.xml", "docProps/app.xml", "docProps/custom.xml"):
            root = xml_root(z, prop_part)
            data[prop_part] = None if root is None else ET.tostring(root, encoding="unicode")
    return data


def norm_formula(f):
    if not f:
        return None
    f = re.sub(r"\$", "", f.upper())
    f = re.sub(r"\s+", "", f)
    return f


def summary(data):
    formulas = []
    for s in data["sheets"]:
        for c in s.get("cells", []):
            if c.get("formula") is not None:
                formulas.append((s["name"], c["ref"], c["formula"], c["value"]))
    return {
        "path": data["path"],
        "bytes": data["bytes"],
        "sha256": data["sha256"],
        "sheets": [{
            "name": s["name"],
            "state": next((x["state"] for x in data["workbook"]["sheets"] if x["name"] == s["name"]), None),
            "dimension": s.get("dimension"),
            "populated_cells": sum(1 for c in s.get("cells", []) if c.get("value") is not None or c.get("formula") is not None),
            "formula_cells": sum(1 for c in s.get("cells", []) if c.get("formula") is not None),
            "comments": len(s.get("comments", [])),
            "drawings": len(s.get("drawing_objects", [])),
            "hidden_rows": len(s.get("hidden_rows", [])),
            "hidden_columns": len(s.get("hidden_columns", [])),
            "data_validations": len(s.get("data_validations", [])),
            "conditional_formattings": len(s.get("conditional_formatting", [])),
        } for s in data["sheets"]],
        "formula_count": len(formulas),
        "normalized_formula_counter": collections.Counter(norm_formula(x[2]) for x in formulas),
        "media_count": len(data.get("media", [])),
        "external_links": data["workbook"]["external_relationships"] + data.get("external_link_parts", []),
        "defined_names": data["workbook"]["defined_names"],
        "macros": data.get("macros"),
        "embedded_objects": data.get("embedded_objects"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--out", required=True)
    ns = ap.parse_args()
    out = Path(ns.out)
    out.mkdir(parents=True, exist_ok=True)
    index = []
    for pstr in ns.paths:
        p = Path(pstr)
        data = audit(p)
        stem = re.sub(r"[^\w\-.]+", "_", p.stem, flags=re.UNICODE)
        target = out / (stem + ".json")
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        s = summary(data)
        s["audit_json"] = str(target)
        index.append(s)
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
