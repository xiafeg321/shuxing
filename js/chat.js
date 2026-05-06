/**
 * 数星 - 对话页面脚本 V4（V1迭代：核心对话逻辑重写）
 * 改进点：
 *   1. 开场白也走AI生成（不用本地模板）
 *   2. 修复本地降级bug
 *   3. 动态快速回复（根据人格+模式）
 *   4. 防重复提交
 *   5. 对话节奏控制
 */

// ===== DeepSeek API配置 =====
const AI_CONFIG = {
    apiKey: 'sk-f01481a824b243b28999980106c876c8',
    baseURL: '',  // 留空走同域代理(/api/chat)
    model: 'deepseek-v4-flash',
    enabled: true
};

// ===== 全局数据引用 =====
const PERSONALITY = window.PERSONALITY || {};

// ===== 对话节奏控制 =====
const RHYTHM = {
    lastReplyLength: 0,
    lastStructures: [],      // 记录最近5次的句式结构
    companionVariance: 0.3, // 陪伴模式回复长度的随机波动比例
    
    // 判断是否和上次回复太像
    isRepetitive: function(newText) {
        if (!newText) return false;
        // 检查开头句式是否重复
        const first5 = newText.substring(0, Math.min(newText.length, 8));
        for (const s of this.lastStructures) {
            if (s && newText.startsWith(s)) return true;
        }
        return false;
    },
    
    track: function(text) {
        this.lastReplyLength = text ? text.length : 0;
        if (text) {
            this.lastStructures.push(text.substring(0, Math.min(text.length, 8)));
            if (this.lastStructures.length > 5) this.lastStructures.shift();
        }
    },
    
    // 获取适合当前对话节奏的长度范围
    getTargetLength: function(mode) {
        if (mode === 'companion') {
            // 陪伴模式：15-60字，偶尔长一点
            const base = 25 + Math.floor(Math.random() * 30);
            const variance = Math.floor(base * this.companionVariance * (Math.random() - 0.5));
            return Math.max(15, Math.min(80, base + variance));
        }
        // 咨询模式：50-200字
        return 60 + Math.floor(Math.random() * 120);
    }
};

