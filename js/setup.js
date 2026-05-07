/**
 * 数星 - 人格设置脚本 V3（优化版）
 * 引用共享数据层 personality-data.js
 */

// 从共享数据层获取
const PERSONALITY = window.PERSONALITY;

// ===== 状态管理 =====
let currentStep = 1;
const totalSteps = 4;
let userSelections = { zodiac: null, mbti: null, chatHistory: '', nickname: '', background: '', interests: '' };

document.addEventListener('DOMContentLoaded', function() {
    init();
});

function init() {
    generateZodiacCards();
    generateMbtiCards();
    bindEvents();
    loadSavedData();
    updateProgress();
}

// ===== 生成星座卡片 =====
function generateZodiacCards() {
    const grid = document.getElementById('zodiac-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(PERSONALITY.zodiac).forEach(([key, data]) => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.dataset.value = key;
        card.dataset.type = 'zodiac';
        card.innerHTML = `
            <span class="symbol">${data.symbol}</span>
            <div class="name">${data.name}</div>
            <span class="badge">${data.element}象星座</span>
            <div class="trait">${data.trait}</div>
        `;
        card.addEventListener('click', () => selectItem('zodiac', key, card));
        grid.appendChild(card);
    });
}

// ===== 生成MBTI卡片 =====
function generateMbtiCards() {
    const grid = document.getElementById('mbti-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const categoryColors = {
        '分析师': 'category-analyst',
        '外交家': 'category-diplomat',
        '守护者': 'category-sentinel',
        '探险家': 'category-explorer'
    };

    Object.entries(PERSONALITY.mbti).forEach(([key, data]) => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.dataset.value = key;
        card.dataset.type = 'mbti';
        card.innerHTML = `
            <div class="name" style="font-size:1.3rem;letter-spacing:2px;">${data.name}</div>
            <span class="badge ${categoryColors[data.category] || ''}">${data.category}</span>
            <div class="trait">${data.trait}</div>
        `;
        card.addEventListener('click', () => selectItem('mbti', key, card));
        grid.appendChild(card);
    });
}

// ===== 选择逻辑 =====
function selectItem(type, value, card) {
    // 清除同组选中
    document.querySelectorAll(`.selection-card[data-type="${type}"]`).forEach(c => {
        c.classList.remove('selected');
    });
    
    card.classList.add('selected');
    userSelections[type] = value;
    saveToLocalStorage();
    
    // 显示选中提示
    showSelectedHint(type, value);
}

function showSelectedHint(type, value) {
    const grid = type === 'zodiac' 
        ? document.getElementById('zodiac-grid')
        : document.getElementById('mbti-grid');
    
    // 移除旧提示
    const oldHint = document.querySelector('.selected-hint');
    if (oldHint) oldHint.remove();
    
    const data = type === 'zodiac' ? PERSONALITY.zodiac[value] : PERSONALITY.mbti[value];
    if (!data) return;
    
    const hint = document.createElement('div');
    hint.className = 'selected-hint';
    
    const label = type === 'zodiac' 
        ? `已选择：${data.name}（${data.element}象）`
        : `已选择：${data.name}（${data.category}）`;
    
    hint.innerHTML = `✅ ${label}`;
    grid.parentNode.insertBefore(hint, grid.nextSibling);
}

// ===== 进度控制 =====
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    
    // 校验
    if (step > currentStep) {
        if (currentStep === 1 && !userSelections.zodiac) {
            showToast('请先选择一个星座', 'error');
            return;
        }
        if (currentStep === 2 && !userSelections.mbti) {
            showToast('请先选择一个MBTI类型', 'error');
            return;
        }
    }
    
    currentStep = step;
    updateProgress();
    
    // 进入第4步时生成洞察
    if (currentStep === 4) {
        generateInsight();
    }
    
    document.querySelector('.setup-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProgress() {
    // 更新进度步骤
    document.querySelectorAll('.progress-step').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'completed');
        if (s === currentStep) el.classList.add('active');
        else if (s < currentStep) el.classList.add('completed');
    });
    
    // 显示当前步骤
    for (let i = 1; i <= totalSteps; i++) {
        const section = document.getElementById(`step-${i}`);
        if (section) section.style.display = i === currentStep ? 'block' : 'none';
    }
}

