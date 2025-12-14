#!/usr/bin/env node

/**
 * Band Sync Calendar - 部署验证脚本
 * 验证前端和后端配置是否正确
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    WORKER_URL: 'https://band-sync-calendar-production.cooooookai.workers.dev',
    GITHUB_PAGES_URLS: [
        'https://cooooookai.github.io',
        'https://cooooookai.github.io/KONKUJIRA/'
    ]
};

console.log('🚀 Band Sync Calendar - 部署验证开始\n');

// 1. 检查前端配置
function checkFrontendConfig() {
    console.log('📁 检查前端配置...');
    
    try {
        const configPath = path.join(__dirname, 'src/frontend/js/config.js');
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        if (configContent.includes(CONFIG.WORKER_URL)) {
            console.log('✅ 前端API_BASE_URL配置正确');
            return true;
        } else {
            console.log('❌ 前端API_BASE_URL配置错误');
            console.log(`   期望: ${CONFIG.WORKER_URL}`);
            return false;
        }
    } catch (error) {
        console.log('❌ 无法读取前端配置文件');
        return false;
    }
}

// 2. 检查后端配置
function checkBackendConfig() {
    console.log('\n📁 检查后端配置...');
    
    try {
        const wranglerPath = path.join(__dirname, 'wrangler.toml');
        const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
        
        const hasCorrectOrigins = CONFIG.GITHUB_PAGES_URLS.some(url => 
            wranglerContent.includes(url)
        );
        
        if (hasCorrectOrigins) {
            console.log('✅ 后端CORS配置包含GitHub Pages URL');
            return true;
        } else {
            console.log('❌ 后端CORS配置可能不正确');
            console.log('   请确认ALLOWED_ORIGINS包含正确的GitHub Pages URL');
            return false;
        }
    } catch (error) {
        console.log('❌ 无法读取后端配置文件');
        return false;
    }
}

// 3. 测试API连接
function testAPIConnection() {
    return new Promise((resolve) => {
        console.log('\n🌐 测试API连接...');
        
        const url = `${CONFIG.WORKER_URL}/`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ API连接成功');
                    console.log(`   状态码: ${res.statusCode}`);
                    resolve(true);
                } else {
                    console.log(`❌ API连接失败 - 状态码: ${res.statusCode}`);
                    resolve(false);
                }
            });
        }).on('error', (error) => {
            console.log('❌ API连接失败');
            console.log(`   错误: ${error.message}`);
            resolve(false);
        });
    });
}

// 4. 测试CORS
function testCORS() {
    return new Promise((resolve) => {
        console.log('\n🔒 测试CORS配置...');
        
        const testPromises = CONFIG.GITHUB_PAGES_URLS.map(origin => {
            return new Promise((resolveTest) => {
                const options = {
                    hostname: 'band-sync-calendar-production.cooooookai.workers.dev',
                    path: '/events?start=2024-01-01&end=2024-01-02',
                    method: 'OPTIONS',
                    headers: {
                        'Origin': origin,
                        'Access-Control-Request-Method': 'GET',
                        'Access-Control-Request-Headers': 'Content-Type'
                    }
                };
                
                const req = https.request(options, (res) => {
                    const allowOrigin = res.headers['access-control-allow-origin'];
                    
                    if (allowOrigin === origin || allowOrigin === '*') {
                        console.log(`✅ CORS测试通过: ${origin}`);
                        resolveTest(true);
                    } else {
                        console.log(`❌ CORS测试失败: ${origin}`);
                        console.log(`   返回的Origin: ${allowOrigin}`);
                        resolveTest(false);
                    }
                });
                
                req.on('error', (error) => {
                    console.log(`❌ CORS测试错误: ${origin} - ${error.message}`);
                    resolveTest(false);
                });
                
                req.end();
            });
        });
        
        Promise.all(testPromises).then(results => {
            const success = results.some(result => result);
            resolve(success);
        });
    });
}

// 5. 生成部署报告
function generateReport(results) {
    console.log('\n📊 部署验证报告');
    console.log('='.repeat(50));
    
    const { frontend, backend, api, cors } = results;
    
    console.log(`前端配置: ${frontend ? '✅ 通过' : '❌ 失败'}`);
    console.log(`后端配置: ${backend ? '✅ 通过' : '❌ 失败'}`);
    console.log(`API连接: ${api ? '✅ 通过' : '❌ 失败'}`);
    console.log(`CORS配置: ${cors ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = frontend && backend && api && cors;
    
    console.log('\n' + '='.repeat(50));
    
    if (allPassed) {
        console.log('🎉 所有检查通过！项目已准备好部署到GitHub Pages');
        console.log('\n📋 下一步:');
        console.log('1. 将代码推送到GitHub');
        console.log('2. 在GitHub仓库设置中启用Pages');
        console.log('3. 访问你的GitHub Pages URL测试功能');
    } else {
        console.log('⚠️  发现配置问题，请修复后重新验证');
        console.log('\n🔧 修复建议:');
        
        if (!frontend) {
            console.log('- 检查 src/frontend/js/config.js 中的 API_BASE_URL');
        }
        if (!backend) {
            console.log('- 检查 wrangler.toml 中的 ALLOWED_ORIGINS');
        }
        if (!api) {
            console.log('- 确认Worker已正确部署: wrangler deploy --env production');
        }
        if (!cors) {
            console.log('- 重新部署Worker以更新CORS设置');
        }
    }
    
    return allPassed;
}

// 主函数
async function main() {
    const results = {
        frontend: checkFrontendConfig(),
        backend: checkBackendConfig(),
        api: await testAPIConnection(),
        cors: await testCORS()
    };
    
    const success = generateReport(results);
    process.exit(success ? 0 : 1);
}

// 运行验证
main().catch(error => {
    console.error('验证过程中发生错误:', error);
    process.exit(1);
});