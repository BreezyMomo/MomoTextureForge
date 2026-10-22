# Chinese and English repository documentation

<!-- doc-language -->
[简体中文](bilingual-documentation.md) · [English](bilingual-documentation.en.md)
<!-- /doc-language -->

Status: completed and verified.

1. Retain Chinese Markdown and add adjacent `.en.md` files without a documentation translation catalog.
2. Cover home, tutorials, technical references, maintenance instructions, plans and Skill references. Capture separate English UI screenshots with English callouts; share code and example projects.
3. Body links stay within the current edition. Top language switches deliberately cross editions. Keep code, keys, commands and formats unchanged.
4. The website's detailed guide uses Chinese for `zh-CN`, English otherwise, updating immediately on language switches.
5. Include both editions in Skill downloads and generate an English arrangement table.
6. Check pair coverage, relative links, anchors, routing and packs; rebuild and verify browser behavior.


## Validation

- 45 pairs / 90 Markdown files; 412 local links and section anchors validated.
- 326 unit tests passed, including English fallback for non-Chinese languages, equal generated numeric ranges and complete Skill references.
- Source/static language checks each passed 36 interface states, including immediate guide-link updates.
- Both Skills contain Chinese/English entries and references; the static website was rebuilt.

- The English manual uses 49 separate English UI captures with numbered callouts and English captions. Chinese images are retained. The standalone manager supports fixed language selection; real-browser checks confirm switching preserves index data and unsaved form input.
