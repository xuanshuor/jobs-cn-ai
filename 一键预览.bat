@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist "C:\Program Files\nodejs\node.exe" (
  set "PATH=C:\Program Files\nodejs;%PATH%"
)

where node >nul 2>&1 || (
  echo [错误] 未找到 node。请先安装 Node.js: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [提示] 首次运行，正在 npm install ...
  call npm install
  if errorlevel 1 (
    echo [错误] npm install 失败
    pause
    exit /b 1
  )
)

echo [提示] 启动开发服务器并打开浏览器（关闭本窗口或按 Ctrl+C 可停止服务）
call npm run dev:open
pause
