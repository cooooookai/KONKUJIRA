#!/usr/bin/env node

/**
 * Debug script for availability display issue
 * Tests the data flow from API to calendar display
 */

const API_BASE_URL = 'https://band-sync-calendar-production.cooooookai.workers.dev';

async function debugAvailabilityIssue() {
    console.log('🔍 调试可用性显示问题\n');
    
    try {
        // Step 1: Test API response
        console.log('📡 步骤1: 测试API响应');
        const response = await fetch(`${API_BASE_URL}/availability?start=2025-12-14&end=2025-12-15`);
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ API响应成功，返回 ${data.length} 条数据\n`);
        
        // Step 2: Find COKAI's data
        console.log('🎯 步骤2: 查找COKAI的数据');
        const cokaiData = data.filter(item => {
            return item.extendedProps && 
                   item.extendedProps.memberName === 'COKAI' &&
                   item.start.includes('2025-12-14');
        });
        
        if (cokaiData.length === 0) {
            console.log('❌ 没有找到COKAI在14号的数据');
            console.log('\n📋 所有可用数据:');
            data.forEach((item, index) => {
                console.log(`${index + 1}. ${item.title} (${item.start})`);
            });
            return;
        }
        
        console.log(`✅ 找到COKAI的数据 ${cokaiData.length} 条:`);
        cokaiData.forEach((item, index) => {
            console.log(`${index + 1}. ${JSON.stringify(item, null, 2)}`);
        });
        
        // Step 3: Validate data structure
        console.log('\n🔍 步骤3: 验证数据结构');
        const firstItem = cokaiData[0];
        
        const requiredFields = ['id', 'title', 'start', 'end', 'display', 'extendedProps', 'classNames'];
        const missingFields = requiredFields.filter(field => !(field in firstItem));
        
        if (missingFields.length > 0) {
            console.log(`❌ 缺少必需字段: ${missingFields.join(', ')}`);
        } else {
            console.log('✅ 数据结构完整');
        }
        
        // Step 4: Check specific values
        console.log('\n📊 步骤4: 检查具体值');
        console.log(`- ID: ${firstItem.id}`);
        console.log(`- 标题: ${firstItem.title}`);
        console.log(`- 开始时间: ${firstItem.start}`);
        console.log(`- 结束时间: ${firstItem.end}`);
        console.log(`- 显示类型: ${firstItem.display}`);
        console.log(`- CSS类名: ${firstItem.classNames}`);
        console.log(`- 成员名: ${firstItem.extendedProps.memberName}`);
        console.log(`- 状态: ${firstItem.extendedProps.status}`);
        
        // Step 5: Check if it's a background event
        console.log('\n🎨 步骤5: 检查显示设置');
        if (firstItem.display === 'background') {
            console.log('✅ 正确设置为背景事件');
        } else {
            console.log(`❌ 显示类型错误: ${firstItem.display} (应该是 'background')`);
        }
        
        // Step 6: Check CSS class
        if (firstItem.classNames && firstItem.classNames.includes('availability-good')) {
            console.log('✅ CSS类名正确');
        } else {
            console.log(`❌ CSS类名错误: ${firstItem.classNames}`);
        }
        
        // Step 7: Simulate frontend processing
        console.log('\n🖥️  步骤7: 模拟前端处理');
        console.log('后端已返回FullCalendar格式，前端应该直接使用，不需要再次转换');
        
        // Check if data would be processed correctly
        const calendarEvents = [...data]; // This is what frontend should do now
        const cokaiEvents = calendarEvents.filter(event => 
            event.extendedProps && 
            event.extendedProps.memberName === 'COKAI' &&
            event.start.includes('2025-12-14')
        );
        
        console.log(`✅ 前端处理后应该有 ${cokaiEvents.length} 个COKAI事件`);
        
        // Final diagnosis
        console.log('\n🏥 诊断结果:');
        if (cokaiEvents.length > 0) {
            console.log('✅ 数据流正常，COKAI的14号圆圈数据存在且格式正确');
            console.log('💡 如果日历中仍然看不到，可能的原因:');
            console.log('   1. 前端仍在使用旧的DataTransformer转换逻辑');
            console.log('   2. CSS样式没有正确加载');
            console.log('   3. FullCalendar配置问题');
            console.log('   4. 缓存问题');
        } else {
            console.log('❌ 数据流异常，需要进一步调查');
        }
        
    } catch (error) {
        console.error('💥 调试过程中出错:', error.message);
    }
}

// Run debug if this file is executed directly
if (typeof window === 'undefined') {
    debugAvailabilityIssue().catch(console.error);
}

module.exports = { debugAvailabilityIssue };