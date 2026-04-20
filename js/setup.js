// 数星 - 人格设置页面JavaScript (简化修复版)

// 人格特征数据
const personalityData = {
    zodiac: {
        '白羊': { name: '白羊座', trait: '热情直接，行动力强，喜欢挑战', element: '火', symbol: '♈' },
        '金牛': { name: '金牛座', trait: '稳重固执，注重实际，享受生活', element: '土', symbol: '♉' },
        '双子': { name: '双子座', trait: '多变好奇，善于沟通，思维敏捷', element: '风', symbol: '♊' },
        '巨蟹': { name: '巨蟹座', trait: '敏感体贴，家庭为重，情感丰富', element: '水', symbol: '♋' },
        '狮子': { name: '狮子座', trait: '自信领导，喜欢关注，慷慨大方', element: '火', symbol: '♌' },
        '处女': { name: '处女座', trait: '细致完美，注重细节，服务他人', element: '土', symbol: '♍' },
        '天秤': { name: '天秤座', trait: '平衡和谐，追求美感，善于交际', element: '风', symbol: '♎' },
        '天蝎': { name: '天蝎座', trait: '深沉神秘，情感强烈，直觉敏锐', element: '水', symbol: '♏' },
        '射手': { name: '射手座', trait: '自由乐观，热爱冒险，思想开放', element: '火', symbol: '♐' },
        '摩羯': { name: '摩羯座', trait: '务实责任，目标明确，耐心坚持', element: '土', symbol: '♑' },
        '水瓶': { name: '水瓶座', trait: '独立创新，思想独特，人道主义', element: '风', symbol: '♒' },
        '双鱼': { name: '双鱼座', trait: '浪漫感性，富有同情，想象力丰富', element: '水', symbol: '♓' }
    },
    
    mbti: {
        'INTJ': { name: 'INTJ', trait: '战略思考，独立自主，追求效率', category: '分析师' },
        'INTP': { name: 'INTP', trait: '逻辑分析，好奇心强，理论思维', category: '分析师' },
        'ENTJ': { name: 'ENTJ', trait: '领导决策，目标导向，组织能力强', category: '分析师' },
        'ENTP': { name: 'ENTP', trait: '创新辩论，头脑灵活，喜欢挑战', category: '分析师' },
        'INFJ': { name: 'INFJ', trait: '理想洞察，富有同情，追求意义', category: '外交家' },
        'INFP': { name: 'INFP', trait: '理想价值，敏感细腻，忠于信念', category: '外交家' },
        'ENFJ': { name: 'ENFJ', trait: '激励引导，善于交际，关心他人', category: '外交家' },
        'ENFP': { name: 'ENFP', trait: '热情创意，充满灵感，乐观积极', category: '外交家' },
        'ISTJ': { name: 'ISTJ', trait: '责任传统，务实可靠，注重细节', category: '守护者' },
        'ISFJ': { name: 'ISFJ', trait: '支持关怀，细致负责，保护他人', category: '守护者' },
        'ESTJ': { name: 'ESTJ', trait: '组织管理，高效务实，遵守规则', category: '守护者' },
        'ESFJ': { name: 'ESFJ', trait: '社交和谐，乐于助人，注重传统', category: '守护者' },
        'ISTP': { name: 'ISTP', trait: '实用解决，冷静分析，动手能力强', category: '探险家' },
        'ISFP': { name: 'ISFP', trait: '审美体验，温和敏感，享受当下', category: '探险家' },
        'ESTP': { name: 'ESTP', trait: '行动适应，精力充沛，现实导向', category: '探险家' },
        'ESFP': { name: 'ESFP', trait: '活力社交，热情开朗，享受生活', category: '探险家' }
    }
};

// 用户选择的数据
let userSelections = {
    zodiac: null,
    mbti: null,
    chatHistory: ''
};

// 当前步骤
let currentStep = 1;
const totalSteps = 4;

