---
name: wf-wireframe
description: vibe-workflow 4단계(UI). 플로우차트의 화면 목록으로 저해상도 와이어프레임을 정적 HTML 로 만든다. 화면 간 링크로 플로우를 클릭해 볼 수 있다. "와이어프레임", "화면 설계", "레이아웃 잡아줘", "로우파이", "화면 초안" 요청에 사용한다.
---

# wf-wireframe — 4. 저해상도 와이어프레임 [UI]

시작 전 `${CLAUDE_PLUGIN_ROOT}/reference/stage-rules.md` 를 Read 하고 공통 절차를 따름. 단계 키: `wireframe`.

## 입력

- UX 플로우(`.workflow/03-flow.md`) — 화면 목록, 플로우
- 기능 명세(`.workflow/02-spec.md`) — 각 화면이 담아야 할 입력·결과

## 진행

1. `WFCTL new wireframe` 로 `04-wireframe/index.html`, `wireframe.css` 생성.
2. 화면 목록의 slug 마다 `WFCTL screen <slug> "<화면명>"`.
3. 각 화면 작성 규칙:
   - **저해상도만.** 회색 박스·점선·실제 문구 대신 역할 표기. 색·폰트·이미지·아이콘 금지. `wireframe.css` 클래스(`box`, `row`, `btn`, `input`)만 사용
   - 플로우의 이동을 `<a href="다음.html">` 로 연결 — 클릭으로 플로우를 따라갈 수 있어야 함
   - 관련 기능을 `../02-spec.md#f-xx` 로 링크
   - 주석은 3줄 이하: 이 화면에서 사용자가 하는 일
4. `index.html` 목록에 모든 화면을 링크.
5. 브라우저로 여는 방법(파일 경로)을 알려줌. 가능하면 직접 열어 깨진 링크가 없는지 확인.

## 완료

플로우의 모든 화면이 있고 링크가 이어지면 `status: done` → `WFCTL sync` → `/wf-wireframe-review`.
이 단계는 사용자 승인 없이 완료 가능. 승인은 5단계에서 받음.
