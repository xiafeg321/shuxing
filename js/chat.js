// 数星 - 聊天页面逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let currentMode = 'companion'; // 'companion' 或 'counseling'
    let chatHistory = [];
    let traitsData = {};
    let userSettings = {};
    
    // DOM 元素
    const companionModeBtn = document.getElementById('companion-mode');
    const counselingModeBtn = document.getElementById('counseling-mode');
    const modeSelection = document.querySelector('.mode-selection');
    const chatInterface = document.getElementById('chat-interface');
    const modeIcon = document.getElementById('mode-icon');
    const modeTitle = document.getElementById('mode-title');
    const personaInfo = document.getElementById('persona-info');
    const zodiacDisplay = document.getElementById('zodiac-display');
    const mbtiDisplay = document.getElementById('mbti-display');
    const switchModeBtn = document.getElementById('switch-mode-btn');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const charCount = document.getElementById('char-count');
    const quickReplies = document.querySelectorAll('.quick-reply');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const exportChatBtn = document.getElementById('export-chat-btn');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpModal = document.getElementById('close-help-modal');
    
    // 初始化
    init();
    
    async function init() {
        // 加载人格特征数据
        await loadTraitsData();
        
        // 加载用户设置
        loadUserSettings();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 更新字符计数
        updateCharCount();
        
        // 加载之前的对话历史
        loadChatHistory();
    }
    
    async function loadTraitsData() {
        try {
            const response = await fetch('data/traits.json');
            traitsData = await response.json();
            console.log('人格特征数据加载成功');
        } catch (error) {
            console.error('加载人格特征数据失败:', error);
            // 使用默认数据
            traitsData = {
                zodiacTraits: {},
                mbtiTraits: {},
                replyTemplates: {
                    companion: { greeting: ['欢迎！'] },
                    counseling: { greeting: ['你好！'] }
                }
            };
        }
    }
    
    function loadUserSettings() {
        const savedSettings = localStorage.getItem('shuxing_user_settings');
        if (savedSettings) {
            userSettings = JSON.parse(savedSettings);
            updatePersonaDisplay();
        } else {
            // 如果没有设置，使用默认值
            userSettings = {
                zodiac: '白羊',
                mbti: 'ENFP',
                chatHistory: ''
            };
            showSetupReminder();
        }
    }
    
    function updatePersonaDisplay() {
        zodiacDisplay.textContent = userSettings.zodiac || '未设置';
        mbtiDisplay.textContent = userSettings.mbti || '未设置';
    }
    
    function showSetupReminder() {
        const reminder = document.createElement('div');
        reminder.className = 'message system-message';
        reminder.innerHTML = `
            <div class="message-content">
                <p><strong>⚠️ 请先设置人格模型</strong></p>
                <p>你还没有设置TA的星座和MBTI类型，这会影响对话质量。</p>
                <p>建议先前往<a href="setup.html" style="color: #8c98ff; text-decoration: underline;">人格设置页面</a>完成设置。</p>
            </div>
            <div class="message-time">现在</div>
        `;
        chatMessages.appendChild(reminder);
    }
    
    function setupEventListeners() {
        // 模式选择
        companionModeBtn.addEventListener('click', () => selectMode('companion'));
        counselingModeBtn.addEventListener('click', () => selectMode('counseling'));
        
        // 切换模式按钮
        switchModeBtn.addEventListener('click', toggleMode);
        
        // 消息输入
        messageInput.addEventListener('input', updateCharCount);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // 发送按钮
        sendBtn.addEventListener('click', sendMessage);
        
        // 快速回复
        quickReplies.forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-text');
                messageInput.value = text;
                updateCharCount();
                messageInput.focus();
            });
        });
        
        // 控制按钮
        clearChatBtn.addEventListener('click', clearChat);
        exportChatBtn.addEventListener('click', exportChat);
        helpBtn.addEventListener('click', showHelpModal);
        
        // 模态框
        closeHelpModal.addEventListener('click', hideHelpModal);
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) {
                hideHelpModal();
            }
        });
        
        // 自动调整文本区域高度
        messageInput.addEventListener('input', autoResizeTextarea);
    }
    
    function selectMode(mode) {
        currentMode = mode;
        
        // 隐藏模式选择，显示对话界面
        modeSelection.style.display = 'none';
        chatInterface.style.display = 'block';
        
        // 更新界面显示
        updateModeDisplay();
        
        // 添加欢迎消息
        addWelcomeMessage();
    }
    
    function updateModeDisplay() {
        if (currentMode === 'companion') {
            modeIcon.className = 'fas fa-heart';
            modeTitle.textContent = '陪伴对话模式';
            switchModeBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> 切换到情感咨询';
        } else {
            modeIcon.className = 'fas fa-hands-helping';
            modeTitle.textContent = '情感咨询模式';
            switchModeBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> 切换到陪伴对话';
        }
    }
    
    function toggleMode() {
        currentMode = currentMode === 'companion' ? 'counseling' : 'companion';
        updateModeDisplay();
        
        // 添加模式切换提示
        addSystemMessage(`已切换到${currentMode === 'companion' ? '陪伴对话' : '情感咨询'}模式`);
    }
    
    function addWelcomeMessage() {
        const greetings = currentMode === 'companion' 
            ? traitsData.replyTemplates?.companion?.greeting 
            : traitsData.replyTemplates?.counseling?.greeting;
        
        const greeting = greetings ? greetings[Math.floor(Math.random() * greetings.length)] : '你好！';
        
        addSystemMessage(greeting);
    }
    
    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
            <div class="message-time">现在</div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        // 保存到历史
        chatHistory.push({
            type: 'system',
            content: text,
            timestamp: new Date().toISOString()
        });
        saveChatHistory();
    }
    
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // 添加用户消息
        addUserMessage(message);
        
        // 清空输入框
        messageInput.value = '';
        updateCharCount();
        autoResizeTextarea();
        
        // 生成回复
        setTimeout(() => {
            generateReply(message);
        }, 500);
    }
    
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.style.marginLeft = 'auto';
        messageDiv.style.marginRight = '0';
        messageDiv.innerHTML = `
            <div class="message-content" style="background: linear-gradient(135deg, #8c98ff 0%, #6c7bff 100%); color: white;">
                <p>${text}</p>
            </div>
            <div class="message-time">刚刚</div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        // 保存到历史
        chatHistory.push({
            type: 'user',
            content: text,
            timestamp: new Date().toISOString()
        });
        saveChatHistory();
    }
    
    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
            <div class="message-time">刚刚</div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        // 保存到历史
        chatHistory.push({
            type: 'bot',
            content: text,
            timestamp: new Date().toISOString()
        });
        saveChatHistory();
    }
    
    function generateReply(userMessage) {
        let reply = '';
        
        if (currentMode === 'companion') {
            reply = generateCompanionReply(userMessage);
        } else {
            reply = generateCounselingReply(userMessage);
        }
        
        // 模拟AI思考时间
        setTimeout(() => {
            addBotMessage(reply);
        }, 800 + Math.random() * 1200);
    }
    
    function generateCompanionReply(userMessage) {
        // 分析情感
        const emotion = analyzeEmotion(userMessage);
        
        // 获取回复模板
        const templates = traitsData.replyTemplates?.companion || {};
        let templateCategory = 'support';
        
        if (emotion === 'sad' && templates.comfort) {
            templateCategory = 'comfort';
        } else if (emotion === 'angry' && templates.comfort) {
            templateCategory = 'comfort';
        } else if (emotion === 'confused' && templates.encouragement) {
            templateCategory = 'encouragement';
        } else if (emotion === 'lonely' && templates.support) {
            templateCategory = 'support';
        } else if (emotion === 'happy' && templates.daily) {
            templateCategory = 'daily';
        }
        
        const templateArray = templates[templateCategory] || templates.support || ['我在这里陪着你'];
        const baseReply = templateArray[Math.floor(Math.random() * templateArray.length)];
        
        // 结合人格特征
        const zodiacTrait = traitsData.zodiacTraits?.[userSettings.zodiac]?.traits || '';
        const mbtiTrait = traitsData.mbtiTraits?.[userSettings.mbti]?.traits || '';
        
        let personalityAddition = '';
        if (zodiacTrait && mbtiTrait) {
            const additions = [
                `作为${userSettings.zodiac}座${userSettings.mbti}性格的人，${zodiacTrait}，${mbtiTrait}。`,
                `从${userSettings.zodiac}座${userSettings.mbti}的角度来看，`,
                `考虑到TA是${userSettings.zodiac}座${userSettings.mbti}类型，`
            ];
            personalityAddition = additions[Math.floor(Math.random() * additions.length)];
        }
        
        // 组合回复
        const finalReply = personalityAddition + baseReply;
        
        return finalReply;
    }
    
    function generateCounselingReply(userMessage) {
        // 分析问题类型
        const questionType = classifyQuestion(userMessage);
        
        // 获取建议模板
        const templates = traitsData.replyTemplates?.counseling || {};
        let templateCategory = 'advice';
        
        if (questionType === 'why-breakup' && templates.analysis) {
            templateCategory = 'analysis';
        } else if (questionType === 'how-to-let-go' && templates.healing) {
            templateCategory = 'healing';
        } else if (questionType === 'should-reconcile' && templates.advice) {
            templateCategory = 'advice';
        } else if (questionType === 'self-growth' && templates.reflection) {
            templateCategory = 'reflection';
        }
        
        const templateArray = templates[templateCategory] || templates.advice || ['我建议你可以尝试...'];
        const baseReply = templateArray[Math.floor(Math.random() * templateArray.length)];
        
        // 结合星座和MBTI的针对性建议
        const zodiacAdvice = traitsData.zodiacSpecificAdvice?.[userSettings.zodiac] || '';
        const mbtiAdvice = traitsData.mbtiSpecificAdvice?.[userSettings.mbti] || '';
        
        let specificAdvice = '';
        if (zodiacAdvice && mbtiAdvice) {
            specificAdvice = ` 对于${userSettings.zodiac}座的你，${zodiacAdvice} 作为${userSettings.mbti}类型，${mbtiAdvice}`;
        }
        
        // 组合回复
        const finalReply = baseReply + specificAdvice;
        
        return finalReply;
    }
    
    function analyzeEmotion(text) {
        const emotionKeywords = traitsData.emotionKeywords || {};
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return emotion;
                }
            }
        }
        
        return 'neutral';
    }
    
    function classifyQuestion(text) {
        const keywords = {
            'why-breakup': ['为什么分手', '分手原因', '为什么离开', '结束的原因'],
            'how-to-let-go': ['怎么放下', '如何忘记', '怎么走出来', '放下感情'],
            'should-reconcile': ['要不要复合', '是否挽回', '重新开始', '回头'],
            'self-growth': ['成长', '学习', '收获', '明白', '懂得']
        };
        
        for (const [type, kwList] of Object.entries(keywords)) {
            for (const keyword of kwList) {
                if (text.includes(keyword)) {
                    return type;
                }
            }
        }
        
        return 'general';
    }
    
    function updateCharCount() {
        const count = messageInput.value.length;
        charCount.textContent = count;
        
        // 更新发送按钮状态
        sendBtn.disabled = count === 0;
    }
    
    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    }
    
    function clearChat() {
        if (confirm('确定要清空当前对话吗？')) {
            chatMessages.innerHTML = '';
            chatHistory = [];
            localStorage.removeItem('shuxing_chat_history');
            addSystemMessage('对话已清空。有什么想聊的吗？');
        }
    }
    
    function exportChat() {
        if (chatHistory.length === 0) {
            alert('还没有对话内容可以导出');
            return;
        }
        
        const exportData = {
            exportDate: new Date().toISOString(),
            userSettings: userSettings,
            chatHistory: chatHistory,
            mode: currentMode
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `数星对话记录_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addSystemMessage('对话记录已导出为JSON文件');
    }
    
    function showHelpModal() {
        helpModal.classList.add('show');
    }
    
    function hideHelpModal() {
        helpModal.classList.remove('show');
    }
    
    function loadChatHistory() {
        const savedHistory = localStorage.getItem('shuxing_chat_history');
        if (savedHistory) {
            try {
                chatHistory = JSON.parse(savedHistory);
                
                // 只显示最近20条消息
                const recentHistory = chatHistory.slice(-20);
                
                recentHistory.forEach(msg => {
                    if (msg.type === 'user') {
                        addUserMessage(msg.content);
                    } else if (msg.type === 'bot') {
                        addBotMessage(msg.content);
                    } else if (msg.type === 'system') {
                        addSystemMessage(msg.content);
                    }
                });
            } catch (error) {
                console.error('加载对话历史失败:', error);
            }
        }
    }
    
    function saveChatHistory() {
        // 只保存最近100条消息
        const recentHistory = chatHistory.slice(-100);
        localStorage.setItem('shuxing_chat_history', JSON.stringify(recentHistory));
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});