// ===== 完成 & 洞察 =====
function generateInsight() {
    const summaryZodiac = document.getElementById('summary-zodiac');
    const summaryMbti = document.getElementById('summary-mbti');
    const summaryChat = document.getElementById('summary-chat');
    const insightEl = document.getElementById('personality-insight');
    
    if (summaryZodiac && userSelections.zodiac) {
        const zd = PERSONALITY.zodiac[userSelections.zodiac];
        summaryZodiac.textContent = `${zd.name}（${zd.element}象）`;
    }
    if (summaryMbti && userSelections.mbti) {
        const md = PERSONALITY.mbti[userSelections.mbti];
        summaryMbti.textContent = `${md.name}（${md.category}）`;
    }
    if (summaryChat) {
        summaryChat.textContent = userSelections.chatHistory && userSelections.chatHistory.trim().length > 0
            ? userSelections.chatHistory.substring(0, 40) + (userSelections.chatHistory.length > 40 ? '...' : '')
            : '未提供';
    }
    
    // 显示昵称/背景/兴趣
    const summaryNickname = document.getElementById('summary-nickname');
    if (summaryNickname) {
        summaryNickname.textContent = userSelections.nickname || '未填写（后面慢慢告诉我也行）';
    }
    // 更新summary卡片（如果没有单独的，可以添加一个提示）
    if (userSelections.background || userSelections.interests) {
        const extraInfo = [];
        if (userSelections.background) extraInfo.push('认识方式：' + userSelections.background);
        if (userSelections.interests) extraInfo.push('爱好：' + userSelections.interests);
        // 尝试找到或创建一个展示区域
        const insightCard = document.getElementById('insight-card');
        if (insightCard) {
            let extraEl = document.getElementById('extra-info-summary');
            if (!extraEl) {
                extraEl = document.createElement('p');
                extraEl.id = 'extra-info-summary';
                extraEl.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;line-height:1.8;margin:8px 0 0;';
                insightCard.appendChild(extraEl);
            }
            extraEl.textContent = extraInfo.join(' | ');
        }
    }
    
    // 生成人格洞察
    if (userSelections.zodiac && userSelections.mbti && insightEl) {
        const insight = PERSONALITY.getCombinationInsight(userSelections.zodiac, userSelections.mbti);
        insightEl.textContent = insight.full || insight;
    }
}

function completeSetup() {
    if (!userSelections.zodiac || !userSelections.mbti) {
        showToast('请先完成星座和MBTI选择', 'error');
        return;
    }
    
    const model = {
        modelId: 'model_' + Date.now(),
        zodiac: userSelections.zodiac,
        mbti: userSelections.mbti,
        nickname: userSelections.nickname || '',
        background: userSelections.background || '',
        interests: userSelections.interests || '',
        chatHistory: userSelections.chatHistory || '',
        createdAt: new Date().toISOString()
    };
    
    try {
        // 保存当前模型
        localStorage.setItem('shuxing_user_settings', JSON.stringify(userSelections));
        localStorage.setItem('shuxing_current_model', JSON.stringify(model));
        
        // 初始化人物模型，同步用户设置到character model
        if (window.CHARACTER_MODEL) {
            CHARACTER_MODEL.initModel();
            const cm = CHARACTER_MODEL.getModel();
            if (userSelections.nickname) {
                CHARACTER_MODEL.recordInfo('nickname', userSelections.nickname);
            }
            if (userSelections.background) {
                CHARACTER_MODEL.recordInfo('relationshipBackground', userSelections.background);
            }
            if (userSelections.interests) {
                CHARACTER_MODEL.recordInfo('interests', userSelections.interests);
            }
        }
        
        // 保存到历史记录
        let history = JSON.parse(localStorage.getItem('shuxing_model_history') || '[]');
        history.unshift(model);
        if (history.length > 10) history = history.slice(0, 10);
        localStorage.setItem('shuxing_model_history', JSON.stringify(history));
        
        showToast('人格模型创建成功！✨ 即将进入对话', 'success');
        setTimeout(() => { window.location.href = 'chat.html'; }, 800);
    } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败，请检查浏览器存储设置', 'error');
    }
}