document.addEventListener('DOMContentLoaded', function() {
    console.log('数星人格设置页面加载完成');
    
    // 初始化页面
    initSetupPage();
    
    // 绑定事件
    bindSetupEvents();
    
    // 加载保存的数据
    loadSavedSelections();
});

// 初始化设置页面
function initSetupPage() {
    console.log('初始化设置页面...');
    
    // 生成星座选项
    generateZodiacOptions();
    
    // 生成MBTI选项
    generateMbtiOptions();
    
    // 初始化字符计数
    updateCharCount();
    
    // 更新进度指示
    updateProgress();
}

// 生成星座选项
function generateZodiacOptions() {
    const zodiacGrid = document.getElementById('zodiac-grid');
    if (!zodiacGrid) {
        console.error('找不到星座网格元素');
        return;
    }
    
    zodiacGrid.innerHTML = '';
    
    Object.entries(personalityData.zodiac).forEach(([key, data]) => {
        const zodiacItem = document.createElement('div');
        zodiacItem.className = 'zodiac-item';
        zodiacItem.dataset.zodiac = key;
        
        zodiacItem.innerHTML = `
            <div class="zodiac-symbol">${data.symbol}</div>
            <div class="zodiac-name">${data.name}</div>
            <div class="zodiac-element">${data.element}象星座</div>
        `;
        
        // 点击事件
        zodiacItem.addEventListener('click', function() {
            selectZodiac(key);
        });
        
        zodiacGrid.appendChild(zodiacItem);
    });
    
    console.log(`生成了 ${Object.keys(personalityData.zodiac).length} 个星座选项`);
}

// 生成MBTI选项
function generateMbtiOptions() {
    const mbtiGrid = document.getElementById('mbti-grid');
    if (!mbtiGrid) {
        console.error('找不到MBTI网格元素');
        return;
    }
    
    mbtiGrid.innerHTML = '';
    
    Object.entries(personalityData.mbti).forEach(([key, data]) => {
        const mbtiItem = document.createElement('div');
        mbtiItem.className = 'mbti-item';
        mbtiItem.dataset.mbti = key;
        
        mbtiItem.innerHTML = `
            <div class="mbti-type">${data.name}</div>
            <div class="mbti-category">${data.category}</div>
            <div class="mbti-trait">${data.trait}</div>
        `;
        
        // 点击事件
        mbtiItem.addEventListener('click', function() {
            selectMbti(key);
        });
        
        mbtiGrid.appendChild(mbtiItem);
    });
    
    console.log(`生成了 ${Object.keys(personalityData.mbti).length} 个MBTI选项`);
}

