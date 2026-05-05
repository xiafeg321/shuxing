/**
 * 数星 - 人格设置脚本 V3（优化版）
 * 引用共享数据层 personality-data.js
 */

// 从共享数据层获取
const PERSONALITY = window.PERSONALITY;

// ===== 状态管理 =====
let currentStep = 1;
const totalSteps = 4;
let userSelections = { zodiac: null, mbti: null, chatHistory: '' };

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
        chatHistory: userSelections.chatHistory || '',
        createdAt: new Date().toISOString()
    };
    
    try {
        // 保存当前模型
        localStorage.setItem('shuxing_user_settings', JSON.stringify(userSelections));
        localStorage.setItem('shuxing_current_model', JSON.stringify(model));
        
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
            showToast('文件已导入 ✅', 'success');
        }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
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
