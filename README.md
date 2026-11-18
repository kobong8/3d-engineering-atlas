# 3D Engineering Atlas

[학습 사이트](https://kobong8.github.io/3d-engineering-atlas/) · [실습실](https://kobong8.github.io/3d-engineering-atlas/labs.html) · [강의 원문](content/CONTENT.md)

20개 학습 트랙과 응용 프로젝트를 검색하고, 스크롤 또는 발표 모드로 읽을 수 있습니다. 원고에 있는 집필 항목과 실습 제안을 그대로 제공하며, 실행 가능한 예제 9개는 실습실에 모았습니다. 길찾기와 가구 배치는 충돌·제약을 확인할 수 있는 평면 예제입니다.

## 원고 수정 및 검증

```sh
npm ci
npm run build
npm test
```

`content/CONTENT.md`에서 `index.html`을 생성합니다. Babylon.js 버전을 바꾼 경우 `npm run vendor`로 라이선스와 런타임을 갱신합니다. GitHub Pages는 `main`의 루트에서 생성한 HTML과 상대 경로 자산을 게시합니다. 브라우저에서 별도의 API나 CDN을 요청하지 않습니다.

## FastAPI 로컬 미리보기

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

[로컬 Atlas](http://127.0.0.1:8000/) · [헬스 체크](http://127.0.0.1:8000/health)
