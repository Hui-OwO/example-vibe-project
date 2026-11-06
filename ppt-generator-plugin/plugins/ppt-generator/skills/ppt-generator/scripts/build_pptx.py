#!/usr/bin/env python
"""구조화된 슬라이드 JSON을 받아 .pptx 발표자료를 생성한다.

이 스크립트의 역할은 "디자인"이 아니라 "결정적인 변환"이다. 슬라이드의 내용
(제목·핵심 메시지·본문·발표자 노트)을 정하는 일은 Claude가 SKILL.md의 절차에
따라 끝낸 뒤, 그 결과를 아래 JSON 스키마로 넘기면 이 스크립트가 매번 동일하고
안정적인 방식으로 .pptx 파일을 찍어낸다. 그래서 폰트·레이아웃 같은 세부는 여기서
한 번만 잘 처리하고, Claude는 내용에만 집중하면 된다.

입력 JSON 스키마
----------------
{
  "meta": {
    "title":      "발표 제목 (필수)",
    "subtitle":   "부제 (선택)",
    "author":     "발표자 (선택)",
    "audience":   "대상 청중 (선택, 메모용)",
    "duration_min": 15,            # 발표 시간(분), 선택
    "tone":       "톤 (선택, 메모용)"
  },
  "slides": [
    {
      "layout":  "title" | "section" | "content" | "closing",  # 기본 content
      "title":   "슬라이드 제목 (필수)",
      "key_message": "이 슬라이드가 남길 한 문장 (선택, 굵게 표시)",
      "bullets": ["본문 항목", ["하위 항목은 중첩 리스트로", "..."], "..."],
      "notes":   "발표자 노트 (선택)"
    }
  ]
}

사용법
------
    python build_pptx.py deck.json [-o 출력경로.pptx]

-o 를 생략하면 meta.title 기반으로 파일명을 만든다.
python-pptx 가 없으면 자동으로 설치를 시도한다.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def _ensure_pptx():
    """python-pptx 를 import 한다. 없으면 한 번 설치를 시도한다."""
    try:
        import pptx  # noqa: F401
        return
    except ImportError:
        pass
    print("python-pptx 가 없어 설치를 시도합니다...", file=sys.stderr)
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "python-pptx"],
        check=True,
    )


def _slugify(text: str) -> str:
    text = text.strip() or "presentation"
    # 파일명에 못 쓰는 문자를 정리하고 공백은 하이픈으로
    text = re.sub(r'[\\/:*?"<>|]+', "", text)
    text = re.sub(r"\s+", "-", text)
    return text[:60]


def _add_notes(slide, notes: str):
    if not notes:
        return
    slide.notes_slide.notes_text_frame.text = notes


def _add_bullets(body_frame, bullets, level=0):
    """중첩 리스트를 들여쓰기 레벨로 변환해 본문에 채운다."""
    for item in bullets:
        if isinstance(item, (list, tuple)):
            _add_bullets(body_frame, item, level + 1)
            continue
        if body_frame.paragraphs[0].text == "" and not body_frame.paragraphs[0].runs:
            p = body_frame.paragraphs[0]
        else:
            p = body_frame.add_paragraph()
        p.text = str(item)
        p.level = min(level, 4)


def build(deck: dict, out_path: Path) -> Path:
    from pptx import Presentation
    from pptx.util import Pt

    prs = Presentation()
    meta = deck.get("meta", {})
    slides = deck.get("slides", [])

    title_layout = prs.slide_layouts[0]     # Title Slide
    section_layout = prs.slide_layouts[2]   # Section Header
    content_layout = prs.slide_layouts[1]   # Title and Content
    blank_closing = prs.slide_layouts[2]

    # --- 표지 ---
    cover = prs.slides.add_slide(title_layout)
    cover.shapes.title.text = meta.get("title", "발표자료")
    sub_parts = []
    if meta.get("subtitle"):
        sub_parts.append(meta["subtitle"])
    if meta.get("author"):
        sub_parts.append(meta["author"])
    if sub_parts and len(cover.placeholders) > 1:
        cover.placeholders[1].text = "\n".join(sub_parts)
    notes_bits = []
    for k in ("audience", "duration_min", "tone"):
        if meta.get(k):
            label = {"audience": "청중", "duration_min": "발표시간(분)", "tone": "톤"}[k]
            notes_bits.append(f"{label}: {meta[k]}")
    _add_notes(cover, " / ".join(notes_bits))

    # --- 본문 슬라이드 ---
    for s in slides:
        layout_name = s.get("layout", "content")
        if layout_name == "title":
            slide = prs.slides.add_slide(title_layout)
            slide.shapes.title.text = s.get("title", "")
            if s.get("key_message") and len(slide.placeholders) > 1:
                slide.placeholders[1].text = s["key_message"]
            _add_notes(slide, s.get("notes", ""))
            continue

        if layout_name == "section":
            slide = prs.slides.add_slide(section_layout)
            slide.shapes.title.text = s.get("title", "")
            if s.get("key_message") and len(slide.placeholders) > 1:
                slide.placeholders[1].text = s["key_message"]
            _add_notes(slide, s.get("notes", ""))
            continue

        # content / closing 공통: 제목 + 본문
        layout = content_layout if layout_name != "closing" else blank_closing
        slide = prs.slides.add_slide(layout)
        slide.shapes.title.text = s.get("title", "")

        # 본문 플레이스홀더 찾기 (idx 1 이 보통 본문)
        body = None
        for ph in slide.placeholders:
            if ph.placeholder_format.idx != 0:
                body = ph
                break

        if body is not None:
            tf = body.text_frame
            tf.word_wrap = True
            # 핵심 메시지를 맨 위에 굵게
            if s.get("key_message"):
                p0 = tf.paragraphs[0]
                p0.text = s["key_message"]
                for run in p0.runs:
                    run.font.bold = True
                    run.font.size = Pt(20)
            bullets = s.get("bullets", [])
            if bullets:
                if s.get("key_message"):
                    # 핵심 메시지 다음 줄부터 본문
                    sub = tf.add_paragraph()
                    sub.text = str(bullets[0]) if not isinstance(bullets[0], (list, tuple)) else ""
                    if isinstance(bullets[0], (list, tuple)):
                        _add_bullets(tf, bullets[0], 1)
                    _add_bullets(tf, bullets[1:], 0)
                else:
                    _add_bullets(tf, bullets, 0)

        _add_notes(slide, s.get("notes", ""))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out_path))
    return out_path


def main():
    ap = argparse.ArgumentParser(description="구조화된 JSON으로 .pptx 생성")
    ap.add_argument("deck_json", help="슬라이드 구조 JSON 파일 경로")
    ap.add_argument("-o", "--out", help="출력 .pptx 경로", default=None)
    args = ap.parse_args()

    _ensure_pptx()

    deck = json.loads(Path(args.deck_json).read_text(encoding="utf-8"))

    if args.out:
        out_path = Path(args.out)
    else:
        title = deck.get("meta", {}).get("title", "presentation")
        out_path = Path(f"{_slugify(title)}.pptx")

    saved = build(deck, out_path)
    n = len(deck.get("slides", [])) + 1  # 표지 포함
    print(f"OK: {saved}  ({n} slides)")


if __name__ == "__main__":
    main()