// ===== 本地存储 =====
function saveToLocalStorage() {
    try {
        localStorage.setItem('shuxing_user_settings', JSON.stringify(userSelections));
    } catch (e) {
        console.error('保存失败:', e);
    }
}

function loadSavedData() {
    try {
        const saved = localStorage.getItem('shuxing_user_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            userSelections = { ...userSelections, ...parsed };
            
            // 恢复选中状态
            if (userSelections.zodiac) {
                const card = document.querySelector(`.selection-card[data-type="zodiac"][data-value="${userSelections.zodiac}"]`);
                if (card) {
                    card.classList.add('selected');
                    showSelectedHint('zodiac', userSelections.zodiac);
                }
            }
            if (userSelections.mbti) {
                const card = document.querySelector(`.selection-card[data-type="mbti"][data-value="${userSelections.mbti}"]`);
                if (card) {
                    card.classList.add('selected');
                    showSelectedHint('mbti', userSelections.mbti);
                }
            }
            if (userSelections.chatHistory) {
                const ta = document.getElementById('chat-history');
                if (ta) ta.value = userSelections.chatHistory;
                updateChatCharCount();
            }
            
            // 恢复昵称/背景/兴趣
            if (userSelections.nickname) {
                const el = document.getElementById('input-nickname');
                if (el) el.value = userSelections.nickname;
            }
            if (userSelections.background) {
                const el = document.getElementById('input-background');
                if (el) el.value = userSelections.background;
            }
            if (userSelections.interests) {
                const el = document.getElementById('input-interests');
                if (el) el.value = userSelections.interests;
            }
        }
    } catch (e) {
        console.error('加载数据失败:', e);
    }
}

