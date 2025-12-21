# 恢复脚本：一键恢复到稳定状态 stable_translation_fixed
# 执行此脚本可以将系统恢复到翻译功能修复完成的稳定状态

Write-Host "正在恢复到稳定状态 stable_translation_fixed..."

# 1. 确保在项目根目录
Set-Location "D:\PDF转网页\JEV-Rebuild"

# 2. 切换到master分支
Write-Host "正在切换到master分支..."
git checkout master

# 3. 检出指定标签
Write-Host "正在检出标签 stable_translation_fixed..."
git checkout stable_translation_fixed

# 4. 安装worker-core依赖
Write-Host "正在安装worker-core依赖..."
Set-Location "worker-core"
npm install

# 5. 回到项目根目录
Set-Location ".."

Write-Host "恢复完成！系统已恢复到稳定状态 stable_translation_fixed"