// 选择星座
function selectZodiac(zodiacKey) {
    console.log('选择星座:', zodiacKey);
    
    // 移除之前的选择
    document.querySelectorAll('.zodiac-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 添加当前选择
    const selectedItem = document.querySelector(`.zodiac-item[data-zodiac="${zodiacKey}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // 保存选择
    userSelections.zodiac = zodiacKey;
    
    // 显示预览
    const preview = document.getElementById('zodiac-preview');
    const selectedZodiac = document.getElementById('selected-zodiac');
    
    if (preview && selectedZodiac) {
        const zodiacData = personalityData.zodiac[zodiacKey];
        selectedZodiac.textContent = `${zodiacData.name} (${zodiacData.element}象)`;
        preview.style.display = 'block';
    }
    
    // 保存到本地存储
    saveSelections();
    
    // 自动进入下一步（可选）
    setTimeout(() => {
        nextStep();
    }, 500);
}

// 选择MBTI
function selectMbti(mbtiKey) {
    console.log('选择MBTI:', mbtiKey);
    
    // 移除之前的选择
    document.querySelectorAll('.mbti-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 添加当前选择
    const selectedItem = document.querySelector(`.mbti-item[data-mbti="${mbtiKey}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // 保存选择
    userSelections.mbti = mbtiKey;
    
    // 显示预览
    const preview = document.getElementById('mbti-preview');
    const selectedMbti = document.getElementById('selected-mbti');
    
    if (preview && selectedMbti) {
        const mbtiData = personalityData.mbti[mbtiKey];
        selectedMbti.textContent = `${mbtiData.name} (${mbtiData.category})`;
        preview.style.display = 'block';
    }
    
    // 保存到本地存储
    saveSelections();
    
    // 自动进入下一步（可选）
    setTimeout(() => {
        nextStep();
    }, 500);
}

// 更新字符计数
function updateCharCount() {
    const chatInput = document.getElementById('chat-history');
    const charCount = document.getElementById('char-count');
    
    if (!chatInput || !charCount) return;
    
    const count = chatInput.value.length;
    charCount.textContent = count;
    
    // 保存聊天记录
    userSelections.chatHistory = chatInput.value;
    saveSelections();
}

// 更新进度指示
function updateProgress() {
    // 更新步骤指示器
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else if (stepNumber < currentStep) {
            step.classList.remove('active');
            step.classList.add('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
    
    // 显示当前步骤
    document.querySelectorAll('.setup-section').forEach((section, index) => {
        const sectionNumber = index + 1;
        
        if (sectionNumber === currentStep) {
            section.classList.add('active');
            section.style.display = 'block';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });
}

// 下一步
function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress();
    }
}

// 上一步
function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateProgress();
    }
}

// 完成设置
function completeSetup() {
    console.log('完成人格设置:', userSelections);
    
    // 验证必填项
    if (!userSelections.zodiac || !userSelections.mbti) {
        alert('请先选择星座和MBTI类型');
        return;
    }
    
    // 创建人格模型
    const model = {
        modelId: 'model_' + Date.now(),
        zodiac: userSelections.zodiac,
        mbti: userSelections.mbti,
        chatHistory: userSelections.chatHistory,
        createdAt: new Date().toISOString()
    };
    
    try {
        // 保存当前模型
        localStorage.setItem('shuxing_current_model', JSON.stringify(model));
        
        // 保存到历史记录
        let history = JSON.parse(localStorage.getItem('shuxing_model_history') || '[]');
        history.unshift(model);
        if (history.length > 10) history = history.slice(0, 10);
        localStorage.setItem('shuxing_model_history', JSON.stringify(history));
        
        console.log('人格模型已保存:', model);
        
        // 显示成功消息
        alert('人格模型创建成功！\n\n现在可以开始对话了。');
        
        // 跳转到对话页面
        window.location.href = 'chat.html';
        
    } catch (error) {
        console.error('保存模型失败:', error);
        alert('保存失败，请检查浏览器设置');
    }
}

// 保存选择到本地存储
function saveSelections() {
    try {
        // 保存到两个键名，确保兼容性
        localStorage.setItem('数星_用户选择', JSON.stringify(userSelections));
        localStorage.setItem('shuxing_user_settings', JSON.stringify(userSelections));
        console.log('选择已保存:', userSelections);
    } catch (error) {
        console.error('保存选择失败:', error);
    }
}

// 从本地存储加载选择
function loadSavedSelections() {
    try {
        // 优先使用新的键名，如果不存在则使用旧的
        let saved = localStorage.getItem('shuxing_user_settings');
        if (!saved) {
            saved = localStorage.getItem('数星_用户选择');
        }
        
        if (saved) {
            const parsed = JSON.parse(saved);
            userSelections = { ...userSelections, ...parsed };
            console.log('已加载保存的选择:', userSelections);
            
            // 恢复UI状态
            if (userSelections.zodiac) {
                selectZodiac(userSelections.zodiac);
            }
            
            if (userSelections.mbti) {
                selectMbti(userSelections.mbti);
            }
            
            if (userSelections.chatHistory) {
                const chatInput = document.getElementById('chat-history');
                if (chatInput) {
                    chatInput.value = userSelections.chatHistory;
                    updateCharCount();
                }
            }
        }
    } catch (error) {
        console.error('加载保存的选择失败:', error);
    }
}

// 绑定事件
function bindSetupEvents() {
    console.log('绑定设置页面事件...');
    
    // 下一步按钮
    const nextButtons = document.querySelectorAll('.next-btn');
    nextButtons.forEach(btn => {
        btn.addEventListener('click', nextStep);
    });
    
    // 上一步按钮
    const prevButtons = document.querySelectorAll('.prev-btn');
    prevButtons.forEach(btn => {
        btn.addEventListener('click', prevStep);
    });
    
    // 完成按钮
    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', completeSetup);
    }
    
    // 聊天记录输入
    const chatInput = document.getElementById('chat-history');
    if (chatInput) {
        chatInput.addEventListener('input', updateCharCount);
        
        // 自动调整高度
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
    
    // 示例按钮
    const exampleBtn = document.getElementById('example-btn');
    if (exampleBtn) {
        exampleBtn.addEventListener('click', function() {
            const examples = [
                "今天天气真好，我们出去走走吧~ 记得带伞哦，可能会下雨。",
                "我最近在看那部新剧，超级好看！你要不要也看看？",
                "工作好累啊，今天又被老板说了... 好想辞职😭",
                "周末有什么计划吗？我想去那家新开的咖啡馆试试。"
            ];
            
            const randomExample = examples[Math.floor(Math.random() * examples.length)];
            const chatInput = document.getElementById('chat-history');
            if (chatInput) {
                chatInput.value = randomExample;
                updateCharCount();
                
                // 触发高度调整
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
            }
        });
    }
    
    console.log('事件绑定完成');
}

// 工具函数：分析聊天风格（简化版）
function analyzeChatStyle(chatText) {
    if (!chatText || chatText.trim().length === 0) {
        return '未提供聊天记录，将使用默认风格';
    }
    
    const analysis = [];
    
    // 检查语气词
    const toneWords = ['呀', '啦', '呢', '嘛', '喔', '诶', '哇', '哦'];
    const hasToneWords = toneWords.some(word => chatText.includes(word));
    if (hasToneWords) analysis.push('喜欢使用语气词');
    
    // 检查表情符号
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/gu;
    const hasEmoji = emojiRegex.test(chatText);
    if (hasEmoji) analysis.push('喜欢使用表情符号');
    
    // 检查标点习惯
    const hasEllipsis = chatText.includes('...') || chatText.includes('……');
    if (hasEllipsis) analysis.push('习惯使用省略号');
    
    const hasExclamation = (chatText.match(/!/g) || []).length > 3;
    if (hasExclamation) analysis.push('喜欢使用感叹号');
    
    const hasQuestion = (chatText.match(/\?/g) || []).length > 3;
    if (hasQuestion) analysis.push('喜欢提问');
    
    // 返回分析结果
    if (analysis.length === 0) {
        return '聊天风格较为中性直接';
    }
    
    return analysis.join('，');
}

// 工具函数：生成人格洞察
function generatePersonalityInsight() {
    if (!userSelections.zodiac || !userSelections.mbti) {
        return '请先选择星座和MBTI类型'; 
    }
    
    const zodiacData = personalityData.zodiac[userSelections.zodiac];
    const mbtiData = personalityData.mbti[userSelections.mbti];
    
    const insights = [
        `作为${zodiacData.name}(${zodiacData.element}象)，${zodiacData.trait}`,
        `MBTI类型为${mbtiData.name}(${mbtiData.category})，${mbtiData.trait}`,
        `这种组合通常表现出较强的${zodiacData.element === '火' || zodiacData.element === '风' ? '外向性' : '内向性'}特征`
    ];
    
    if (userSelections.chatHistory && userSelections.chatHistory.trim().length > 0) {
        const style = analyzeChatStyle(userSelections.chatHistory);
        insights.push(`从聊天记录分析：${style}`);
    }
    
    return insights.join('。');
}

// 导出函数供其他页面使用
window.setupUtils = {
    personalityData,
    userSelections,
    saveSelections,
    loadSavedSelections,
    generatePersonalityInsight,
    analyzeChatStyle
};

console.log('数星人格设置页面初始化完成');