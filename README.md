# 3D Engineering Atlas

Babylon.js로 좌표계, Vertex/Index, Bounding Box를 조작하며 학습합니다.

- [학습 사이트](https://kobong8.github.io/3d-engineering-atlas/)
- [기획 개요](content/overview.md)
- [Kobong 공통 템플릿](https://github.com/kobong8/kobong-site-template)

## GitHub Pages

저장소의 **Settings → Pages → Deploy from a branch**에서 `main` 브랜치와 `/ (root)`를 선택합니다. 사이트의 CSS와 JavaScript는 저장소 상대 경로에서 제공됩니다. Babylon.js 8.32.0은 integrity 해시로 검증하며 jsDelivr에서 로드합니다.

## FastAPI 로컬 미리보기

Python 3.12로 사이트를 로컬에서 미리 볼 수 있습니다. GitHub Pages 운영 사이트는 정적 게시를 사용합니다.

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

브라우저에서 [Atlas](http://127.0.0.1:8000/)와 [헬스 체크](http://127.0.0.1:8000/health)를 엽니다. 실습에는 WebGL과 Babylon.js CDN 연결이 필요합니다.
