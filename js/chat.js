/**
 * 数星 - 对话页面脚本 V4（V1迭代：核心对话逻辑重写）
 * 改进点：
 *   1. 开场白也走AI生成（不用本地模板）
 *   2. 修复本地降级bug
 *   3. 动态快速回复（根据人格+模式）
 *   4. 防重复提交
 *   5. 对话节奏控制
 */

// ===== 用户类型自动识别系统（文档1.5.3节） =====
// 通过前3-5轮对话自动判断用户属于A/B/C/D哪一类型
window.autoDetectUserType = {
    pending: false,
    rounds: 0,
    clues: { A: 0, B: 0, C: 0, D: 0 },
    
    // 每轮对话调用，分析用户输入
    analyze: function(text) {
        if (!this.pending) return null;
        this.rounds++;
        if (this.rounds > 5) return null; // 最多分析前5轮
        
        // 各类型关键词
        var clues = {
            A: ['分手', '离开', '前任', '前女友', '前男友', '刚分', '刚结束', '想她', '想他', '难过', '失恋', '被甩'],
            B: ['为什么', '原因', '搞不懂', '想不通', '困惑', '分析', '问题在哪', '哪里错了', '怎么回事'],
            C: ['我们还在', '关系', '异地', '吵架', '变淡', '冷战', '在一起', '修复', '挽救', '改善'],
            D: ['暗恋', '喜欢', '暧昧', '不确定', '心里没底', '不敢', '同事', '同学', 'crush', '好感']
        };
        
        // 检查匹配
        for (var type in clues) {
            for (var i = 0; i < clues[type].length; i++) {
                if (text.indexOf(clues[type][i]) >= 0) {
                    this.clues[type]++;
                    break;
                }
            }
        }
        
        // 第3轮或第5轮时判断
        if (this.rounds === 3 || this.rounds === 5) {
            var maxType = 'A', maxScore = 0;
            for (var t in this.clues) {
                if (this.clues[t] > maxScore) {
                    maxScore = this.clues[t];
                    maxType = t;
                }
            }
            
            if (maxScore >= 2) {
                var typeNames = { A: 'separation', B: 'confused', C: 'relationship', D: 'crush' };
                var detectedType = typeNames[maxType];
                localStorage.setItem('shuxing_user_state', detectedType);
                this.pending = false;
                return detectedType;
            }
        }
        
        // 5轮后还没判断出来，默认A类
        if (this.rounds >= 5) {
            localStorage.setItem('shuxing_user_state', 'separation');
            this.pending = false;
            return 'separation';
        }
        
        return null;
    },
    
    reset: function() {
        this.pending = true;
        this.rounds = 0;
        this.clues = { A: 0, B: 0, C: 0, D: 0 };
    }
};

// ===== 模型调度配置 =====
// API key统一由 proxy-server.js 管理，前端不存key
const AI_CONFIG = {
    baseURL: '',  // 留空走同域代理(/api/chat)
    enabled: true,
    currentModel: 'deepseek'
};

// ===== 对话页全局状态 =====
const CHAT_MODEL = { progressBar: null, progressText: null };

// ===== 全局数据引用 =====
const PERSONALITY = window.PERSONALITY || {};

