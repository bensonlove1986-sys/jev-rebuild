@echo off
cls
echo 极简修复工具

:: 直接复制备份文件到目标位置
echo 正在复制备份文件...
if exist "d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.js" (
    copy "d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.js" "d:\PDF转网页\JEV_Client\ui\panel.js" /Y
    echo 已复制 panel.js
)

if exist "d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.html" (
    copy "d:\PDF转网页\JEV_Client\backup\encoding\ui\panel.html" "d:\PDF转网页\JEV_Client\ui\panel.html" /Y
    echo 已复制 panel.html
)

echo 修复完成！
echo 请手动清除浏览器缓存后重试
echo 按任意键退出...
pause>nul