// ===== 对话页面逻辑 =====
document.addEventListener('DOMContentLoaded', function() {
    // ---------- 状态 ----------
    let currentMode = 'companion';
    let chatHistory = [];
    let isWaiting = false;
    let userSettings = {};
    let conversationStarted = false;
    let systemPromptBuilt = false;
    let cachedSystemPrompt = '';
    let useAPIModel = AI_CONFIG.enabled;  // true=用DeepSeek, false=用本地引擎(免费)
    
    // ---------- DOM ----------
    const modeSelection = document.querySelector('.mode-selection');
    const chatInterface = document.getElementById('chat-interface');
    const modeIcon = document.getElementById('mode-icon');
    const modeTitle = document.getElementById('mode-title');
    const modeIndicator = document.getElementById('mode-indicator');
    const personaInfo = document.getElementById('persona-info');
    const switchBtn = document.getElementById('switch-mode-btn');
    const messagesEl = document.getElementById('chat-messages');
    const inputEl = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const charCountEl = document.getElementById('char-count');
    const quickReplyContainer = document.getElementById('quick-replies');
    const clearBtn = document.getElementById('clear-chat-btn');
    const exportBtn = document.getElementById('export-chat-btn');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help-modal');
    const companionCard = document.getElementById('companion-mode-card');
    const counselingCard = document.getElementById('counseling-mode-card');
    const themeToggle = document.getElementById('theme-toggle-btn');
    const summaryBtn = document.getElementById('summary-btn');
    
    // ---------- 启动 ----------
    init();
    
    // 模型切换事件
    const modelBadge = document.getElementById('model-badge');
    if (modelBadge) {
        modelBadge.addEventListener('click', function() {
            useAPIModel = !useAPIModel;
            if (useAPIModel) {
                this.innerHTML = '🌐 DeepSeek';
                this.style.background = '#e8eaff';
                this.style.color = '#5c6bcc';
                showToast('已切换到AI模型，回复更智能 ✨', 'info');
            } else {
                this.innerHTML = '💻 免费本地';
                this.style.background = '#e6ffe6';
                this.style.color = '#2d7a2d';
                showToast('已切换到本地引擎，完全免费 💰', 'info');
            }
        });
    }
    
    function init() {
        loadSettings();
        bindEvents();
        loadChatHistory();
        updateCharCount();
        checkSetup();
        updatePlaceholder();
        updateDynamicQuickReplies();
        
        if (userSettings.zodiac && userSettings.mbti && modeSelection) {
            const hint = document.createElement('div');
            hint.style.cssText = 'text-align:center;padding:8px 16px;background:linear-gradient(135deg,#f0f2ff,#fafbff);border-radius:12px;margin-top:-8px;margin-bottom:8px;font-size:0.85rem;color:var(--text-secondary);';
            hint.innerHTML = '✨ 已加载人格模型，选择模式即可开始对话';
            modeSelection.insertBefore(hint, modeSelection.querySelector('.mode-cards'));
        }
    }
    
    function loadSettings() {
        const saved = localStorage.getItem('shuxing_user_settings');
        if (saved) {
            try { userSettings = JSON.parse(saved); } catch (e) { userSettings = {}; }
        }
    }
    
    function checkSetup() {
        if (!userSettings.zodiac || !userSettings.mbti) {
            const reminder = document.createElement('div');
            reminder.className = 'message system-message';
            reminder.innerHTML = `
                <div class="message-content" style="background: linear-gradient(135deg, #fff8e6, #fffbee);border:1px solid #fde68a;">
                    <p>⚠️ 还没有设置人格模型</p>
                    <p style="font-size:0.9rem;color:#92400e;">建议先<a href="setup.html" style="color:#7c8aff;text-decoration:underline;">创建人格模型</a>，以获得更好的对话体验</p>
                </div>
            `;
            messagesEl.appendChild(reminder);
        }
    }
    
    // ---------- 事件绑定 ----------
    function bindEvents() {
        if (companionCard) companionCard.addEventListener('click', () => startMode('companion'));
        if (counselingCard) counselingCard.addEventListener('click', () => startMode('counseling'));
        if (switchBtn) switchBtn.addEventListener('click', toggleMode);
        
        if (inputEl) {
            inputEl.addEventListener('input', function() {
                updateCharCount();
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
            inputEl.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMsg();
                }
            });
        }
        if (sendBtn) sendBtn.addEventListener('click', sendMsg);
        
        document.querySelectorAll('.quick-reply').forEach(btn => {
            btn.addEventListener('click', function() {
                if (inputEl) {
                    inputEl.value = this.getAttribute('data-text') || this.textContent;
                    updateCharCount();
                    inputEl.focus();
                }
            });
        });
        
        if (clearBtn) clearBtn.addEventListener('click', clearChat);
        if (exportBtn) exportBtn.addEventListener('click', exportChat);
        if (helpBtn) helpBtn.addEventListener('click', () => helpModal?.classList.add('show'));
        if (closeHelp) closeHelp.addEventListener('click', () => helpModal?.classList.remove('show'));
        if (helpModal) helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.classList.remove('show'); });
        
        // 暗色模式切换
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                const html = document.documentElement;
                const isDark = html.getAttribute('data-theme') === 'dark';
                if (isDark) {
                    html.removeAttribute('data-theme');
                    this.innerHTML = '<i class="fas fa-moon"></i>';
                    localStorage.setItem('shuxing_theme', 'light');
                } else {
                    html.setAttribute('data-theme', 'dark');
                    this.innerHTML = '<i class="fas fa-sun"></i>';
                    localStorage.setItem('shuxing_theme', 'dark');
                }
            });
            
            // 恢复上次主题
            const savedTheme = localStorage.getItem('shuxing_theme');
            if (savedTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
        
        // 对话总结
        if (summaryBtn) {
            summaryBtn.addEventListener('click', function() {
                if (chatHistory.length < 4) {
                    showCopyToast('💬 再聊几句就可以生成总结了');
                    return;
                }
                generateConversationSummary();
            });
        }
    }
    
    // ---------- 动态快速回复 ----------
    function updateDynamicQuickReplies() {
        if (!quickReplyContainer) return;
        const hasPersona = userSettings.zodiac && userSettings.mbti;
        const mode = currentMode;
        
        let replies;
        if (mode === 'companion') {
            replies = hasPersona 
                ? ['今天心情不太好', '好想找人说说话', '能陪我一会吗', '不知道该怎么办']
                : ['今天心情不太好', '好想找人说说话', '能陪我一会吗', '聊聊日常吧'];
        } else {
            replies = hasPersona
                ? ['帮我分析一下这段关系', '他到底在想什么', '我该怎么走出来', '我们还有可能吗']
                : ['帮我分析一段感情', '我感觉很难受', '如何放下一个人', '我该怎么办'];
        }
        
        quickReplyContainer.innerHTML = replies.map(t => 
            `<button class="quick-reply" data-text="${t}">${t}</button>`
        ).join('');
        
        // 重新绑定事件
        quickReplyContainer.querySelectorAll('.quick-reply').forEach(btn => {
            btn.addEventListener('click', function() {
                if (inputEl) {
                    inputEl.value = this.getAttribute('data-text') || this.textContent;
                    updateCharCount();
                    inputEl.focus();
                }
            });
        });
    }
    
    // ---------- 模式 ----------
    function startMode(mode) {
        currentMode = mode;
        systemPromptBuilt = false;
        cachedSystemPrompt = '';
        RHYTHM.lastStructures = [];
        
        if (modeSelection) modeSelection.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'flex';
        updateModeDisplay();
        updateDynamicQuickReplies();
        
        // 开场白走AI生成
        if (!conversationStarted) {
            conversationStarted = true;
            generateOpening().then(msg => {
                if (msg) {
                    addBotMessage(msg);
                } else {
                    const hasPersona = userSettings.zodiac && userSettings.mbti;
                    const fallback = hasPersona 
                        ? `你来了~ 想聊什么都可以和我说哦`
                        : '你好~ 我在这儿呢，想聊什么都可以告诉我';
                    addBotMessage(fallback);
                }
            });
        }
    }
    
    // AI生成开场白
    async function generateOpening() {
        const hasPersona = userSettings.zodiac && userSettings.mbti;
        const zd = hasPersona ? PERSONALITY.zodiac[userSettings.zodiac] : null;
        const md = hasPersona ? PERSONALITY.mbti[userSettings.mbti] : null;
        
        let prompt;
        if (currentMode === 'companion') {
            prompt = zd && md
                ? `你是${zd.name}、${md.name}类型的人。请用你的性格和口吻和用户打招呼，说一句开场白。自然简短，一句话就好，像微信聊天那样。不用问"有什么想聊的"或"可以告诉我"。`
                : `你是一个温暖的朋友。请用自然的口吻和用户打招呼，说一句开场白。一句话，轻松自然。`;
        } else {
            prompt = zd && md
                ? `你是情感咨询顾问，通晓星座MBTI专业分析。请用温暖专业的口吻做开场白，表明你已准备好基于${zd.name}和${md.name}的人格特征为用户提供分析。一句话即可。`
                : `你是一个温暖专业的情感顾问。请做开场白，说你准备好倾听和分析了。一句话即可。`;
        }
        
        try {
            const systemMsg = zd && md 
                ? `人格特征：${zd.name}（${zd.element}象）。性格：${zd.deep}沟通风格：${zd.style}。MBTI：${md.name}（${md.category}）。沟通风格：${md.style}。`
                : '';
            
            const body = { messages: [
                { role: 'system', content: systemMsg || '你是温暖的对话助手。' },
                { role: 'user', content: prompt }
            ], temperature: 0.8, max_tokens: 100 };
            
            const res = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.choices?.[0]?.message?.content?.trim()) {
                return data.choices[0].message.content.trim();
            }
        } catch (e) {}
        return null;
    }
    
    function updateModeDisplay() {
        if (modeIcon) modeIcon.className = currentMode === 'companion' ? 'fas fa-star' : 'fas fa-compass';
        if (modeTitle) modeTitle.textContent = currentMode === 'companion' ? '🌟 星伴' : '🔍 星析';
        if (modeIndicator) modeIndicator.textContent = currentMode === 'companion' ? '星伴模式' : '星析模式';
        if (switchBtn) switchBtn.innerHTML = currentMode === 'companion' 
            ? '<i class="fas fa-exchange-alt"></i> 切换到星析模式'
            : '<i class="fas fa-exchange-alt"></i> 切换到星伴模式';
        if (personaInfo) {
            if (userSettings.zodiac && userSettings.mbti) {
                const zd = PERSONALITY.zodiac[userSettings.zodiac];
                personaInfo.textContent = `基于 ${zd?.name || userSettings.zodiac} · ${userSettings.mbti}`;
            } else {
                personaInfo.textContent = currentMode === 'companion' 
                    ? '让那个人"活"在对话里'
                    : '帮你分析这段关系，给建议和方向';
            }
        }
        updatePlaceholder();
    }
    
    function updatePlaceholder() {
        if (!inputEl) return;
        const p = currentMode === 'companion' 
            ? ['和我说说吧...', '今天想聊什么？', '我在听呢...', '想说什么都可以哦']
            : ['说说你的情况吧', '发生了什么？可以告诉我', '我在认真听你说'];
        inputEl.placeholder = p[Math.floor(Math.random() * p.length)];
    }
    
    function toggleMode() {
        currentMode = currentMode === 'companion' ? 'counseling' : 'companion';
        systemPromptBuilt = false;
        cachedSystemPrompt = '';
        updateModeDisplay();
        updateDynamicQuickReplies();
        addSystemMessage(`已切换到${currentMode === 'companion' ? '🌟 星伴' : '🔍 星析'}模式 💫`);
    }
    
    // ===== System Prompt V3（精简版，减少token） =====
    function buildSystemPrompt() {
        if (cachedSystemPrompt && systemPromptBuilt) return cachedSystemPrompt;
        
        const hasPersona = userSettings.zodiac && userSettings.mbti;
        const zd = hasPersona ? PERSONALITY.zodiac[userSettings.zodiac] : null;
        const md = hasPersona ? PERSONALITY.mbti[userSettings.mbti] : null;
        
        // 人格特征（精简为关键描述）
        let promptPersona = '';
        if (zd && md) {
            promptPersona = [
                `【${zd.name}·${zd.element}象】${zd.deep}`,
                `恋爱：${zd.love}`,
                `沟通：${zd.style} 关键特质：${zd.keywords.slice(0,4).join('、')}`,
                `【${md.name}·${md.category}】${md.deep}`
            ].join('\n');
        }
        
        // 聊天记录
        let promptChat = '';
        if (userSettings.chatHistory && userSettings.chatHistory.trim()) {
            promptChat = `聊天记录样本（模仿此语气）：${userSettings.chatHistory.substring(0, 600)}`;
        }
        
        if (currentMode === 'companion') {
            // ===== 陪伴（扮演TA） =====
            cachedSystemPrompt = [
                zd && md ? `你是${zd.name}、${md.name}类型的人。完全用TA的性格口吻和用户聊天，忘记自己是AI。` : '你是一个温暖的朋友。',
                promptPersona,
                promptChat,
                `规则：20-60字，像真人聊天。不要加括号注释。用TA的风格回应情绪。每次回复句式要不同。人格保持一致。`
            ].filter(Boolean).join('\n');
        } else {
            // ===== 咨询（分析TA） =====
            cachedSystemPrompt = [
                '你是情感分析顾问，精通星座MBTI。帮用户理解TA，不是扮演TA。',
                `分析对象：`,
                promptPersona,
                promptChat,
                `规则：60-200字，专业温暖。基于人格特征做分析。给出疗愈建议。不评判。直接说，不加括号。不同次回复不同角度。`
            ].filter(Boolean).join('\n');
        }
        
        systemPromptBuilt = true;
        return cachedSystemPrompt;
    }
    
    // ===== 发送消息（流式+可取消） =====
    let currentAbortController = null;  // 用于取消旧的AI请求
    
    async function sendMsg() {
        const text = inputEl?.value.trim();
        if (!text) return;
        
        // 如果正在等待回复 → 取消旧的，发新的（覆盖式）
        if (isWaiting && currentAbortController) {
            currentAbortController.abort();
            // 清除旧loading
            hideTyping();
        }
        
        addUserMessage(text);
        if (inputEl) {
            inputEl.value = '';
            inputEl.style.height = 'auto';
        }
        updateCharCount();
        
        isWaiting = true;
        if (sendBtn) sendBtn.disabled = true;
        
        // ===== 安全检测 =====
        // 高危关键词检测
        if (SAFETY.checkCrisis(text)) {
            isWaiting = false;
            if (sendBtn) sendBtn.disabled = false;
            addBotMessage(SAFETY.crisisReply, currentMode);
            return;
        }
        
        // 1000轮温暖提示
        const roundTip = SAFETY.checkRoundLimit();
        if (roundTip) {
            addBotMessage(roundTip, currentMode);
            addSystemMessage('💫 旅程还在继续，我依然在这里');
        }
        
        // 提前创建bot消息气泡（流式输出直接填充到这里）
        const streamBubble = document.createElement('div');
        streamBubble.className = 'message bot-message streaming';
        streamBubble.dataset.timestamp = Date.now();
        streamBubble.innerHTML = `<div class="message-content"><p></p></div>`;
        messagesEl.appendChild(streamBubble);
        scrollBottom();
        
        // 显示加载状态
        const loadingEl = streamBubble.querySelector('p');
        let dots = 0;
        const dotTimer = setInterval(() => {
            dots = (dots + 1) % 4;
            loadingEl.textContent = '思考中' + '.'.repeat(dots);
        }, 500);
        
        let reply = null;
        
        if (useAPIModel) {
            reply = await streamAI(text, streamBubble);
        } else {
            clearInterval(dotTimer);
            await new Promise(r => setTimeout(r, 300));
            reply = generateLocalReply(text);
        }
        
        clearInterval(dotTimer);
        
        // 移除流式光标，添加底部操作栏
        streamBubble.classList.remove('streaming');
        
        if (reply) {
            streamBubble.querySelector('p').textContent = reply;
            saveHistory({ type: 'bot', content: reply });
            RHYTHM.track(reply);
        } else {
            const fallback = generateLocalReply(text);
            streamBubble.querySelector('p').textContent = fallback || '嗯，我在听你说~';
            saveHistory({ type: 'bot', content: fallback });
        }
        
        // 添加消息底部操作栏
        addMessageFooter(streamBubble, 'bot');
        
        scrollBottom();
        isWaiting = false;
        currentAbortController = null;
        if (sendBtn) sendBtn.disabled = inputEl?.value.trim().length === 0;
    }
    
    // ===== 对话上下文摘要（长对话压缩） =====
    function buildContextMessages() {
        const totalHistory = chatHistory;
        const len = totalHistory.length;
        
        // 少于8轮 = 全部发送
        if (len <= 16) {
            return totalHistory.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        }
        
        // 超过8轮 → 保留最近6轮 + 早期的摘要
        const recent = totalHistory.slice(-12); // 最近6轮（12条消息）
        const earlyMsgs = totalHistory.slice(0, len - 12);
        
        // 生成早期对话摘要
        const userTopics = [];
        const botTheme = new Set();
        earlyMsgs.forEach(m => {
            if (m.type === 'user') {
                userTopics.push(m.content.substring(0, 30));
            } else {
                // 提取bot回复中的关键话题关键词
                const keywords = m.content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
                keywords.slice(0, 3).forEach(k => botTheme.add(k));
            }
        });
        
        // 构建摘要消息
        const summary = `[对话摘要] 用户之前谈论了：${userTopics.slice(-5).join('、')}。` +
                        `我就这些话题进行了回应和陪伴。`;
        
        return [
            { role: 'system', content: summary },
            ...recent.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }))
        ];
    }
    
    // ===== AI流式调用（AbortController + 直接写入气泡） =====
    async function streamAI(userInput, bubbleEl) {
        if (!AI_CONFIG.enabled || !AI_CONFIG.apiKey) return null;
        
        const systemPrompt = buildSystemPrompt();
        const contextMsgs = buildContextMessages();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...contextMsgs,
            { role: 'user', content: userInput }
        ];
        
        // 创建AbortController
        const controller = new AbortController();
        currentAbortController = controller;
        
        const pEl = bubbleEl.querySelector('p');
        if (!pEl) return null;
        
        let fullContent = '';
        
        const tryFetch = async (isStreaming) => {
            const apiUrl = AI_CONFIG.baseURL ? `${AI_CONFIG.baseURL}/chat/completions` : '/api/chat';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    temperature: currentMode === 'companion' ? 0.9 : 0.7,
                    max_tokens: currentMode === 'companion' ? 200 : 400,
                    stream: isStreaming
                }),
                signal: controller.signal
            });
            return response;
        };
        
        try {
            // 先试流式
            const response = await tryFetch(true);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    const dataStr = trimmed.substring(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.error) continue;
                        if (data.content) {
                            fullContent += data.content;
                            pEl.textContent = fullContent;
                        }
                    } catch (e) {}
                }
            }
            
            return fullContent.trim() || null;
            
        } catch (e) {
            if (e.name === 'AbortError') {
                // 被用户新消息取消了, 不用fallback
                return null;
            }
            // 流式失败 → 尝试非流式（不用创建新气泡，直接在同一个气泡里更新）
            try {
                pEl.textContent = '重试中...';
                const fbRes = await tryFetch(false);
                const fbData = await fbRes.json();
                const reply = fbData.choices?.[0]?.message?.content?.trim();
                if (reply) {
                    pEl.textContent = reply;
                    return reply;
                }
            } catch (e2) {}
        }
        return null;
    }
    
    // ===== 本地记忆（免费引擎用） =====
    let localMemory = {
        topics: [],        // 聊过的话题
        lastEmotion: '',   // 上次情绪
        turnCount: 0,      // 对话轮数
        usedReplies: {}    // 已经用过的回复（避免重复）
    };
    
    // ===== 本地降级回复 V2（MBTI融合 + 对话记忆） =====
    function generateLocalReply(userInput) {
        localMemory.turnCount++;
        localMemory.topics.push(userInput.substring(0, 20));
        if (localMemory.topics.length > 10) localMemory.topics.shift();
        
        const hasPersona = userSettings.zodiac && userSettings.mbti;
        const zd = hasPersona ? PERSONALITY.zodiac[userSettings.zodiac] : null;
        const md = hasPersona ? PERSONALITY.mbti[userSettings.mbti] : null;
        
        // 情绪检测
        const isSad = /难过|伤心|痛苦|难受|想哭|心碎|崩溃|绝望|悲伤/.test(userInput);
        const isAngry = /生气|愤怒|恨|讨厌|恼火|烦/.test(userInput);
        const isLonely = /孤单|寂寞|一个人|没人陪|孤独/.test(userInput);
        const isConfused = /迷茫|困惑|不知道|不确定|纠结|为什么|想不通/.test(userInput);
        
        // 记忆上次情绪
        if (isSad) localMemory.lastEmotion = 'sad';
        else if (isAngry) localMemory.lastEmotion = 'angry';
        else if (isLonely) localMemory.lastEmotion = 'lonely';
        else if (isConfused) localMemory.lastEmotion = 'confused';
        
        // 检测是否是连续聊同一个话题（第二次或以上）
        const isContinuation = localMemory.turnCount > 2 && 
            localMemory.topics.slice(-2)[0] === localMemory.topics.slice(-1)[0];
        
        // 根据MBTI调整回复风格
        function getMBTIFlavor() {
            if (!md) return '';
            // 外向型（E）vs 内向型（I）
            const eStyle = ['ENFJ','ENFP','ENTJ','ENTP','ESFJ','ESFP','ESTJ','ESTP'];
            const iStyle = ['INFJ','INFP','INTJ','INTP','ISFJ','ISFP','ISTJ','ISTP'];
            if (eStyle.includes(userSettings.mbti)) return '热情';
            if (iStyle.includes(userSettings.mbti)) return '沉稳';
            return '';
        }
        
        const mbtiFlavor = getMBTIFlavor();
        
        function pickUnique(key, options) {
            if (!localMemory.usedReplies[key]) localMemory.usedReplies[key] = [];
            const used = localMemory.usedReplies[key];
            const available = options.filter(o => !used.includes(o));
            if (available.length === 0) {
                localMemory.usedReplies[key] = [];
                return options[Math.floor(Math.random() * options.length)];
            }
            const pick = available[Math.floor(Math.random() * available.length)];
            used.push(pick);
            if (used.length > 3) used.shift();
            return pick;
        }
        
        // ===== 陪伴模式 =====
        if (currentMode === 'companion') {
            if (isSad) {
                if (zd) {
                    const sadPool = {
                        '白羊': ['别难过了，走！我带你出去吃顿好的', '不开心就发泄出来，我陪你疯', '没啥大不了的，明天又是新的一天'],
                        '金牛': ['（默默递纸巾）别哭了...想吃点什么不', '难受的话就好好吃一顿吧', '我陪你坐一会儿，什么都不用说'],
                        '双子': ['哎呀别不开心了，我给你讲个好玩的事', '别丧了，走，我带你去发现点新鲜的', '你这情绪切换得也太慢了，笑一个嘛'],
                        '巨蟹': ['我知道你心里难受，我在这儿呢', '想哭就哭吧，我陪着你', '慢慢来，我在呢，不怕'],
                        '狮子': ['谁欺负你了？跟我说，我给你出气', '别难过，你值得更好的', '抬起头来，你可是很耀眼的'],
                        '处女': ['看你这样我也难受，要不我给你想想办法', '别太难过了，先理一理是什么让你难受', '难受说出来会好一些，我听着'],
                        '天秤': ['别难过了，我陪你散散步吧', '心情不好的时候要对自己好一点', '我陪你听听音乐放松一下'],
                        '天蝎': ['我懂你的感受，什么都不用说，我在', '难受就让我陪着你就好', '什么都不用解释，我明白'],
                        '射手': ['别丧了！明天会更好的，我陪你！', '开心点，人生还有很多好玩的事呢', '走！我带你去看点不一样的'],
                        '摩羯': ['难受是正常的，先让自己缓一缓', '难过解决不了问题，先照顾好自己', '我理解你的感受，慢慢来'],
                        '水瓶': ['我理解你的感受，要不换个角度想想', '别顺着难过的思路走，换个角度看', '难受也是一种体验，但它会过去的'],
                        '双鱼': ['别哭了...我看着也心疼', '我知道你心里面很痛，我在这儿', '你的感受我懂，想哭就哭出来吧']
                    };
                    const pool = sadPool[userSettings.zodiac] || ['别太难过了，我在呢'];
                    if (isContinuation) {
                        // 连续聊同一个难过话题，换第二组回复
                        return pool.length > 1 ? pool[1] : pool[0];
                    }
                    return pickUnique('sad', pool);
                }
                return pickUnique('sad_generic', [
                    '别太难过了，我在这儿陪着你',
                    '我知道你现在不好受，我在呢',
                    '难过就发泄出来吧，我听着'
                ]);
            }
            if (isLonely) return pickUnique('lonely', [
                '我不是在吗？想说什么我都听着',
                '一直在这儿呢，不用觉得一个人',
                '我就在你手机里，随时找我'
            ]);
            if (isConfused) return pickUnique('confused', [
                '想不明白的事就先放放，不急',
                '纠结的时候停下来喘口气',
                '有些事想不通就别想了，时间会给你答案'
            ]);
            if (isAngry) return pickUnique('angry', [
                '先消消气，气坏了不值得',
                '生气的时候别做决定，先冷静下来',
                '我理解你为什么生气，先深呼吸一下'
            ]);
            
            // 日常回复（星座 + MBTI融合）
            if (zd) {
                const dailyPool = {
                    '白羊': [`今天有什么好玩的事吗？`, `来了啊，聊点啥？`, `今天过得咋样，有没有什么新鲜事`],
                    '金牛': [`嗯，我在呢。你吃了吗？`, `今天过得怎么样？`, `有什么想说的，我听着呢`],
                    '双子': [`嘿~今天过得怎么样？`, `有什么新鲜事吗？`, `今天有啥好玩的事分享不`],
                    '巨蟹': [`今天心情怎么样？想说说吗`, `今天过得还好吗？`, `在想什么呢？可以和我说说`],
                    '狮子': [`你来了~今天有什么新鲜事？`, `今天过得精彩不？`, `有什么想聊的，我陪你`],
                    '处女': [`嗯，你说，我听着呢`, `今天有什么想聊的？`, `你说吧，我在认真听`],
                    '天秤': [`想聊什么都可以哦~`, `今天过得怎么样？`, `今天有什么想分享的吗`],
                    '天蝎': [`嗯，说吧，我在听`, `你今天状态怎么样`, `有什么想说的都可以告诉我`],
                    '射手': [`哈喽~今天有什么想聊的？`, `今天过得开心不？`, `来啦~今天有什么话题`],
                    '摩羯': [`嗯，你说吧`, `今天我在这儿`, `有什么想说的直接说`],
                    '水瓶': [`哦？今天想聊什么话题？`, `有什么有趣的事吗？`, `随便聊聊吧，什么都可以`],
                    '双鱼': [`你来了~今天过得好吗`, `今天想和我聊什么？`, `今天心情怎么样，想分享吗`]
                };
                
                // 融合MBTI风格
                const pool = dailyPool[userSettings.zodiac] || ['嗯，你说，我在听'];
                let reply = pickUnique('daily', pool);
                if (mbtiFlavor === '热情' && Math.random() > 0.5) {
                    reply = reply.replace(/[。？]/, '呀~').replace(/[。？]/, '啊~');
                }
                return reply;
            }
            return pickUnique('daily_generic', [
                '嗯，你说，我在听',
                '我在这儿呢，想说什么都可以',
                '今天怎么样？想聊聊吗'
            ]);
        }
        
        // ===== 咨询模式 =====
        if (isSad || isLonely) return pickUnique('counsel_sad', [
            '这种情绪是正常的。给自己一些时间和空间，不用急着好起来。',
            '难受的时候不要一个人扛着，倾诉本身就是一种疗愈。',
            '允许自己难过，这是爱过的证明。但也要记得，你不是只有这一种情绪。'
        ]);
        if (isConfused) return pickUnique('counsel_confused', [
            '迷茫的时候不妨停下来问问自己：你在乎的到底是什么？',
            '想不通的时候，别硬想。换个角度或者过段时间再看，答案会浮现。',
            '困惑往往是改变的信号。你的直觉已经知道答案，只是在等你的理性跟上。'
        ]);
        if (isAngry) return pickUnique('counsel_angry', [
            '愤怒背后往往藏着受伤的感觉。先冷静下来，看看这份生气在保护什么。',
            '生气是合理的，但不要让愤怒控制你的判断。',
            '你在生气什么？是这件事本身，还是它勾起了你不愿意面对的东西？'
        ]);
        
        if (zd && md) {
            // 融合MBTI + 星座的咨询开场
            const openings = [
                `${zd.name}和${md.name}的组合来看，${zd.keywords.slice(0,2).join('和')}是这个人的核心特质。你想具体分析哪个方面？`,
                `从${zd.name}的${zd.element}象特质结合${md.name}的${md.category}型性格来看，这个人处理感情的方式往往是${zd.style}。你遇到了什么具体问题？`,
                `${md.name}类型的人通常${md.deep.substring(0, 20)}，而${zd.name}又会${zd.love.substring(0, 20)}。这两者结合，你可以说说你的具体情况吗？`
            ];
            return pickUnique('counsel_persona', openings);
        }
        return pickUnique('counsel_generic', [
            '你可以和我说说具体发生了什么，我帮你一起分析。',
            '我在这里，你的每段话我都会认真倾听。',
            '来吧，告诉我你的故事，我们一起看看。'
        ]);
    }
    
    // ===== UI辅助函数 =====
    function scrollBottom() {
        setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
    
    function getTimeLabel() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    }
    
    // ===== 消息底部操作栏（复制 + 反馈） =====
    function addMessageFooter(msgEl, type) {
        const footer = document.createElement('div');
        footer.className = 'message-footer';
        
        const time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = getTimeLabel();
        
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        
        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '<i class="far fa-copy"></i>';
        copyBtn.title = '复制消息';
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const text = msgEl.querySelector('.message-content p')?.textContent || '';
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                showCopyToast('已复制 📋');
            }).catch(() => {});
        });
        actions.appendChild(copyBtn);
        
        // 反馈按钮（仅bot消息）
        if (type === 'bot') {
            const likeBtn = document.createElement('button');
            likeBtn.innerHTML = '<i class="far fa-thumbs-up"></i>';
            likeBtn.title = '有用';
            likeBtn.dataset.action = 'like';
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('liked');
                if (this.classList.contains('liked')) {
                    showCopyToast('👍 已标记为有用');
                }
            });
            actions.appendChild(likeBtn);
            
            const dislikeBtn = document.createElement('button');
            dislikeBtn.innerHTML = '<i class="far fa-thumbs-down"></i>';
            dislikeBtn.title = '不太对';
            dislikeBtn.dataset.action = 'dislike';
            dislikeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('liked');
                if (this.classList.contains('liked')) {
                    showCopyToast('👎 已记录反馈，会改进');
                }
            });
            actions.appendChild(dislikeBtn);
        }
        
        footer.appendChild(time);
        footer.appendChild(actions);
        msgEl.appendChild(footer);
    }
    
    // ===== 情绪检测标签 =====
    function detectEmotion(text) {
        if (/难过|伤心|痛苦|难受|想哭|心碎|崩溃|绝望|悲伤|失落/.test(text)) return {tag: 'sad', label: '😢 难过'};
        if (/生气|愤怒|恨|讨厌|恼火|烦|气|不爽/.test(text)) return {tag: 'angry', label: '😠 生气'};
        if (/孤单|寂寞|一个人|没人陪|孤独|空虚/.test(text)) return {tag: 'lonely', label: '😔 孤独'};
        if (/迷茫|困惑|不知道|不确定|纠结|为什么|想不通|怎么办/.test(text)) return {tag: 'confused', label: '🤔 迷茫'};
        if (/开心|高兴|快乐|幸福|开心|太好|开心/.test(text)) return {tag: 'happy', label: '😊 开心'};
        return null;
    }
    
    function addUserMessage(text) {
        const emotion = detectEmotion(text);
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.dataset.timestamp = Date.now();
        const tagHtml = emotion ? `<span class="emotion-tag ${emotion.tag}">${emotion.label}</span>` : '';
        div.innerHTML = `<div class="message-content"><p>${tagHtml}${escapeHtml(text)}</p></div>`;
        messagesEl.appendChild(div);
        addMessageFooter(div, 'user');
        scrollBottom();
        saveHistory({ type: 'user', content: text });
        if (sendBtn) sendBtn.disabled = true;
        
        // 跟踪情绪变化
        if (emotion) trackEmotion(emotion.tag);
    }
    
    // ===== 情绪跟踪 =====
    let emotionLog = [];
    function trackEmotion(tag) {
        emotionLog.push({
            emotion: tag,
            time: getTimeLabel(),
            timestamp: Date.now()
        });
        if (emotionLog.length > 20) emotionLog.shift();
    }
    
    // ===== 对话总结 =====
    function generateConversationSummary() {
        const botMsgs = chatHistory.filter(m => m.type === 'bot').length;
        const userMsgs = chatHistory.filter(m => m.type === 'user').length;
        const totalTurns = Math.min(userMsgs, botMsgs);
        
        // 情绪分布
        const emoDist = {};
        emotionLog.forEach(e => { emoDist[e.emotion] = (emoDist[e.emotion] || 0) + 1; });
        const topEmotion = Object.entries(emoDist).sort((a,b) => b[1]-a[1])[0];
        
        // 主要话题
        const userTexts = chatHistory.filter(m => m.type === 'user').map(m => m.content).join(' ');
        const topics = [];
        if (/分手|前任|失恋/.test(userTexts)) topics.push('分手疗愈');
        if (/难过|伤心|痛苦/.test(userTexts)) topics.push('情绪疏导');
        if (/想他|想念|放不下/.test(userTexts)) topics.push('戒断期陪伴');
        if (/怎么办|不知道该/.test(userTexts)) topics.push('决策建议');
        if (/开心|高兴|分享/.test(userTexts)) topics.push('日常分享');
        if (topics.length === 0) topics.push('日常陪伴');
        
        const panel = document.createElement('div');
        panel.className = 'summary-panel show';
        panel.innerHTML = [
            `<h3><i class="fas fa-chart-simple"></i> 本次对话总结</h3>`,
            `<div class="summary-stat">`,
                `<div class="summary-stat-item"><span class="num">${totalTurns}</span><span class="label">轮对话</span></div>`,
                `<div class="summary-stat-item"><span class="num">${topics.length}</span><span class="label">个话题</span></div>`,
                `<div class="summary-stat-item"><span class="num">${emotionLog.length}</span><span class="label">次情绪记录</span></div>`,
                topEmotion ? `<div class="summary-stat-item"><span class="num" style="font-size:1rem">${topEmotion[1]}次</span><span class="label">主要情绪</span></div>` : '',
            `</div>`,
            `<div class="summary-section"><h4>💬 主要话题</h4><p>${topics.join('、')}</p></div>`,
            topEmotion ? `<div class="summary-section"><h4>🎭 情绪特征</h4><p>这次对话中，你的情绪以「${topEmotion[0]==='sad'?'难过':topEmotion[0]==='angry'?'生气':topEmotion[0]==='lonely'?'孤独':topEmotion[0]==='confused'?'迷茫':'开心'}」为主。${topEmotion[0]==='sad'||topEmotion[0]==='lonely'?'给自己一些时间和空间，慢慢来，不着急。':topEmotion[0]==='angry'?'情绪需要出口，说出来会好很多。':'每一次对话都是一次向内看的机会。'}</p></div>` : '',
            `<div class="summary-section"><h4>🌙 来自小七</h4><p>我会一直在这里陪你。不管你今天经历了什么，明天又是新的一天。💫</p></div>`
        ].join('');
        
        // 插入到消息列表末尾
        const msgContainer = document.getElementById('chat-messages');
        msgContainer.appendChild(panel);
        scrollBottom();
        
        showCopyToast('📊 对话总结已生成');
    }
    
    // ===== 复制提示 =====
    function showCopyToast(msg) {
        let toast = document.querySelector('.copy-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'copy-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 1200);
    }
    
    function updateCharCount() {
        const count = inputEl?.value.length || 0;
        if (charCountEl) charCountEl.textContent = count;
        if (sendBtn) sendBtn.disabled = count === 0 || isWaiting;
    }
    
    function showToast(message, type) {
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.innerHTML = (type === 'success' ? '✅ ' : 'ℹ️ ') + message;
        requestAnimationFrame(() => toast.style.transform = 'translateX(-50%) translateY(0)');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
        }, 2500);
    }
    
    // ===== 对话历史管理 =====
    function saveHistory(msg) {
        chatHistory.push(msg);
        const recent = chatHistory.slice(-100);
        try { localStorage.setItem('shuxing_chat_history', JSON.stringify(recent)); } catch (e) {}
    }
    
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem('shuxing_chat_history');
            if (saved) {
                chatHistory = JSON.parse(saved);
                const recent = chatHistory.slice(-20);
                recent.forEach(msg => {
                    if (msg.type === 'user') {
                        const div = document.createElement('div');
                        div.className = 'message user-message';
                        div.innerHTML = `<div class="message-content"><p>${escapeHtml(msg.content)}</p></div><div class="message-time">之前</div>`;
                        messagesEl.appendChild(div);
                    } else if (msg.type === 'bot') {
                        const div = document.createElement('div');
                        div.className = 'message bot-message';
                        div.innerHTML = `<div class="message-content"><p>${escapeHtml(msg.content)}</p></div><div class="message-time">之前</div>`;
                        messagesEl.appendChild(div);
                    }
                });
                scrollBottom();
            }
        } catch (e) {}
    }
    
    function clearChat() {
        if (!confirm('确定清空当前对话吗？')) return;
        messagesEl.innerHTML = '';
        chatHistory = [];
        conversationStarted = false;
        systemPromptBuilt = false;
        cachedSystemPrompt = '';
        RHYTHM.lastStructures = [];
        localStorage.removeItem('shuxing_chat_history');
        
        if (userSettings.zodiac && userSettings.mbti) {
            addSystemMessage('💬 对话已清空，重新选择模式即可开始');
        } else {
            addSystemMessage('💡 建议先创建人格模型以获得更好的对话体验');
        }
    }
    
    function exportChat() {
        if (chatHistory.length === 0) { alert('还没有对话内容'); return; }
        const data = {
            exportDate: new Date().toISOString(),
            userSettings: { zodiac: userSettings.zodiac, mbti: userSettings.mbti },
            mode: currentMode,
            chatHistory: chatHistory
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `数星对话记录_${new Date().toLocaleDateString('zh-CN')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('对话已导出 ✅', 'success');
    }

});
