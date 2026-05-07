/**
 * 数星 - 个人中心脚本 V1
 * 管理设置、人物模型进度、数据导入导出
 */

document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('shuxing_theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    initProfile();
});

function initProfile() {
    loadSettings();
    loadCharacterProgress();
    loadStats();
    bindEvents();
    initStarBackground();
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('shuxing_user_settings');
        if (saved) {
            const data = JSON.parse(saved);
            document.getElementById('profile-zodiac').textContent = 
                window.PERSONALITY?.zodiac[data.zodiac]?.name || data.zodiac || '未设置';
            document.getElementById('profile-mbti').textContent = 
                window.PERSONALITY?.mbti[data.mbti]?.name || data.mbti || '未设置';
            
            if (data.nickname) {
                document.getElementById('profile-nickname').textContent = data.nickname;
            }
            if (data.background) {
                document.getElementById('profile-bg').textContent = data.background;
            }
        }
    } catch(e) {}
}

function loadCharacterProgress() {
    if (!window.CHARACTER_MODEL) return;
    const cm = CHARACTER_MODEL.getModel();
    
    // 进度信息
    document.getElementById('profile-stage').textContent = CHARACTER_MODEL.getStageName();
    document.getElementById('profile-stage').dataset.stage = cm.currentStage;
    
    const l1Pct = CHARACTER_MODEL.getL1Completion();
    const l2Pct = CHARACTER_MODEL.getL2Completion();
    const totalPct = CHARACTER_MODEL.getTotalProgress();
    
    document.getElementById('progress-l1').style.width = l1Pct + '%';
    document.getElementById('progress-l2').style.width = l2Pct + '%';
    document.getElementById('progress-total').style.width = totalPct + '%';
    document.getElementById('progress-l1-text').textContent = l1Pct + '%';
    document.getElementById('progress-l2-text').textContent = l2Pct + '%';
    document.getElementById('progress-total-text').textContent = totalPct + '%';
    document.getElementById('progress-similarity').textContent = cm.similarityLevel + '（' + cm.similarityPercent + '%）';
    
    // 已收集信息
    const infoList = document.getElementById('profile-info-list');
    if (infoList) {
        const infos = [];
        if (cm.L1.nickname) infos.push({ icon: 'user', label: '昵称', val: cm.L1.nickname });
        if (cm.L1.relationshipBackground) infos.push({ icon: 'handshake', label: '认识方式', val: cm.L1.relationshipBackground });
        if (cm.L1.interests.length > 0) infos.push({ icon: 'heart', label: '兴趣爱好', val: cm.L1.interests.join('、') });
        if (cm.L1.speakingStyle) infos.push({ icon: 'comment', label: '说话风格', val: cm.L1.speakingStyle });
        if (cm.L1.keyMemory) infos.push({ icon: 'star', label: '珍贵记忆', val: cm.L1.keyMemory });
        
        if (infos.length === 0) {
            infoList.innerHTML = '<div class="profile-empty">还没收集到信息，去聊聊天吧～</div>';
        } else {
            infoList.innerHTML = infos.map(i => 
                `<div class="profile-info-item">
                    <span class="info-icon"><i class="fas fa-${i.icon}"></i></span>
                    <span class="info-label">${i.label}</span>
                    <span class="info-value">${i.val}</span>
                </div>`
            ).join('');
        }
    }
    
    // 对话轮数
    document.getElementById('profile-rounds').textContent = cm.L3.conversationCount;
    document.getElementById('profile-anchors').textContent = cm.memoryAnchors.length;
    document.getElementById('profile-corrections').textContent = cm.L3.corrections.length;
}

function loadStats() {
    try {
        // 对话历史数量
        const hist = JSON.parse(localStorage.getItem('shuxing_chat_history') || '[]');
        const sessions = new Set(hist.map(m => m.sessionId || 'default'));
        document.getElementById('profile-sessions').textContent = sessions.size;
        document.getElementById('profile-messages').textContent = hist.length;
    } catch(e) {
        document.getElementById('profile-sessions').textContent = '0';
        document.getElementById('profile-messages').textContent = '0';
    }
}

function bindEvents() {
    // 重置模型
    const resetBtn = document.getElementById('reset-model-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('确定要重置人物模型吗？这会清空所有已收集的信息。')) {
                CHARACTER_MODEL.resetModel();
                localStorage.removeItem('shuxing_character_model');
                if (confirm('人物模型已重置 ✅\n是否也清除对话设置信息？')) {
                    localStorage.removeItem('shuxing_user_settings');
                    localStorage.removeItem('shuxing_current_model');
                }
                loadCharacterProgress();
                loadSettings();
                showToast('已重置 ✅', 'success');
            }
        });
    }
    
    // 导出数据
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const data = {};
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('shuxing_')) {
                    try { data[key] = JSON.parse(localStorage.getItem(key)); } catch(e) { data[key] = localStorage.getItem(key); }
                }
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '数星-数据备份-' + new Date().toISOString().substring(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast('数据已导出 ✅', 'success');
        });
    }
    
    // 导入数据
    const importInput = document.getElementById('import-data-input');
    const importBtn = document.getElementById('import-data-btn');
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    for (const [key, val] of Object.entries(data)) {
                        if (key.startsWith('shuxing_')) {
                            localStorage.setItem(key, JSON.stringify(val));
                        }
                    }
                    showToast('数据已导入 ✅ 请刷新页面', 'success');
                    setTimeout(() => location.reload(), 1000);
                } catch(err) {
                    showToast('导入失败：文件格式错误', 'error');
                }
            };
            reader.readAsText(file);
        });
    }
    
    // 清空对话
    const clearBtn = document.getElementById('clear-history-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('确定要清空所有对话历史吗？')) {
                localStorage.removeItem('shuxing_chat_history');
                showToast('对话历史已清空 ✅', 'success');
                loadStats();
            }
        });
    }
}

function initStarBackground() {
    const container = document.getElementById('stars-container');
    if (container && window.StarEffects) {
        StarEffects.start(container);
    }
}

function showToast(message, type) {
    let toast = document.querySelector('.profile-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'profile-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'profile-toast show';
    if (type) toast.classList.add(type);
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}
