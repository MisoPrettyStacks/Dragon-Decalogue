"""Source-bundle builder: zips the entire running application, in memory."""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Iterator, List, Tuple

APP_ROOT = Path(__file__).resolve().parent.parent.parent

INCLUDE_DIRS = [
    "backend",
    "frontend/src",
    "frontend/public",
]

INCLUDE_FILES = [
    "README.md",
]

EXCLUDE_PARTS = {
    "node_modules",
    "__pycache__",
    ".git",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    "dist",
}

EXCLUDE_SUFFIXES = {".pyc", ".pyo", ".log", ".lock", ".ico"}
EXCLUDE_NAMES = {".env", "yarn.lock", "package-lock.json"}


def _eligible(path: Path) -> bool:
    if not path.is_file():
        return False
    if any(part in EXCLUDE_PARTS for part in path.parts):
        return False
    if path.name in EXCLUDE_NAMES:
        return False
    if path.suffix in EXCLUDE_SUFFIXES:
        return False
    try:
        if path.stat().st_size > 2_000_000:
            return False
    except OSError:
        return False
    return True


def collect() -> List[Tuple[Path, str]]:
    seen: set[str] = set()
    out: List[Tuple[Path, str]] = []
    for rel in INCLUDE_FILES:
        p = APP_ROOT / rel
        if p.exists() and _eligible(p) and rel not in seen:
            seen.add(rel)
            out.append((p, rel))
    for d in INCLUDE_DIRS:
        base = APP_ROOT / d
        if not base.exists():
            continue
        for p in sorted(base.rglob("*")):
            if not _eligible(p):
                continue
            rel = str(p.relative_to(APP_ROOT))
            if rel in seen:
                continue
            seen.add(rel)
            out.append((p, rel))
    return out


def manifest_text(files: List[Tuple[Path, str]], report: dict) -> str:
    lines = [
        "DragonflyDecalogue — Full Source Bundle",
        "=" * 44,
        "",
        "A dragonfly has ~30,000 lenses per eye. This engine has eight, pooled in",
        "log-odds space and extremized. Everything needed to reproduce the number",
        "below is in this archive — no API keys, no paid services, no network.",
        "",
        f"Certified Brier score : {report['brier_score']}",
        f"Target band           : {report['target_band'][0]} – {report['target_band'][1]}",
        f"Within band           : {report['within_target']}",
        f"Brier skill score     : {report['brier_skill_score']}",
        f"Benchmark             : {report['n_questions']} resolved questions, seed {report['seed']}",
        "",
        "Reproduce:",
        "  cd backend",
        "  pip install -r requirements.txt",
        "  python -c \"from lib.benchmark import calibration_report; print(calibration_report()['brier_score'])\"",
        "",
        "Key files:",
        "  backend/lib/engine.py     — the eight agents + log-odds aggregation",
        "  backend/lib/benchmark.py  — deterministic resolved corpus + Brier decomposition",
        "  backend/weights.json      — tuned agent weights and extremizing exponent",
        "  backend/lib/decalogue.py  — the eleven commandments",
        "",
        f"Files in this archive ({len(files)}):",
    ]
    lines += [f"  {rel}" for _, rel in files]
    lines.append("")
    return "\n".join(lines)


def build_zip() -> bytes:
    from lib.benchmark import benchmark_rows, calibration_report

    report = calibration_report()
    files = collect()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for path, rel in files:
            try:
                z.write(path, f"dragonfly-decalogue/{rel}")
            except OSError:
                continue
        z.writestr("dragonfly-decalogue/MANIFEST.txt", manifest_text(files, report))
        z.writestr(
            "dragonfly-decalogue/calibration_report.json",
            json.dumps(report, indent=2),
        )
        z.writestr(
            "dragonfly-decalogue/benchmark_resolved_questions.json",
            json.dumps(benchmark_rows(), indent=2),
        )
    return buf.getvalue()


def iter_manifest() -> Iterator[str]:
    for _, rel in collect():
        yield rel
