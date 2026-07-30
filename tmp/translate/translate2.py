#!/usr/bin/env python3
"""Second-pass translations for TypeScript reference files and lingering
English lines. Idempotent: safe to re-run over ko/ output."""
import os
import re

WORKSPACE = os.path.expanduser("~/workspace")

REPL = [
    # ----- TypeScript client class prose -----
    (r"^This client provides methods for interacting with the ([a-z_ ]+) endpoints$",
     r"이 클라이언트는 X API의 \1 엔드포인트와 상호작용하기 위한 메서드를 제공합니다."),
    (r"^of the X API\. It handles authentication, request formatting, and response$",
     "이 클라이언트는 인증, 요청 형식 지정, 그리고"),
    (r"^parsing for all ([a-z_ ]+) related operations\.$",
     r"모든 \1 관련 작업에 대한 응답 파싱을 처리합니다."),
    (r"^Creates a new ([a-z_ ]+) client instance$", r"새로운 \1 클라이언트 인스턴스를 생성합니다."),
    (r"^The main X API client instance$", "메인 X API 클라이언트 인스턴스입니다."),

    # Recurring "Response for X" / "Request for X"
    (r"^Response for ([A-Za-z0-9_]+)$", r"\1에 대한 응답입니다."),
    (r"^Request for ([A-Za-z0-9_]+)$", r"\1에 대한 요청입니다."),

    # Method summary lines
    (r"^Create Bookmark$", "Bookmark 생성"),
    (r"^Delete Bookmark$", "Bookmark 삭제"),
    (r"^Get Bookmarks$", "Bookmark 목록 조회"),
    (r"^Get Bookmark folders$", "Bookmark 폴더 조회"),
    (r"^Get Bookmarks by folder ID$", "폴더 ID로 Bookmark 조회"),
    (r"^Get Liking Users$", "좋아요를 누른 사용자 조회"),
    (r"^Get List memberships$", "List 멤버십 조회"),
    (r"^Get Posts$", "Post 목록 조회"),
    (r"^Get Posts by IDs$", "ID로 Post 목록 조회"),
    (r"^Get Quoted Posts$", "인용된 Post 조회"),
    (r"^Get Reposted by$", "리포스트한 사용자 조회"),
    (r"^Get Reposts$", "리포스트 조회"),
    (r"^Get Reposts of me$", "나의 리포스트 조회"),
    (r"^Get Timeline$", "타임라인 조회"),
    (r"^Get Trends by WOEID$", "WOEID로 트렌드 조회"),
    (r"^Get User by ID$", "ID로 User 조회"),
    (r"^Get User by username$", "username으로 User 조회"),
    (r"^Get Users by IDs$", "ID로 User 목록 조회"),
    (r"^Get Users by usernames$", "username으로 User 목록 조회"),
    (r"^Get followers$", "팔로워 조회"),
    (r"^Get following$", "팔로잉 조회"),
    (r"^Get followed Lists$", "팔로우한 List 조회"),
    (r"^Get blocking$", "차단 목록 조회"),
    (r"^Get muting$", "뮤트 목록 조회"),
    (r"^Get count of all Posts$", "모든 Post 수 조회"),
    (r"^Get count of recent Posts$", "최근 Post 수 조회"),
    (r"^Get historical Post insights$", "과거 Post 인사이트 조회"),
    (r"^Get 28-hour Post insights$", "28시간 Post 인사이트 조회"),
    (r"^Create replay job for webhook$", "webhook용 재생 작업 생성"),
    (r"^Create stream link$", "스트림 링크 생성"),
    (r"^Delete stream link$", "스트림 링크 삭제"),
    (r"^Create webhook$", "webhook 생성"),
    (r"^Delete webhook$", "webhook 삭제"),
    (r"^Creates a new webhook configuration\.$", "새로운 webhook 구성을 생성합니다."),
    (r"^Get a list of webhook configs associated with a client app\.$",
     "클라이언트 앱과 연결된 webhook 구성 목록을 가져옵니다."),
    (r"^Get a list of webhook links associated with a filtered stream ruleset\.$",
     "필터링된 스트림 규칙 집합과 연결된 webhook 링크 목록을 가져옵니다."),

    # TS common param descriptions
    (r"^Promise resolving to the response data$", "응답 데이터로 해석되는 Promise입니다."),

    # Table header variants seen in TS files
    (r"^\| Name \| Type \| Description \|", "| 이름 | 타입 | 설명 |"),
]

COMPILED = [(re.compile(p, re.MULTILINE), r) for p, r in REPL]


def fm_desc_sub(text: str) -> str:
    m = re.match(r"^---\n(.*?\n)---\n", text, re.DOTALL)
    if not m:
        return text
    fm = m.group(1)

    def _repl(md):
        prefix = md.group(1)
        original = md.group(2)
        p = re.match(
            r"^Reference for the ([A-Za-z]+Client) class in the X API TypeScript SDK\. "
            r"Methods, parameters, and return types for the X API v2 ([a-z ]+) endpoints\.$",
            original,
        )
        if p:
            cls, ep = p.group(1), p.group(2)
            return f'{prefix}"X API TypeScript SDK의 {cls} 클래스에 대한 참조입니다. X API v2의 {ep} 엔드포인트를 위한 메서드, 매개변수 및 반환 타입입니다."'
        p = re.match(
            r"^Reference for the ([A-Za-z]+) module in the X API TypeScript SDK\. "
            r"Re-exported clients, types, and utilities provided by this SDK module for the X API v2\.$",
            original,
        )
        if p:
            mod = p.group(1)
            return f'{prefix}"X API TypeScript SDK의 {mod} 모듈에 대한 참조입니다. X API v2를 위한 이 SDK 모듈에서 제공하는 재내보낸 클라이언트, 타입 및 유틸리티입니다."'
        return md.group(0)

    new_fm = re.sub(r'^(description:\s*)"([^"]*)"$', _repl, fm, flags=re.MULTILINE)
    return text[: m.start(1)] + new_fm + text[m.end(1):]


def translate(text):
    text = fm_desc_sub(text)
    for pat, rep in COMPILED:
        text = pat.sub(rep, text)
    return text


def main():
    with open("/tmp/groups/gap_ko.txt") as f:
        paths = [l.strip() for l in f if l.strip()]
    for p in paths:
        dst = os.path.join(WORKSPACE, "ko", p)
        with open(dst, encoding="utf-8") as f:
            content = f.read()
        new = translate(content)
        if new != content:
            with open(dst, "w", encoding="utf-8") as f:
                f.write(new)
    print(f"Second pass: {len(paths)} files processed")


if __name__ == "__main__":
    main()