// ===== 事件绑定 =====
function bindEvents() {
    // 下一步按钮
    document.querySelectorAll('.next-step').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            goToStep(parseInt(this.dataset.next));
        });
    });
    
    // 上一步按钮
    document.querySelectorAll('.prev-step').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            goToStep(parseInt(this.dataset.prev));
        });
    });
    
    // 完成按钮
    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            completeSetup();
        });
    }
    
    // 聊天记录输入
    const chatInput = document.getElementById('chat-history');
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            userSelections.chatHistory = this.value;
            saveToLocalStorage();
            updateChatCharCount();
        });
    }
    
    // 新字段：昵称、背景、兴趣
    const nicknameInput = document.getElementById('input-nickname');
    if (nicknameInput) {
        nicknameInput.addEventListener('input', function() {
            userSelections.nickname = this.value;
            saveToLocalStorage();
        });
    }
    const bgInput = document.getElementById('input-background');
    if (bgInput) {
        bgInput.addEventListener('input', function() {
            userSelections.background = this.value;
            saveToLocalStorage();
        });
    }
    const interestInput = document.getElementById('input-interests');
    if (interestInput) {
        interestInput.addEventListener('input', function() {
            userSelections.interests = this.value;
            saveToLocalStorage();
        });
    }
    
    // 文件上传
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    if (fileSelectBtn && fileInput) {
        fileSelectBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // 上传区域点击
    const uploadArea = document.getElementById('file-upload-area');
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target === fileSelectBtn || fileSelectBtn.contains(e.target)) return;
            fileInput.click();
        });
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.txt')) {
        showToast('请上传 .txt 格式文件', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('文件大小不能超过2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(ev) {
        const content = ev.target.result;
        const ta = document.getElementById('chat-history');
        if (ta) {
            ta.value = content.substring(0, 2000);
            userSelections.chatHistory = ta.value;
            saveToLocalStorage();
            updateChatCharCount();
            
            // 智能分析聊天记录
            const analysis = analyzeChatLogs(content.substring(0, 2000));
            if (analysis) {
                const insightEl = document.getElementById('personality-insight');
                if (insightEl) {
                    // 如果还没生成完整洞察，先显示分析结果
                    const lines = [];
                    if (analysis.tone) lines.push('💬 语气：' + analysis.tone);
                    if (analysis.patterns.length > 0) lines.push('📝 常用表达：' + analysis.patterns.slice(0, 3).join('、'));
                    if (analysis.emojis.length > 0) lines.push('😊 常用表情：' + analysis.emojis.slice(0, 3).join(' '));
                    if (analysis.averageLength) lines.push('📏 消息长度：' + analysis.averageLength);
                    if (lines.length > 0) {
                        showToast('分析完成 ✨ 提取到' + lines.length + '项特征', 'success');
                    }
                }
            }
            
            showToast('文件已导入 ✅', 'success');
        }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
}

/**
 * 聊天记录智能分析
 * 从聊天记录中提取说话风格、常用词、语气等特征
 */
function analyzeChatLogs(text) {
    if (!text || text.trim().length < 20) return null;
    
    const lines = text.split('\n').filter(l => l.trim()).map(l => l.trim());
    
    // 1. 语气分析
    const toneAnalysis = [];
    if (/[~～]/.test(text)) toneAnalysis.push('温柔亲切');
    if (/[！!]{2,}/.test(text)) toneAnalysis.push('活泼热情');
    if (/[。.。]/.test(text) && text.split(/[。.。]/).length > 5) toneAnalysis.push('沉稳');
    if (/[?？]/.test(text) && (text.match(/[?？]/g) || []).length > lines.length * 0.3) toneAnalysis.push('喜欢提问');
    if (/哈哈|嘿嘿|嘻嘻|hh|hah/.test(text)) toneAnalysis.push('开朗爱笑');
    if (/嗯嗯|好的|好的|好的吧|好吧|是的/.test(text)) toneAnalysis.push('顺从配合');
    if (/切|哼|呵|无语|服了/.test(text)) toneAnalysis.push('有小脾气');
    
    const tone = toneAnalysis.length > 0 ? toneAnalysis.join('，') : '自然日常';
    
    // 2. 常用表达/口头禅
    const patterns = [];
    const commonPhrases = ['好吧', '确实', '真的', '其实', '反正', '算了', 'maybe', '大概', '也许', '感觉', '有点', '真的吗', '哈哈', '笑死', '救命', '绝了', '可以', '行吧', '懂了', '原来如此'];
    for (const phrase of commonPhrases) {
        const count = (text.match(new RegExp(phrase, 'g')) || []).length;
        if (count >= 2) patterns.push(phrase);
    }
    // 找到出现最多的单词
    const words = text.replace(/[，。！？、；：""''（）【】{}《》\s]/g, ' ').split(' ').filter(w => w.length >= 2);
    const wordFreq = {};
    for (const w of words) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
    const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [word, count] of sorted) {
        if (count >= 3 && !patterns.includes(word) && !commonPhrases.includes(word)) {
            patterns.push(word);
        }
    }
    
    // 3. 表情使用
    // Skip emoji detection for simplicity
    const emojis = [];
    const uniqueEmojis = [];
    
    // 4. 消息长度分析
    const lengths = lines.map(l => l.length);
    const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    const lengthDesc = avgLen < 10 ? '简短回复为主' : avgLen < 30 ? '中等长度' : '喜欢说长句';
    
    // 5. 时间分布（如果有时间戳模式）
    const timePattern = /(\d{1,2}[:：]\d{2})/g;
    const times = text.match(timePattern) || [];
    const nightCount = times.filter(t => parseInt(t) >= 22 || parseInt(t) < 6).length;
    const timeDesc = nightCount > times.length * 0.5 ? '喜欢深夜聊天' : '';
    
    const result = {
        tone: tone || '自然日常',
        patterns: [...new Set(patterns)].slice(0, 5),
        emojis: uniqueEmojis.slice(0, 5),
        averageLength: lengthDesc,
        nightOwl: timeDesc
    };
    
    // 自动填充到人物模型
    if (window.CHARACTER_MODEL) {
        CHARACTER_MODEL.initModel();
        if (result.tone) {
            CHARACTER_MODEL.recordInfo('speakingStyle', result.tone + (result.patterns.length > 0 ? '，常用：' + result.patterns.join('、') : ''));
        }
        if (result.emojis.length > 0 && !CHARACTER_MODEL.getModel().L1.nickname) {
            // 不强制填充，留给用户选择
        }
    }
    
    return result;
}

function updateChatCharCount() {
    const ta = document.getElementById('chat-history');
    const countEl = document.getElementById('chat-char-count');
    if (ta && countEl) {
        countEl.textContent = ta.value.length;
    }
}

// ===== Toast通知 =====
function showToast(message, type) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = 'toast show';
    if (type) toast.classList.add(type);
    
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}
