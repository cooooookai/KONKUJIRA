#!/usr/bin/env node

/**
 * GitHub Pages 部署诊断脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 GitHub Pages 部署诊断开始\n');

// 检查必要文件
function checkRequiredFiles() {
    console.log('📁 检查必要文件...');
    
    const requiredFiles = [
        'docs/index.html',
        'docs/css/styles.css',
        'docs/js/config.js',
        'docs/js/app.js'
    ];
    
    let allExists = true;
    
    requiredFiles.forEach(file => {
        const fullPath = path.join(__dirname, file);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${file} - 存在`);
        } else {
            console.log(`❌ ${file} - 缺失`);
            allExists = false;
        }
    });
    
    return allExists;
}

// 检查文件编码
function checkFileEncoding() {
    console.log('\n📝 检查文件编码...');
    
    const filesToCheck = [
        'docs/index.html',
        'docs/js/config.js'
    ];
    
    filesToCheck.forEach(file => {
        const fullPath = path.join(__dirname, file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hasSpecialChars = /[^\x00-\x7F]/.test(content);
            console.log(`${file}: ${hasSpecialChars ? '包含非ASCII字符' : '仅ASCII字符'}`);
        }
    });
}

// 检查文件大小
function checkFileSizes() {
    console.log('\n📊 检查文件大小...');
    
    const docsPath = path.join(__dirname, 'docs');
    
    function getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }
    
    function scanDirectory(dir, prefix = '') {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                console.log(`📁 ${prefix}${item}/`);
                scanDirectory(itemPath, prefix + '  ');
            } else {
                const size = (stats.size / 1024).toFixed(2);
                console.log(`📄 ${prefix}${item} (${size} KB)`);
            }
        });
    }
    
    if (fs.existsSync(docsPath)) {
        scanDirectory(docsPath);
    }
}

// 检查GitHub Pages配置
function checkGitHubPagesConfig() {
    console.log('\n⚙️ 检查GitHub Pages配置...');
    
    // 检查.nojekyll文件
    const nojekyllPath = path.join(__dirname, 'docs/.nojekyll');
    if (fs.existsSync(nojekyllPath)) {
        console.log('✅ .nojekyll 文件存在');
    } else {
        console.log('❌ .nojekyll 文件缺失');
    }
    
    // 检查GitHub Actions工作流
    const workflowPath = path.join(__dirname, '.github/workflows/pages.yml');
    if (fs.existsSync(workflowPath)) {
        console.log('✅ GitHub Actions 工作流存在');
    } else {
        console.log('❌ GitHub Actions 工作流缺失');
    }
}

// 生成修复建议
function generateFixSuggestions() {
    console.log('\n🔧 修复建议:');
    console.log('1. 确保所有文件都已推送到GitHub');
    console.log('2. 检查GitHub仓库设置中的Pages配置');
    console.log('3. 确认分支名称为 "main" 且文件夹为 "/docs"');
    console.log('4. 查看GitHub Actions的构建日志获取详细错误信息');
    console.log('5. 如果问题持续，尝试使用GitHub Actions部署而不是传统Pages');
}

// 主函数
function main() {
    const filesOk = checkRequiredFiles();
    checkFileEncoding();
    checkFileSizes();
    checkGitHubPagesConfig();
    
    console.log('\n📊 诊断结果:');
    console.log(`文件完整性: ${filesOk ? '✅ 通过' : '❌ 失败'}`);
    
    generateFixSuggestions();
}

main();