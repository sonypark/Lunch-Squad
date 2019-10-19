# Lunch-Squad

> 코드스쿼드 주변 맛집 검색/추천 서비스

- 815 해커톤에서 만든 서비스를 업그레이드 중

- Web Front-end: Gren
- Web Back-end: Sony

## Route
- API Base URL: `https://ldlyo4kkqc.execute-api.ap-northeast-2.amazonaws.com/dev/`
    
    - 모든 식당 조회(GET): `/restaurants`
    - 특정 식당 조회(GET): `/restaurant/:restaurant_id`
    - 랜덤 맛집 추천(GET): `restaurant/random`

## 지도 API: 카카오맵 API 사용
- 이유
    - 네이버 지도는 식당 좌표를 제공하지 않음
    - 구글맵과 카카오맵은 좌표 제공
    - API마다 좌표 위치가 조금씩 다르기 때문에 카카오맵으로 통일하기로 결정
        - 백엔드에서 식당 좌표를 DB에 저장해두고 클라이언트에서 요청이 오면 좌표를 전송
        - 프론트에서는 응답 받은 좌표를 카카오맵 API에 표시

## AWS Lambda로 배포
- 이유
    - 코드가 실행되지 않을 때는 과금되지 않는다.
    - 런치 스쿼드는 서비스 특성상 특정 시간대에만 주로 사용되며 코드 요청이 많지 않다.
        - 한 번 백엔드에서 식당 전체 정보를 보내주면 프론트에서 필터링 하고 처리한다.
        - 그러므로 람다를 사용하면 EC2 배포와 비교해 비용을 많이 아낄 수 있다.

## Todo

- [x] 좌표가 같은 맛집 수정 — 약간 좌우로 이동하기 — 같은 건물에 있는 식당 5쌍이 겹처서 좌표 수정
- [x] 특정 맛집 id 를 url로 요청하면 해당 맛집 리턴해주는 기능 추가
- [x] 리스트에 메뉴 하나, 그 메뉴 가격만 보이게 하기
    - 상세 보기에서는 여러 메뉴
- [x] 응답하는 데이터 객체 형태 불필요한 key값 지우기 
- [x] 식당 이미지 추가 시 이미지 리사이즈 후 S3 저장
    - [x]  썸네일 이미지 (width=150)
    - [x]  상세 이미지 (width=400)
- [x] AWS Cognito를 이용한 회원가입 로그인 구현
    - [x] Cognito로 회원 가입을 하면 Cognito DB에 저장
    - [x] 이메일로 인증 할 경우 백엔드 서버에서 이벤트를 받아 DynamoDB에 저장
    - [x] JWT 토근을 이용한 사용자 인증 진행 (로그인 시 Cognito에서 JWT을 발행하고 백엔드 서버에서 토큰 검증)
- [ ] Oauth 로그인 구현
    - [x] 구글 로그인
    - [ ] 페이스북 로그인
- [ ] API 문서 작성
- [ ] TravisCI & AWS CodeDeploy로 배포 자동화 구축하기