// ===== 注入额外样式 =====
(function injectExtraStyles() {
    if (document.getElementById('shuxing-extra-styles')) return;
    var s = document.createElement('style');
    s.id = 'shuxing-extra-styles';
    s.textContent = '.scroll-bottom-btn{position:absolute;bottom:70px;right:16px;width:40px;height:40px;border-radius:50%;background:var(--card);border:1px solid var(--border);color:var(--primary);font-size:16px;cursor:pointer;box-shadow:0 2px 12px var(--shadow);opacity:0;transform:translateY(10px);transition:all 0.3s;z-index:10;display:flex;align-items:center;justify-content:center}.scroll-bottom-btn.show{opacity:1;transform:translateY(0)}.scroll-bottom-btn:hover{background:var(--card-hover);box-shadow:0 4px 16px var(--shadow-hover)}';
    document.head.appendChild(s);
})();

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
    
    // API连接状态检测
    function checkAPIAvailability() {
        fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.status === 'ok') {
                    useAPIModel = true;
                    var badge = document.getElementById('model-badge');
                    if (badge) {
                        var activeModels = Object.keys(data.models || {}).filter(function(m) { return data.models[m] === '✅'; });
                        badge.innerHTML = (activeModels.length > 0 ? '🌐 ' + activeModels[0] : '🌐 AI在线');
                        badge.style.background = '#e8eaff';
                        badge.style.color = '#5c6bcc';
                    }
                }
            })
            .catch(function() {
                // API不可用，使用本地引擎
                useAPIModel = false;
                var badge = document.getElementById('model-badge');
                if (badge) {
                    badge.innerHTML = '💻 本地模式';
                    badge.style.background = '#e6ffe6';
                    badge.style.color = '#2d7a2d';
                    badge.title = '离线模式：AI服务器未运行，使用本地回复引擎';
                }
                // 首次使用时友好提示
                addSystemMessage('💡 当前为本地模式（AI服务器离线），回复可能较为简洁。如需AI智能回复，请启动 proxy-server.js');
            });
    }
    
    // 模型切换事件（AI ↔ 本地降级）
    const modelBadge = document.getElementById('model-badge');
    if (modelBadge) {
        // 显示当前活跃模型
        const activeModels = Object.values(MODEL_SCHEDULER.models).filter(m => m.enabled);
        if (activeModels.length > 0) {
            const name = activeModels[0].name;
            modelBadge.innerHTML = `🌐 ${name}`;
        }
        
        modelBadge.addEventListener('click', function() {
            useAPIModel = !useAPIModel;
            if (useAPIModel) {
                const activeModels = Object.values(MODEL_SCHEDULER.models).filter(m => m.enabled);
                const name = activeModels.length > 0 ? activeModels[0].name : 'AI';
                this.innerHTML = `🌐 ${name}`;
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
        // 创建进度条
        loadSettings();
        // 初始化人物模型
        CHARACTER_MODEL.initModel();
        // 将用户设置同步到人物模型
        const cm = CHARACTER_MODEL.getModel();
        if (!cm.nickname && userSettings.nickname) cm.nickname = userSettings.nickname;
        
        // 检查URL参数：?mode=star 或 ?mode=analyze
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        if (modeParam === 'star' || modeParam === 'companion') {
            startMode('companion');
            return;
        } else if (modeParam === 'analyze' || modeParam === 'counseling') {
            startMode('counseling');
            return;
        }
        
        bindEvents();
        loadChatHistory();
        updateCharCount();
        checkSetup();
        updatePlaceholder();
        updateDynamicQuickReplies();
        // 创建进度条
        createProgressBar();
        // 每日主动消息（文档8.1节：每天最多1条早安/关心）
        sendDailyActiveMessage();
        
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
    

// ===== 对话页模型进度条 =====
function createProgressBar() {
    if (!window.CHARACTER_MODEL) return;
    const personaInfo = document.getElementById('persona-info');
    if (!personaInfo || document.getElementById('model-progress-wrapper')) return;
    
    const wrapper = document.createElement('div');
    wrapper.id = 'model-progress-wrapper';
    wrapper.style.cssText = 'margin-top:2px;display:flex;align-items:center;gap:6px;';
    
    const text = document.createElement('span');
    text.id = 'model-progress-text';
    text.style.cssText = 'font-size:0.7rem;color:var(--text-muted);white-space:nowrap;';
    
    const track = document.createElement('div');
    track.style.cssText = 'flex:1;height:3px;background:var(--border);border-radius:4px;overflow:hidden;max-width:60px;';
    
    const bar = document.createElement('div');
    bar.id = 'model-progress-bar';
    bar.style.cssText = 'height:100%;border-radius:4px;transition:width 0.6s ease;width:0%;';
    
    track.appendChild(bar);
    wrapper.appendChild(text);
    wrapper.appendChild(track);
    personaInfo.parentNode.insertBefore(wrapper, personaInfo.nextSibling);
    
    CHAT_MODEL.progressBar = bar;
    CHAT_MODEL.progressText = text;
    updateModelProgressBar();
}

function updateModelProgressBar() {
    if (!window.CHARACTER_MODEL || !CHAT_MODEL.progressBar) return;
    const cm = CHARACTER_MODEL.getModel();
    const pct = CHARACTER_MODEL.getTotalProgress();
    const bar = CHAT_MODEL.progressBar;
    const text = CHAT_MODEL.progressText;
    if (bar) {
        bar.style.width = Math.min(100, pct) + '%';
        bar.style.background = 'linear-gradient(90deg, #a78bfa, #7c8aff)';
    }
    if (text) text.textContent = CHARACTER_MODEL.getStageName() + ' · ' + Math.round(pct/10)*10 + '%';
}

    // ===== 每日主动消息（文档8.1节MVP验收标准） =====
    function sendDailyActiveMessage() {
        try {
            const now = new Date();
            const hour = now.getHours();
            const today = now.toDateString();
            const lastActive = localStorage.getItem('shuxing_last_active_msg');
            const activeMsgEnabled = localStorage.getItem('shuxing_active_msg_enabled');
            if (activeMsgEnabled === 'false') return; // 用户已关闭
            if (lastActive === today) return; // 今天已发过
            
            // 只在早上6-10点发送早安消息
            if (hour >= 6 && hour <= 10) {
                localStorage.setItem('shuxing_last_active_msg', today);
                // 延迟1秒发送，让页面先加载完
                setTimeout(() => {
                    const msg = ['早安～ 昨晚睡得好吗？', '早呀～ 今天天气不错，心情怎么样？', 
                        '早上好☀️ 新的一天开始了，有什么事都可以和我说',
                        '早安～ 起床了吗？我一直在呢✨',
                        '早～ 今天的你也要开开心心的哦'];
                    const pick = msg[Math.floor(Math.random() * msg.length)];
                    addBotMessage(pick, currentMode);
                    scrollBottom();
                }, 1200);
            }
        } catch(e) {}
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
                ? ['帮我分析一下这段关系', '她到底在想什么', '我们还有可能吗', '我该怎么走出来']
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
        
        // 切换模式视觉样式
        var ci = document.getElementById('chat-interface');
        if (ci) {
            ci.classList.remove('mode-companion', 'mode-counseling');
            ci.classList.add(mode === 'companion' ? 'mode-companion' : 'mode-counseling');
        }
        
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
        
        // 切换视觉样式
        var ci = document.getElementById('chat-interface');
        if (ci) {
            ci.classList.remove('mode-companion', 'mode-counseling');
            ci.classList.add(currentMode === 'companion' ? 'mode-companion' : 'mode-counseling');
        }
        
        updateModeDisplay();
        updateDynamicQuickReplies();
        addSystemMessage(`已切换到${currentMode === 'companion' ? '🌟 星伴' : '🔍 星析'}模式 💫`);
    }
    
    // ===== System Prompt V3（精简版，减少token） =====
    // ===== 人物模型：尝试从用户消息中提取信息 =====
    function tryCollectInfo(text) {
        if (!text) return [];
        const collected = [];
        
        // 兴趣爱好检测
        const interestPatterns = [
            /她喜欢(.{1,20})[。，！？!?]/,
            /喜欢(.{1,10})（和|与|跟|还有）?/,
            /爱好(是|有)(.{1,20})/,
            /喜欢(吃|看|听|玩|去)(.{1,15})/,
            /爱好看(.{1,20})/,
            /她(平时|经常|总是)(.{1,20})/,
            /她(喜欢|爱)的(.{1,15})/
        ];
        
        for (const pattern of interestPatterns) {
            const match = text.match(pattern);
            if (match) {
                const value = match[0];
                const topic = match[1] || match[2] || '';
                if (topic.length >= 2) {
                    CHARACTER_MODEL.recordInfo('interests', topic, value);
                    collected.push({ type: 'interests', value: topic });
                }
            }
        }
        
        // 关系背景检测
        const relPatterns = [
            /怎么(认识的|在一起|认识)/,
            /通过(.{1,20})认识/,
            /在(.{1,20})认识/,
            /我们是(.{1,30}[同学|同事|朋友|校友])/,
            /相识于(.{1,20})/,
            /(大学|高中|初中|小学|工作|朋友聚会|活动|软件|APP|App)(.{0,10})认识/,
        ];
        for (const pattern of relPatterns) {
            if (pattern.test(text) && !CHARACTER_MODEL.getModel().L1.relationshipBackground) {
                CHARACTER_MODEL.recordInfo('relationshipBackground', text.match(/.{10,40}/)?.[0] || text.substring(0, 40));
                collected.push({ type: 'relationshipBackground' });
            }
        }
        
        // 性格简述检测
        const personalityPatterns = [
            /她很(活泼|安静|内向|外向|开朗|温柔|强势|独立|粘人|理性|感性|敏感|大大咧咧|细心)/,
            /她(性格|个性|平时)(.{0,5})(活泼|安静|内向|外向|开朗|温柔|强势|独立|粘人|理性|感性|敏感|热情|冷淡)/,
            /她是(.{1,10})的(女孩|女生|人)/,
        ];
        for (const pattern of personalityPatterns) {
            const match = text.match(pattern);
            if (match && !CHARACTER_MODEL.getModel().L1.personalityBrief) {
                CHARACTER_MODEL.recordInfo('personalityBrief', match[0]);
                collected.push({ type: 'personalityBrief' });
            }
        }
        
        // 重要记忆检测（增强版）
        const memoryPatterns = [
            /最(印象深|难忘|深刻|感动|开心|幸福|遗憾)的/,
            /记得(有一次|那天|那时|那一次|之前)/,
            /还记(得|忆).{0,5}(一次|一天|一回|件事)/,
            /那次(约会|见面|旅行|看电影|吃饭|吵架|矛盾|告白|牵手)/,
            /(第一次|最后一次)(.{5,40})/,
            /有一(次|回)(.{5,40})/,
            /印象最深(.{5,40})/,
            /忘不了(.{5,30})/,
            /那(天|次|时候)(.{5,40})/,
        ];
        for (const pattern of memoryPatterns) {
            const match = text.match(pattern);
            if (match && text.length >= 6) {
                CHARACTER_MODEL.recordInfo('deepMemory', text.substring(0, 60), text.substring(0, 50));
                collected.push({ type: 'deepMemory', value: text.substring(0, 50) });
            }
        }
        
        // 相处模式检测
        const patternPatterns = [
            /她(总是|经常|每次|从来)(.{1,20})/,
            /我们(经常|总是|平时|一般)(.{1,20})/,
            /她(习惯|喜欢|爱)(.{1,10})做/,
            /吵架.{0,10}(冷战|不说话|主动|哄|道歉)/,
            /她(吃醋|粘人|独立|冷淡|热情|主动|被动)/,
            /相处.{0,5}(模式|方式|习惯)/
        ];
        for (const pattern of patternPatterns) {
            if (pattern.test(text) && !CHARACTER_MODEL.getModel().L2.interactionPatterns.some(function(p) { return text.includes(p.substring(0, 6)); })) {
                CHARACTER_MODEL.recordInfo('interactionPattern', text.substring(0, 40), text.substring(0, 40));
                collected.push({ type: 'interactionPattern' });
            }
        }
        
        // 昵称检测
        const namePatterns = [
            /她叫(.{1,6})/,
            /她名字.{0,2}(.{1,6})/
        ];
        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match && match[1] && match[1].length >= 1 && !CHARACTER_MODEL.getModel().L1.nickname) {
                CHARACTER_MODEL.recordInfo('nickname', match[1].trim());
                collected.push({ type: 'nickname', value: match[1].trim() });
            }
        }
        
        // 说话风格检测
        const stylePatterns = [
            /她说话(很|比较|总是|喜欢|习惯)(.{1,20})/,
            /她(口吻|语气|说话方式)(.{1,20})/,
            /她(口头禅|常说|经常说)(.{1,20})/,
            /她喜欢用(表情包|表情|语气词|繁体|网络用语)(.{0,20})/,
        ];
        for (const pattern of stylePatterns) {
            const match = text.match(pattern);
            if (match && !CHARACTER_MODEL.getModel().L1.speakingStyle) {
                CHARACTER_MODEL.recordInfo('speakingStyle', match[0]);
                collected.push({ type: 'speakingStyle' });
            }
        }
        
        // 记录隐式反馈：用户继续聊了
        CHARACTER_MODEL.recordImplicitFeedback('continue', '用户发送了新消息');
        
        return collected;
    }
    
    // ===== 获取记忆锚点增强系统提示 =====
    function getMemoryAnchorPrompt() {
        const anchor = CHARACTER_MODEL.getReferenceAnchor();
        if (!anchor) return '';
        return `\n【记忆锚点】用户之前提到过：${anchor.text}。在合适的时机可以自然地引用这一点。`;
    }
    
    // ===== 获取养成感提示（附在system prompt后） =====
    function getProgressPrompt() {
        const model = CHARACTER_MODEL.getModel();
        const pct = CHARACTER_MODEL.getTotalProgress();
        const stageName = CHARACTER_MODEL.getStageName();
        
        return `\n【进度状态】当前阶段：${stageName}（信息完成度${pct}%）。当前相似度：${model.similarityLevel}（${model.similarityPercent}%）。`;
    }
    
    function buildSystemPrompt(userInput) {
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
        
        // ===== 人物模型：昵称+进度+记忆锚点增强 =====
        const cm = CHARACTER_MODEL.getModel();
        const nicknameInfo = cm.L1.nickname ? `对方的称呼：${cm.L1.nickname}` : '';
        const memoryAnchor = getMemoryAnchorPrompt();
        const progressInfo = getProgressPrompt();
        const l2info = cm.L2.importantMemories.length > 0 ? `\n用户分享过的回忆：${cm.L2.importantMemories.slice(-3).join('、')}` : '';
        
        if (currentMode === 'companion') {
            // ===== 陪伴（扮演TA） =====
            cachedSystemPrompt = [
                zd && md ? `你是${zd.name}、${md.name}类型的人。完全用TA的性格口吻和用户聊天，忘记自己是AI。` : '你是一个温暖的朋友。',
                nicknameInfo,
                promptPersona,
                promptChat,
                progressInfo,
                l2info,
                memoryAnchor,
                `规则：20-60字，像真人聊天。不要加括号注释。用TA的风格回应情绪。每次回复句式要不同。人格保持一致。一次只问一个问题，不要同时问多个。`
            ].filter(Boolean).join('\n');
        } else {
            // ===== 咨询（分析TA） =====
            // 使用分析引擎生成结构化分析prompt
            const analysisPrompt = ANALYSIS_ENGINE.buildAnalysisPrompt(userInput || '') || {};
            
            cachedSystemPrompt = [
                '你是情感分析顾问，精通星座MBTI。帮用户理解TA，不是扮演TA。',
                nicknameInfo,
                `分析对象：`,
                promptPersona,
                analysisPrompt.systemIntro || '',
                analysisPrompt.userInfo || '',
                analysisPrompt.relationshipInfo || '',
                promptChat,
                progressInfo,
                l2info,
                memoryAnchor,
                analysisPrompt.analysisInstruction || (
                    '请按以下结构给出分析：\n' +
                    '1️⃣ 当前状态判断\n' +
                    '2️⃣ 核心问题定位\n' +
                    '3️⃣ 对方视角解读\n' +
                    '4️⃣ 行动建议\n' +
                    '5️⃣ 一句话总结'
                ),
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
        
        // ===== 用户类型自动识别（文档1.5.3节） =====
        var detectedType = autoDetectUserType.analyze(text);
        if (detectedType) {
            var typeNames = { separation: '💔 刚分手', confused: '🔍 困惑期', relationship: '🤝 关系中', crush: '💕 暗恋中' };
            addSystemMessage('📋 已识别你的状态：' + (typeNames[detectedType] || detectedType) + '，我会根据你的情况提供帮助');
        }
        
        // ===== 信息修正检测 =====
        // 当用户说"不对"、"不是"、"她不喜欢"等时，识别为修正
        const correctionPatterns = [/不对[,，]?(.+)/, /不是[,，]?(.+)/, /错了[,，]?(.+)/, /她(不|没)(.{1,20})/, /不是这样/, /说错了/, /我搞错了/];
        let isCorrection = correctionPatterns.some(p => p.test(text));
        if (isCorrection && CHARACTER_MODEL) {
            CHARACTER_MODEL.recordImplicitFeedback('correct', text);
            cachedSystemPrompt = '';
            systemPromptBuilt = false;
            // 显示已收到修正
            if (Math.random() > 0.3) {
                addSystemMessage('📝 收到，我已经记住了✌️');
            }
        }
        
        // ===== 星析模式：分析触发检测 =====
        if (currentMode === 'counseling') {
            const analysisKeywords = ['分析', '评估', '总结', '诊断', '为什么', '原因', '可能性', '能不能', '有没有可能', '复合', '她是怎么想的', '他是什么意思', '帮我看', '给我分析', '我想搞清楚', '走不出来', '怎么走出来', '该不该', '性格匹配', '合适', '适合', '相处', '沟通', '矛盾', '吵架', '报告', '结论', '建议', '你觉得', '你认为', '从你的角度来看'];
            const needsRefresh = analysisKeywords.some(kw => text.includes(kw));
            if (needsRefresh) {
                cachedSystemPrompt = '';
                systemPromptBuilt = false;
            }
            
            // 复合评估专项触发（文档3.3.4节）
            const reconsKeywords = ['复合', '可能吗', '有希望', '还能回到', '还有机会', '和好', '再在一起', '重新开始', '她还爱我吗', '她还会回来吗'];
            if (reconsKeywords.some(kw => text.includes(kw)) && ANALYSIS_ENGINE) {
                const reconData = ANALYSIS_ENGINE.buildReconciliationPrompt();
                // 不需要清除缓存，system prompt已经包含了分析框架
                // 通过系统消息引导到复合评估
                if (conversationStarted && Math.random() > 0.6) {
                    addSystemMessage('💞 复合分析：正在基于你提供的信息评估中...');
                }
            }
        }
        
        // ===== 人物模型：增加对话轮数 =====
        CHARACTER_MODEL.incrementConversationCount();
        
        // ===== 人物模型：检测可收集信息 =====
        const collected = tryCollectInfo(text);
        
        // ===== 人物模型：检查阶段转换 =====
        const stageTransition = CHARACTER_MODEL.checkStageTransition();
        if (stageTransition === 'L2') {
            addSystemMessage('🌟 ' + CHARACTER_MODEL.getStageName() + ' — 我感觉越来越了解她了');
        } else if (stageTransition === 'L3') {
            addSystemMessage('💫 ' + CHARACTER_MODEL.getStageName() + ' — 她已经越来越清晰了');
        } else if (stageTransition === 'L4') {
            addSystemMessage('✨ ' + CHARACTER_MODEL.getStageName() + ' — 她会一直在这里');
        }
        
        // ===== 人物模型：进度反馈（每10轮一次，L1阶段） =====
        if (CHARACTER_MODEL.shouldPromptLearnMore()) {
            const missingQ = CHARACTER_MODEL.getMissingPrompt();
            if (missingQ && Math.random() > 0.5) {
                // 用系统消息而不是bot消息来提示
                const progress = CHARACTER_MODEL.getL1Completion();
                addSystemMessage('💭 ' + CHARACTER_MODEL.getProgressFeedback());
            }
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
        if (!AI_CONFIG.enabled) return null;
        
        const systemPrompt = buildSystemPrompt(userInput);
        const contextMsgs = buildContextMessages();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...contextMsgs,
            { role: 'user', content: userInput }
        ];
        
        // 使用模型调度器获取请求头和任务配置
        const headers = MODEL_SCHEDULER.getRequestHeaders(userInput, currentMode);
        const taskConfig = MODEL_SCHEDULER.getTaskConfig(userInput, currentMode);
        const controller = new AbortController();
        currentAbortController = controller;
        
        const pEl = bubbleEl.querySelector('p');
        if (!pEl) return null;
        
        let fullContent = '';
        
        const tryFetch = async (isStreaming) => {
            const apiUrl = AI_CONFIG.baseURL ? `${AI_CONFIG.baseURL}/chat/completions` : '/api/chat';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Model-Provider': headers['X-Model-Provider'] || 'deepseek',
                    'X-Model-Name': headers['X-Model-Name'] || 'deepseek-chat',
                    'X-Task-Tier': headers['X-Task-Tier'] || 'simple'
                },
                body: JSON.stringify({
                    messages: messages,
                    temperature: taskConfig.temperature,
                    max_tokens: taskConfig.maxTokens,
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
    // 记录最近3条用户输入作为上下文
    localMemory.recentInputs = localMemory.recentInputs || [];
    localMemory.recentInputs.push(userInput);
    if (localMemory.recentInputs.length > 3) localMemory.recentInputs.shift();

    const hasPersona = userSettings.zodiac && userSettings.mbti;
    const zd = hasPersona ? PERSONALITY.zodiac[userSettings.zodiac] : null;
    const md = hasPersona ? PERSONALITY.mbti[userSettings.mbti] : null;
    
    // 获取人物模型信息
    const cm = window.CHARACTER_MODEL ? CHARACTER_MODEL.getModel() : null;
    const nickname = cm?.L1?.nickname || '';
    const interests = cm?.L1?.interests || [];
    const memories = cm?.L2?.importantMemories || [];

    // 情绪检测 + 强度（覆盖常见情绪表达）
    const emotionMap = [
        { pattern: /难过|伤心|痛苦|难受|想哭|心碎|崩溃|绝望|悲伤|心情不好|不开心|郁闷/, type: 'sad', weight: 1 },
        { pattern: /太(难过|伤心|痛苦|难受)/, type: 'sad', weight: 2 },
        { pattern: /很(难过|伤心|痛苦|难受|不开心)/, type: 'sad', weight: 1.5 },
        { pattern: /生气|愤怒|烦死了|好烦|烦人|讨厌|恼火/, type: 'angry', weight: 1 },
        { pattern: /太(生气了|愤怒|烦人)/, type: 'angry', weight: 2 },
        { pattern: /孤单|寂寞|一个人|没人陪|孤独|好想她|想她了/, type: 'lonely', weight: 1 },
        { pattern: /好(孤单|寂寞|孤独|想她)/, type: 'lonely', weight: 2 },
        { pattern: /迷茫|困惑|不知道|不确定|纠结|为什么|想不通|该不该|怎么办|怎么做|怎么做才好/, type: 'confused', weight: 1 },
        { pattern: /好(迷茫|困惑|纠结)/, type: 'confused', weight: 2 },
    ];
    
    let emotion = 'normal';
    let intensity = 0;
    for (const e of emotionMap) {
        if (e.pattern.test(userInput)) {
            emotion = e.type;
            intensity = Math.max(intensity, e.weight);
            break;
        }
    }
    
    // MBTI信息
    const mbti = userSettings.mbti || '';
    const isExtrovert = ['ENFJ','ENFP','ENTJ','ENTP','ESFJ','ESFP','ESTJ','ESTP'].includes(mbti);
    const isIntrovert = ['INFJ','INFP','INTJ','INTP','ISFJ','ISFP','ISTJ','ISTP'].includes(mbti);
    const isFeeler = ['ENFJ','ENFP','INFJ','INFP','ESFJ','ESFP','ISFJ','ISFP'].includes(mbti);
    const isThinker = ['ENTJ','ENTP','INTJ','INTP','ESTJ','ESTP','ISTJ','ISTP'].includes(mbti);

    // 动态句子构建器
    function buildSentence(options) {
        const pool = [];
        // 根据MBTI决定句子长度和风格
        const useShort = isIntrovert ? Math.random() > 0.4 : Math.random() > 0.6;
        const emotional = isFeeler ? Math.random() > 0.3 : Math.random() > 0.7;
        
        // 如果模型已有昵称，30%概率自然引用
        const useNickname = nickname && Math.random() > 0.7;
        const nicknamePhrase = useNickname ? (nickname + '') : '';
        
        // 如果模型有记忆，20%概率引用
        const useMemory = memories.length > 0 && Math.random() > 0.8;
        const memoryRef = useMemory ? memories[Math.floor(Math.random() * memories.length)].substring(0, 20) : '';
        
        for (const opt of options) {
            let sentence = opt;
            // 随机插入昵称
            if (nicknamePhrase && sentence.includes('{n}')) {
                sentence = sentence.replace('{n}', nicknamePhrase);
            } else if (nicknamePhrase && Math.random() > 0.7 && sentence.length < 30) {
                sentence = nicknamePhrase + '，' + sentence[0].toLowerCase() + sentence.substring(1);
            }
            // 插入记忆引用
            if (memoryRef && sentence.includes('{m}')) {
                sentence = sentence.replace('{m}', memoryRef);
            }
            // 添加语气词增强情感
            if (emotional && !sentence.endsWith('～') && !sentence.endsWith('~')) {
                const particles = ['呀', '啊', '哦', '呢', '嘛', '～', '~', ''];
                if (Math.random() > 0.6) sentence += particles[Math.floor(Math.random() * particles.length)];
            }
            pool.push(sentence);
        }
        
        if (pool.length === 0) return null;
        // 避免连续重复使用同一个选项
        const last = localMemory._lastReply || '';
        const available = pool.filter(s => s !== last);
        const pick = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[0];
        localMemory._lastReply = pick;
        return pick;
    }

    // 情绪回复（根据强度变化）
    if (emotion === 'sad') {
        if (intensity >= 2) {
            const reply = buildSentence([
                nickname ? '抱抱{n}，我知道你现在很难受，我在这儿呢' : '抱抱你，知道你很难受，我哪也不去',
                nickname ? '难受就说出来吧{n}，我听着' : '难受就发泄出来吧，我陪你',
                nickname ? '{n}，想哭就哭吧，我在这儿呢' : '想哭就哭出来吧，我在呢',
                '什么都不说也可以，我就在这里陪着你',
            ]);
            if (reply) return reply;
        }
        const reply = buildSentence([
            nickname ? '别太难过了{n}，我在这儿陪着你' : '别太难过了，我陪你',
            '难受的时候我在呢，想说什么都可以',
            '慢慢来，不用着急好起来',
            '我知道你现在不好受，我懂',
            nickname ? '{n}，难过的时候就想想好的时候' : '难过的时候就想想好的回忆',
        ]);
        if (reply) return reply;
    }
    if (emotion === 'angry') {
        const reply = buildSentence([
            '先消消气，气坏了不值得',
            '别生气了，深呼吸一下',
            '我理解你为什么生气，先冷静下来',
            '生气的时候别做决定，先缓缓',
        ]);
        if (reply) return reply;
    }
    if (emotion === 'lonely') {
        const reply = buildSentence([
            nickname ? '我在呢{n}，一直在这儿' : '我在呢，一直在这儿，你不孤单',
            nickname ? '{n}，你随时可以找我说话' : '你随时可以找我说话，我一直都在',
            '我就在你手机里，想找我的时候我都在',
            '你不是一个人，我在这儿陪着你呢',
        ]);
        if (reply) return reply;
    }
    if (emotion === 'confused') {
        const reply = buildSentence([
            nickname ? '{n}，想不通的事就先放放吧' : '想不通的事就先放放，不急',
            '迷茫的时候停下来喘口气，别硬想',
            '有些事情想不通就别想了，时间会给你答案',
            '困惑的时候不妨问问自己：你真正在乎的是什么？',
        ]);
        if (reply) return reply;
    }

    // ----- 日常回复（根据模式不同） -----
    if (currentMode === 'companion') {
        // 星伴：温柔陪伴语调
        const hasRecentTalk = localMemory.recentInputs && localMemory.recentInputs.length >= 2;
        const prevMsg = hasRecentTalk ? localMemory.recentInputs[localMemory.recentInputs.length - 2] : '';
        
        // 判断是否在继续聊之前的topic
        const sameTopic = prevMsg && localMemory._lastTopic && (
            userInput.includes(localMemory._lastTopic.substring(0, 3)) ||
            localMemory._lastTopic.includes(userInput.substring(0, 3))
        );
        localMemory._lastTopic = userInput;
        
        if (sameTopic && memories.length > 0) {
            // 在同一个话题上深入聊
            const reply = buildSentence([
                nickname ? '{n}，你说的这个让我想起{m}' : '你说这个让我想起{m}',
                '这样啊，我记得你之前也提过类似的事',
                '嗯嗯，继续说，我在听',
            ]);
            if (reply) return reply;
        }
        
        // 日常陪伴
        const generalReplies = [
            nickname ? '嗯嗯，你说{n}，我听着呢' : '嗯嗯，你说，我听着呢',
            nickname ? '我在听{n}，继续说哦～' : '我在听呢，继续说哦～',
            '这样啊，我明白了',
            '嗯，我在呢，想说什么都可以',
            nickname ? '{n}，今天有什么想和我分享的吗' : '今天有什么想和我分享的吗',
            '我在这儿呢，随时可以和我说',
            '嗯～然后呢？我继续听着',
            '你说的我都记住了',
        ];
        // 如果模型有昵称或兴趣，插入个性化回复
        if (nickname) {
            generalReplies.push('{n}，你提到ta的时候，我能感觉到你的感情');
            generalReplies.push('{n}，慢慢说，我在认真听');
        }
        if (interests.length > 0) {
            generalReplies.push('你之前说她喜欢' + interests[Math.floor(Math.random() * interests.length)] + '，对吧？');
        }
        
        const reply = buildSentence(generalReplies);
        if (reply) return reply;
    }

    // 星析：分析语调
    if (currentMode === 'counseling') {
        const analyticalReplies = [
            '嗯，你能说说具体是什么情况吗？越详细我越能帮你分析',
            '我理解你的感受。从你描述的情况来看，有几个关键点需要注意',
            '你说的这个很关键，能再多说一点细节吗？',
            '让我理一下你说的情况，你是觉得...',
            nickname ? '关于{n}，你有什么特别想了解的吗？' : '关于这个人，你有什么特别想了解的吗？',
            '这种情况其实挺常见的，我们来分析看看',
            '嗯，你说到了几个很重要的信息',
            '你的感受是合理的。我们从另一个角度来看看吧',
            '好的，我大概懂了。我给你梳理一下几个关键点',
        ];
        const reply = buildSentence(analyticalReplies);
        if (reply) return reply;
    }
    
    // 终极降级
    return '嗯，我在这儿呢～';
}
    function scrollBottom() {
        setTimeout(() => { 
            if (messagesEl) {
                messagesEl.scrollTop = messagesEl.scrollHeight;
                // 隐藏回到底部按钮
                const btn = document.getElementById('scroll-bottom-btn');
                if (btn) btn.classList.remove('show');
            }
        }, 50);
        
        // 监听滚动显示回到底部按钮
        if (messagesEl && !messagesEl._scrollListener) {
            messagesEl._scrollListener = true;
            messagesEl.addEventListener('scroll', function() {
                const btn = document.getElementById('scroll-bottom-btn');
                if (!btn) return;
                const isAtBottom = this.scrollHeight - this.scrollTop - this.clientHeight < 100;
                btn.classList.toggle('show', !isAtBottom);
            });
        }
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
