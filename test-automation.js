/**
 * 数星自动化测试诊断脚本 V2
 */
const fs = require('fs');
const path = require('path');

const BASE = '/home/wsl/.openclaw/workspace/数星-网页原型';
let passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}
function assert(cond, msg) {
    if (!cond) throw new Error(msg || '断言失败');
}

console.log('\n=== 数星自动化测试套件 V2 ===\n');

// ===== 1. 文件完整性 =====
console.log('【1. 文件完整性】');
['index.html','chat.html','setup.html','profile.html','analysis.html',
 'css/style.css','css/chat.css','css/components.css',
 'js/chat.js','js/main.js','js/setup.js','js/star-effects.js',
 'js/personality-data.js','js/character-model.js','js/model-scheduler.js',
 'js/analysis-engine.js','js/safety.js','js/profile.js'].forEach(f => {
    test(`存在: ${f}`, () => assert(fs.existsSync(path.join(BASE, f))));
});

// ===== 2. chat.js关键函数 =====
console.log('\n【2. chat.js关键函数】');
const chatJs = fs.readFileSync(path.join(BASE, 'js/chat.js'), 'utf8');
const functions = ['sendMsg','addBotMessage','addSystemMessage','hideTyping',
    'addUserMessage','streamAI','generateLocalReply','buildContextMessages',
    'updateCharCount','saveHistory','scrollBottom','addMessageFooter',
    'startMode','toggleMode','sendDailyActiveMessage','detectEmotion'];
functions.forEach(fn => {
    test(`函数: ${fn}()`, () => {
        assert(chatJs.includes('function ' + fn + '('), `${fn}() 未定义`);
    });
});

// ===== 3. sendMsg调用链 =====
console.log('\n【3. sendMsg 调用链】');
test('sendBtn 绑定 click → sendMsg', () => assert(chatJs.includes("sendMsg")));
test('streamAI 有 try-catch 保护', () => assert(chatJs.includes("try {") && chatJs.includes("catch (e)")));
test('API失败有本地fallback (generateLocalReply)', () => assert(chatJs.includes("generateLocalReply")));
test('AI_CONFIG 环境检测逻辑', () => assert(chatJs.includes("github.io") || chatJs.includes("hostname")));
test('isWaiting 状态管理', () => assert(chatJs.includes("isWaiting = false") && chatJs.includes("isWaiting = true")));
test('异常后按钮恢复', () => assert(chatJs.includes("sendBtn.disabled = false")));

// ===== 4. HTML元素ID =====
console.log('\n【4. HTML元素ID】');
const chatHtml = fs.readFileSync(path.join(BASE, 'chat.html'), 'utf8');
['send-btn','message-input','chat-messages','mode-selection',
 'chat-interface','mode-title','mode-icon','persona-info',
 'mode-indicator','switch-mode-btn','help-modal'].forEach(id => {
    test(`id="${id}" 存在`, () => {
        assert(chatHtml.includes(`id="${id}"`) || chatHtml.includes(`id='${id}'`));
    });
});

// ===== 5. CSS-JS类名一致性 =====
console.log('\n【5. CSS-JS类名一致性】');
const cssContent = ['style.css','chat.css','components.css'].map(f => {
    const p = path.join(BASE, 'css', f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}).join('\n');
['.bot-message','.user-message','.system-message','.message-content',
 '.chat-input-wrapper','.chat-send-btn','.chat-messages'].forEach(cls => {
    test(`CSS类 ${cls} 存在`, () => assert(cssContent.includes(cls)));
});

// ===== 6. 手机端适配 =====
console.log('\n【6. 手机端适配】');
['index.html','chat.html','setup.html','profile.html','analysis.html'].forEach(f => {
    const h = fs.readFileSync(path.join(BASE, f), 'utf8');
    test(`${f}: viewport`, () => assert(h.includes('viewport')));
});
// chat.html 的 @media 应该通过CSS文件包含
test('CSS有 @media 768px', () => assert(cssContent.includes('768px') || cssContent.includes('768')));
test('CSS有 @media 480px', () => assert(cssContent.includes('480px') || cssContent.includes('480')));

// ===== 7. 资源引用 =====
console.log('\n【7. 资源引用】');
['index.html','chat.html'].forEach(f => {
    const h = fs.readFileSync(path.join(BASE, f), 'utf8');
    test(`${f}: Font Awesome`, () => assert(h.includes('font-awesome')));
    test(`${f}: style.css`, () => assert(h.includes('css/style.css')));
});

// ===== 8. JavaScript语法 =====
console.log('\n【8. JavaScript语法】');
['js/chat.js','js/main.js','js/setup.js','js/star-effects.js',
 'js/personality-data.js','js/character-model.js','js/model-scheduler.js',
 'js/analysis-engine.js','js/safety.js','js/profile.js'].forEach(f => {
    test(`语法OK: ${f}`, () => {
        const content = fs.readFileSync(path.join(BASE, f), 'utf8');
        try {
            const vm = require('vm');
            // 使用Script来解析语法（但不执行）
            new vm.Script(content, { filename: f });
        } catch(e) {
            if (e instanceof SyntaxError) throw e;
            // 非语法错误忽略（如引用未定义变量等）
        }
    });
});

// ===== 总结 =====
console.log(`\n=== 结果: ${passed} ✅ / ${failed} ❌ / 共${passed+failed}项 ===\n`);
if (failed > 0) process.exit(1);
