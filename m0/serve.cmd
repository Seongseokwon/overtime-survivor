@echo off
REM 모바일 실기 벤치마크용 로컬 서버
REM  1) 이 파일을 더블클릭하거나 터미널에서 실행
REM  2) 아래 출력된 IPv4 주소를 폰 브라우저에 입력:  http://<IP>:8080/bench.html
REM  * PC와 폰이 같은 Wi-Fi에 있어야 합니다
REM  * 접속이 안 되면 Windows 방화벽에서 Node.js의 사설 네트워크 접근을 허용하세요

echo.
echo === 이 PC의 IPv4 주소 ===
ipconfig | findstr /C:"IPv4"
echo.
echo === 폰 브라우저에서 http://[위 주소]:8080/bench.html 접속 ===
echo.
npx --yes serve -l 8080 .
