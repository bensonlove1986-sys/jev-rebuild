@echo off
cls
echo ===========================================
echo 修复HTML编码问题
echo ===========================================

REM 备份原始文件
if exist auto_heal_demo.html (
    echo 备份文件...
    copy auto_heal_demo.html auto_heal_demo.html.bak
) else (
    echo 文件不存在，直接创建
)

REM 创建干净的HTML文件
set "output=auto_heal_demo.html"
echo 创建干净的HTML文件...

( 
e  "^<!DOCTYPE html^>"
  "^<html^>"
  "^<head^>"
  "  ^<meta charset=^"UTF-8^"^>"
  "  ^<title^>JEV L6.2 AutoHeal^</title^>"
  "^</head^>"
  "^<body^>"
  "  ^<h1^>JEV L6.2 AutoHeal^</h1^>"
  "  ^<p^>System initialized successfully^</p^>"
  "  ^<p^>Encoding: UTF-8 Locked^</p^>"
  "  ^<p^>Health: 100%%^</p^>"
  "  ^<p^>Time: 00:00:00^</p^>"
  "^</body^>"
  "^</html^>"
) > %output%

echo 修复完成！
echo ===========================================
echo 文件已保存为UTF-8编码
echo 请清除浏览器缓存后重新打开页面
echo ===========================================
pause