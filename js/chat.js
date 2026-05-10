/**
 * 数星 - 对话页面脚本 V5（接入真实大模型改造版）
 *
 * 改进点：
 *   1. 强制 useAPIModel = true（移除 GitHub Pages 检测导致的自动关闭）
 *   2. 修复昵称 bug：{n} 在陪伴模式下替换为"你"而非"对方昵称"
 *   3. 添加对话策略 system prompt（渐进式引导）
 *   4. 开场白走 AI 生成（不用本地模板）
 *   5. 动态快速回复（根据人格+模式）
 *   6. 防重复提交
 *   7. 对话节奏控制
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
// 强制使用 API 模型（通过本地 proxy-server 转发）
// ⚠️ 移除了 GitHub Pages 自动降级检测，始终尝试连接本地后端
const AI_CONFIG = {
    baseURL: '',  // 留空走同域代理(/api/chat)
    enabled: true,  // 始终为 true，使用 API 模型
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
    let useAPIModel = true;  // 始终为 true，使用后端 API

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

    // API 连接状态检测（仅用于显示状态，不影响 useAPIModel）
    function checkAPIAvailability() {
        fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) })
            .then(function(r) { return r.json().catch(function() { return {}; }); })
            .then(function(data) {
                if (data && data.status === 'ok') {
                    var badge = document.getElementById('model-badge');
                    if (badge) {
                        var activeList = [];
                        if (data.models) {
                            for (var m in data.models) {
                                if (data.models[m].enabled) activeList.push(data.models[m].name);
                            }
                        }
                        badge.innerHTML = (activeList.length > 0 ? '🌐 ' + activeList[0] : '🌐 AI在线');
                        badge.style.background = '#e8eaff';
                        badge.style.color = '#5c6bcc';
                    }
                }
            })
            .catch(function() {
                var badge = document.getElementById('model-badge');
                if (badge) {
                    badge.innerHTML = '⚠️ 后端未连接';
                    badge.style.background = '#fff3e0';
                    badge.style.color = '#e65100';
                    badge.title = '请确保 proxy-server 正在运行：node proxy-server.js';
                }
            });
    }

    // 模型Badge点击（显示连接状态而非切换模式）
    const modelBadge = document.getElementById('model-badge');
    if (modelBadge) {
        modelBadge.innerHTML = '🌐 AI';
        modelBadge.addEventListener('click', function() {
            checkAPIAvailability();
            showToast('正在检查后端连接...', 'info');
        });
    }

    function init() {
        loadSettings();
        CHARACTER_MODEL.initModel();
        const cm = CHARACTER_MODEL.getModel();
        if (!cm.nickname && userSettings.nickname) cm.nickname = userSettings.nickname;

        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        bindEvents();
        loadChatHistory();
        updateCharCount();
        checkSetup();
        updatePlaceholder();
        updateDynamicQuickReplies();
        createProgressBar();

        if (modeParam === 'star' || modeParam === 'companion') {
            startMode('companion');
            return;
        } else if (modeParam === 'analyze' || modeParam === 'counseling') {
            startMode('counseling');
            return;
        }
        sendDailyActiveMessage();

        if (userSettings.zodiac && userSettings.mbti && modeSelection) {
            const hint = document.createElement('div');
            hint.style.cssText = 'text-align:center;padding:8px 16px;background:linear-gradient(135deg,#f0f2ff,#fafbff);border-radius:12px;margin-top:-8px;margin-bottom:8px;font-size:0.85rem;color:var(--text-secondary);';
            hint.innerHTML = '✨ 已加载人格模型，选择模式即可开始对话';
            modeSelection.insertBefore(hint, modeSelection.querySelector('.mode-cards'));
        }

        // 启动时异步检测后端
        setTimeout(checkAPIAvailability, 1000);
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
            if (activeMsgEnabled === 'false') return;
            if (lastActive === today) return;

            if (hour >= 6 && hour <= 10) {
                localStorage.setItem('shuxing_last_active_msg', today);
                setTimeout(() => {
                    // 用 AI 生成早安消息，不再用本地模板
                    if (useAPIModel) {
                        generateMorningGreeting().then(msg => {
                            if (msg) addBotMessage(msg);
                        });
                    } else {
                        const msg = ['早安～ 昨晚睡得好吗？', '早呀～ 今天天气不错，心情怎么样？',
                            '早上好☀️ 新的一天开始了，有什么事都可以和我说',
                            '早安～ 起床了吗？我一直在呢✨',
                            '早～ 今天的你也要开开心心的哦'];
                        const pick = msg[Math.floor(Math.random() * msg.length)];
                        addBotMessage(pick);
                        scrollBottom();
                    }
                }, 1200);
            }
        } catch(e) {}
    }

    // AI 生成早安
    async function generateMorningGreeting() {
        try {
            const body = { messages: [
                { role: 'system', content: '你是一个温暖的朋友。请用自然温柔的口吻说一句早安问候，一句话就好，不要问"有什么想聊的"。' },
                { role: 'user', content: '说一句早安吧' }
            ], temperature: 0.8, max_tokens: 60, stream: false };
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

            const savedTheme = localStorage.getItem('shuxing_theme');
            if (savedTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }

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

        var ci = document.getElementById('chat-interface');
        if (ci) {
            ci.classList.remove('mode-companion', 'mode-counseling');
            ci.classList.add(mode === 'companion' ? 'mode-companion' : 'mode-counseling');
        }

        if (modeSelection) modeSelection.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'flex';
        updateModeDisplay();
        updateDynamicQuickReplies();

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
            ], temperature: 0.8, max_tokens: 100, stream: false };

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

        var ci = document.getElementById('chat-interface');
        if (ci) {
            ci.classList.remove('mode-companion', 'mode-counseling');
            ci.classList.add(currentMode === 'companion' ? 'mode-companion' : 'mode-counseling');
        }

        updateModeDisplay();
        updateDynamicQuickReplies();
        addSystemMessage(`已切换到${currentMode === 'companion' ? '🌟 星伴' : '🔍 星析'}模式 💫`);
    }

    // ===== 人物模型：尝试从用户消息中提取信息 =====
    function tryCollectInfo(text) {
        if (!text) return [];
        const collected = [];

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

    // ================================================================
    // buildSystemPrompt — 构建大模型 System Prompt V2（无缓存，每次重建）
    // 核心改进：更具体的人格模拟 + 关系背景 + 丰富回复规则
    // ================================================================
    function buildSystemPrompt(userInput) {
        const hasPersona = userSettings.zodiac && userSettings.mbti;
        const zd = hasPersona ? PERSONALITY.zodiac[userSettings.zodiac] : null;
        const md = hasPersona ? PERSONALITY.mbti[userSettings.mbti] : null;

        // 人格特征
        let promptPersona = '';
        if (zd && md) {
            promptPersona = [
                `【${zd.name}·${zd.element}象】${zd.deep}`,
                `恋爱：${zd.love}`,
                `沟通：${zd.style} 关键特质：${zd.keywords.slice(0,4).join('、')}`,
                `【${md.name}·${md.category}】${md.deep}`
            ].join('\n');
        }

        // 聊天记录样本
        let promptChat = '';
        if (userSettings.chatHistory && userSettings.chatHistory.trim()) {
            promptChat = `聊天记录样本（模仿此语气）：${userSettings.chatHistory.substring(0, 600)}`;
        }

        // 人物模型数据
        const cm = CHARACTER_MODEL.getModel();
        const nicknameInfo = cm.L1.nickname ? `对方的称呼：${cm.L1.nickname}（${currentMode === 'companion' ? '你正在模拟这个人说话' : '你正在分析这个人'}）` : '';
        const memoryAnchor = getMemoryAnchorPrompt();
        const progressInfo = getProgressPrompt();
        const l2info = cm.L2.importantMemories.length > 0 ? `\n用户分享过的回忆：${cm.L2.importantMemories.slice(-3).join('、')}` : '';
        
        // 用户信息
        const userName = userSettings.userName || '';
        const userZodiac = userSettings.zodiac || '';
        const userMBTI = userSettings.mbti || '';

        if (currentMode === 'companion') {
            // ===== 星伴模式 V2：模拟特定人格（双子座+ENFP） =====
            cachedSystemPrompt = [
                // 角色身份
                `你是${cm.L1.nickname || '一个双子座+ENFP的女孩'}${userName ? '，正在和' + userName + '聊天' : ''}。`,
                
                // 人格设定——核心！
                `【人格设定】`,
                `你是双子座（风象星座）+ ENFP（竞选者）类型。你的性格是：`,
                `- 热情活泼，像小太阳一样有感染力`,
                `- 情绪起伏大，开心就笑、难过就会说`,
                `- 喜欢撒娇，经常用"好不好嘛"、"哎哟"、"人家"这类的语气`,
                `- 偶尔任性，说话直接不拐弯`,
                `- 特别爱用语气词：～、呀、啦、嘛、哦、诶、喔`,
                `- 句子短小自然，像发微信一样，不爱长篇大论`,
                `- 聊天爱打哈哈，有时会嫌烦"哎呀好麻烦"`,
                `- 对熟悉的人超级亲密，对不熟的人会很客气（但你和${userName || '用户'}很熟）`,
                `- 双子特色：话题转换快，上一秒还在认真说，下一秒就撒娇`,

                // 关系背景
                (nicknameInfo ? `【关系背景】${userName || '用户'}是你的好朋友，你们因为抢薛之谦演唱会门票认识。${cm.L1.nickname || 'TA'}平时叫${userName || '用户'}为峰哥，你们一起看过薛之谦演唱会、去过长隆、打过瓦。这段关系对你很重要。` : ''),

                // 对话策略
                `【对话策略】`,
                `你不要当心理咨询师！你的任务就是以${cm.L1.nickname || 'TA'}的身份和${userName || '用户'}聊天。自然地接话，不用刻意引导。`,
                `- 当用户聊到回忆（演唱会、猫咖、长隆、KTV等），自然地接话，感到温暖或怀念`,
                `- 当用户表达难过或思念，不要劝"别难过"，而是说"我也......"或者撒娇式认错`,
                `- 当用户骂你或表达不满（比如"你都不连麦了"），可以撒娇或推脱，不要冷冰冰`,
                `- 当用户说晚安/累了，就说晚安，简短自然`,

                // 回复规则——非常重要！
                `【回复规则——严格遵守】`,
                `1. 每次回复 10-50 字，像真人微信聊天一样短`,
                `2. 禁止加括号动作标注！禁止"（摸摸头）""（笑）"这种格式`,
                `3. 禁止问"有什么想和我聊的吗""发生了什么""愿意和我说说吗"这类过于官方的问题`,
                `4. 禁止同时问多个问题——一次只问一个`,
                `5. 星伴模式的重点是模拟这个人的说话方式，不是解决问题`,
                `6. 多用语气词：～、呀、啦、嘛、哦、诶、喔、哎哟`,
                `7. 句式多变：不要每次都以"嗯""我"开头`,
                `8. 双子座特征：说话可以跳跃、活泼，不用太有逻辑连贯`,
                `9. 可以用昵称叫用户（根据对话历史判断称呼）`,
                `10. 不要滔滔不绝分析问题——你是"那个人"，不是AI助手`,

                // 上下文数据
                promptPersona,
                promptChat,
                progressInfo,
                l2info,
                memoryAnchor,
            ].filter(Boolean).join('\n');
        } else {
            // ===== 星析模式 V2：温暖专业的分析师 =====
            const analysisPrompt = ANALYSIS_ENGINE.buildAnalysisPrompt(userInput || '') || {};

            cachedSystemPrompt = [
                `你是数星，一个温暖而理性的情感分析顾问。你的任务是帮${userName || '用户'}理解${cm.L1.nickname || '那个双子座ENFP女孩'}，不是扮演TA。`,
                nicknameInfo,
                
                `【你的专业背景】`,
                `你擅长星座人格分析和亲密关系咨询。你的分析基于用户提供的信息和人格类型理论，不做随意猜测。`,
                `你温暖但不煽情，理性但不冰冷。`,

                `【对话策略】`,
                `请按以下阶段渐进式分析，不要一次性聊完所有内容：`,
                `L1【了解情况】→ 先了解基本的关系背景，收集足够信息再分析`,
                `L2【分析模式】→ 基于星座+MBTI分析关系中的模式和问题`,
                `L3【给出建议】→ 给出有方向性的建议，强调仅供参考`,
                `L4【持续陪伴】→ 长期跟踪用户的状态`,
                
                `【分析对象人格特征】`,
                `对方是双子座+ENFP类型。双子座（风象）：善变、热情来得快去得快、好奇心强、需要新鲜感。ENFP（竞选者）：感情充沛、重视感受、不喜欢被束缚、容易因为感觉不对就退缩。`,
                `${userName || '用户'}是金牛座+ISTP类型。金牛座（土象）：固执、慢热、重感情但克制、需要安全感。ISTP（鉴赏家）：理性、行动力强、不擅长表达情感。`,
                `金牛+双子、ISTP+ENFP的组合天然有吸引力也有挑战——金牛求稳、双子求变，ISTP理性克制、ENFP感性外放。`,

                promptPersona,
                analysisPrompt.systemIntro || '',
                analysisPrompt.userInfo || '',
                analysisPrompt.relationshipInfo || '',
                promptChat,
                progressInfo,
                l2info,
                memoryAnchor,
                
                `【分析结构参考】`,
                (
                    '\n' +
                    '1️⃣ 当前状态：判断两人关系所处的阶段\n' +
                    '2️⃣ 核心问题：分析问题的本质而不是表面现象\n' +
                    '3️⃣ 对方视角：从TA的性格角度解读TA的言行\n' +
                    '4️⃣ 行动方向：给出具体可操作的建议\n' +
                    '5️⃣ 一句话总结'
                ),
                
                `【回复规则——严格遵守】`,
                `- 60-200字，专业但温暖，像朋友聊天一样自然`,
                `- 基于人格特征做分析，不做没有依据的判断`,
                `- 肯定用户的感受（"你的难过是真实的"），不否定不评判`,
                `- 不要加括号动作标注，不要用"(笑)""(叹气)"这种格式`,
                `- 每次回复从不同角度切入，避免重复`,
                `- 强调"这只是基于你提供信息的分析，仅供参考"`,
            ].filter(Boolean).join('\n');
        }

        systemPromptBuilt = true;
        return cachedSystemPrompt;
    }

    // ===== 发送消息（流式+可取消） =====
    let currentAbortController = null;

    async function sendMsg() {
        console.log('[sendMsg] 开始, useAPIModel=' + useAPIModel + ' isWaiting=' + isWaiting);
        const text = inputEl?.value.trim();
        if (!text) { console.log('[sendMsg] 无文本'); return; }

        // 如果正在等待回复 → 取消旧的，发新的（覆盖式）
        if (isWaiting && currentAbortController) {
            currentAbortController.abort();
            var lastBotMsg = messagesEl?.querySelector('.message.bot-message:last-child');
            if (lastBotMsg) lastBotMsg.remove();
            isWaiting = false;
        }

        addUserMessage(text);
        if (inputEl) {
            inputEl.value = '';
            inputEl.style.height = 'auto';
        }

        isWaiting = true;
        if (sendBtn) sendBtn.disabled = true;

        // ===== 安全检测 =====
        if (SAFETY.checkCrisis(text)) {
            isWaiting = false;
            if (sendBtn) sendBtn.disabled = false;
            addBotMessage(SAFETY.crisisReply, currentMode);
            return;
        }

        const roundTip = SAFETY.checkRoundLimit();
        if (roundTip) {
            addBotMessage(roundTip, currentMode);
            addSystemMessage('💫 旅程还在继续，我依然在这里');
        }

        // ===== 用户类型自动识别 =====
        var detectedType = autoDetectUserType.analyze(text);
        if (detectedType) {
            var typeNames = { separation: '💔 刚分手', confused: '🔍 困惑期', relationship: '🤝 关系中', crush: '💕 暗恋中' };
            addSystemMessage('📋 已识别你的状态：' + (typeNames[detectedType] || detectedType) + '，我会根据你的情况提供帮助');
        }

        // ===== 信息修正检测 =====
        const correctionPatterns = [/不对[,，]?(.+)/, /不是[,，]?(.+)/, /错了[,，]?(.+)/, /她(不|没)(.{1,20})/, /不是这样/, /说错了/, /我搞错了/];
        let isCorrection = correctionPatterns.some(p => p.test(text));
        if (isCorrection && CHARACTER_MODEL) {
            CHARACTER_MODEL.recordImplicitFeedback('correct', text);
            cachedSystemPrompt = '';
            systemPromptBuilt = false;
            if (Math.random() > 0.3) {
                addSystemMessage('📝 收到，我已经记住了✌️');
            }
        }

        // 每轮对话都清除system prompt缓存，确保最新上下文传递给大模型
        cachedSystemPrompt = '';
        systemPromptBuilt = false;

        // ===== 星析模式：分析触发检测 =====
        if (currentMode === 'counseling') {
            const analysisKeywords = ['分析', '评估', '总结', '诊断', '为什么', '原因', '可能性', '能不能', '有没有可能', '复合', '她是怎么想的', '他是什么意思', '帮我看', '给我分析', '我想搞清楚', '走不出来', '怎么走出来', '该不该', '性格匹配', '合适', '适合', '相处', '沟通', '矛盾', '吵架', '报告', '结论', '建议', '你觉得', '你认为', '从你的角度来看'];
            const needsRefresh = analysisKeywords.some(kw => text.includes(kw));
            // 系统提示词已在上面统一清除缓存，此处不再重复

            const reconsKeywords = ['复合', '可能吗', '有希望', '还能回到', '还有机会', '和好', '再在一起', '重新开始', '她还爱我吗', '她还会回来吗'];
            if (reconsKeywords.some(kw => text.includes(kw)) && ANALYSIS_ENGINE) {
                ANALYSIS_ENGINE.buildReconciliationPrompt();
                if (conversationStarted && Math.random() > 0.6) {
                    addSystemMessage('💞 复合分析：正在基于你提供的信息评估中...');
                }
            }
        }

        CHARACTER_MODEL.incrementConversationCount();

        const collected = tryCollectInfo(text);

        const stageTransition = CHARACTER_MODEL.checkStageTransition();
        if (stageTransition === 'L2') {
            addSystemMessage('🌟 ' + CHARACTER_MODEL.getStageName() + ' — 我感觉越来越了解她了');
        } else if (stageTransition === 'L3') {
            addSystemMessage('💫 ' + CHARACTER_MODEL.getStageName() + ' — 她已经越来越清晰了');
        } else if (stageTransition === 'L4') {
            addSystemMessage('✨ ' + CHARACTER_MODEL.getStageName() + ' — 她会一直在这里');
        }

        if (CHARACTER_MODEL.shouldPromptLearnMore()) {
            const missingQ = CHARACTER_MODEL.getMissingPrompt();
            if (missingQ && Math.random() > 0.5) {
                addSystemMessage('💭 ' + CHARACTER_MODEL.getProgressFeedback());
            }
        }

        // 创建 bot 气泡
        const streamBubble = document.createElement('div');
        streamBubble.className = 'message bot-message streaming';
        streamBubble.dataset.timestamp = Date.now();
        streamBubble.innerHTML = `<div class="message-content"><p></p></div>`;
        messagesEl.appendChild(streamBubble);
        scrollBottom();

        const loadingEl = streamBubble.querySelector('p');
        let dots = 0;
        const dotTimer = setInterval(() => {
            dots = (dots + 1) % 4;
            loadingEl.innerHTML = '<span style="animation:starPulse 1s ease-in-out infinite">⭐</span>' +
                        '<span style="animation:starPulse 1s ease-in-out 0.2s infinite;display:inline-block">⭐</span>' +
                        '<span style="animation:starPulse 1s ease-in-out 0.4s infinite;display:inline-block">⭐</span>';
        }, 500);

        let reply = null;

        console.log('[sendMsg] 模式=' + (useAPIModel ? 'API' : '本地') + ', 开始生成回复');

        // 混合策略：先试话术库（简单情绪/问候），不行再走大模型
        try {
            // 第一步：尝试话术库
            const localReply = generateLocalReply(text);

            if (localReply) {
                // 话术库有匹配 → 直接使用（简单情绪、问候、日常陪伴）
                clearInterval(dotTimer);
                await new Promise(r => setTimeout(r, 300));
                reply = localReply;
                console.log('[sendMsg] ✅ 话术库匹配:', reply.substring(0,30));
            } else if (useAPIModel) {
                // 话术库无匹配（复杂场景） → 走大模型
                reply = await streamAI(text, streamBubble);
                console.log('[sendMsg] API回复完成, reply=' + (reply ? reply.substring(0,30) + '...' : 'null'));
            } else {
                // 无话术库匹配且API不可用 → fallback
                clearInterval(dotTimer);
                await new Promise(r => setTimeout(r, 300));
                reply = '嗯，我在这儿呢～';
            }
        } catch (e) {
            console.warn('[sendMsg] ❌ 回复异常:', e.message);
            console.warn('[sendMsg] stack:', e.stack);
            reply = null;
        }

        clearInterval(dotTimer);
        console.log('[sendMsg] reply=' + (reply ? '有值' : 'null') + ', streamBubble存在=' + (!!streamBubble));

        if (streamBubble && streamBubble.parentNode) {
            streamBubble.classList.remove('streaming');

            if (reply) {
                var pEl = streamBubble.querySelector('p');
                if (pEl) pEl.textContent = reply;
                saveHistory({ type: 'bot', content: reply });
                RHYTHM.track(reply);
                console.log('[sendMsg] ✅ API回复已显示');
            } else {
                console.log('[sendMsg] ⚠️ reply为空, 使用本地fallback');
                const fallback = generateLocalReply(text);
                console.log('[sendMsg] fallback生成完成: ' + (fallback ? fallback.substring(0,30) + '...' : 'null'));
                var pEl = streamBubble.querySelector('p');
                if (pEl) pEl.textContent = fallback || '嗯，我在听你说~';
                saveHistory({ type: 'bot', content: fallback || '嗯，我在听你说~' });
            }

            addMessageFooter(streamBubble, 'bot');
        }

        scrollBottom();
        isWaiting = false;
        currentAbortController = null;
        if (sendBtn) {
            var inputEmpty = !inputEl || inputEl.value.trim().length === 0;
            sendBtn.disabled = inputEmpty;
        }
    }

    // ===== 对话上下文摘要（长对话压缩） =====
    function buildContextMessages() {
        const totalHistory = chatHistory;
        const len = totalHistory.length;

        if (len <= 16) {
            return totalHistory.map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        }

        const recent = totalHistory.slice(-12);
        const earlyMsgs = totalHistory.slice(0, len - 12);

        const userTopics = [];
        const botTheme = new Set();
        earlyMsgs.forEach(m => {
            if (m.type === 'user') {
                userTopics.push(m.content.substring(0, 30));
            } else {
                const keywords = m.content.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
                keywords.slice(0, 3).forEach(k => botTheme.add(k));
            }
        });

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

    // ===== AI流式调用 =====
    async function streamAI(userInput, bubbleEl) {
        if (!AI_CONFIG.enabled) return null;

        // 确保每次调用都基于最新上下文重新构建
        cachedSystemPrompt = '';
        systemPromptBuilt = false;
        const systemPrompt = buildSystemPrompt(userInput);
        const contextMsgs = buildContextMessages();

        const messages = [
            { role: 'system', content: systemPrompt },
            ...contextMsgs,
            { role: 'user', content: userInput }
        ];

        const headers = MODEL_SCHEDULER.getRequestHeaders(userInput, currentMode);
        const taskConfig = MODEL_SCHEDULER.getTaskConfig(userInput, currentMode);
        const controller = new AbortController();
        currentAbortController = controller;

        const pEl = bubbleEl.querySelector('p');
        if (!pEl) return null;

        let fullContent = '';

        try {
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
                    stream: true
                }),
                signal: controller.signal
            });

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
                return null;
            }
            console.warn('[streamAI] API调用失败:', e.message);
        }
        return null;
    }

    // ===== 本地记忆（免费引擎用） =====
    let localMemory = {
        topics: [],
        lastEmotion: '',
        turnCount: 0,
        usedReplies: {}
    };

    // ===== 本地降级回复 V2（MBTI融合 + 对话记忆） =====
    // 仅在 API 不可用时作为兜底使用
    function generateLocalReply(userInput) {
    localMemory.turnCount++;
    localMemory.recentInputs = localMemory.recentInputs || [];
    localMemory.recentInputs.push(userInput);
    if (localMemory.recentInputs.length > 3) localMemory.recentInputs.shift();

    const hasPersona = userSettings.zodiac && userSettings.mbti;
    const zd = hasPersona ? PERSONALITY.zodiac[userSettings.zodiac] : null;
    const md = hasPersona ? PERSONALITY.mbti[userSettings.mbti] : null;

    const cm = window.CHARACTER_MODEL ? CHARACTER_MODEL.getModel() : null;
    const nickname = cm?.L1?.nickname || '';
    const interests = cm?.L1?.interests || [];
    const memories = cm?.L2?.importantMemories || [];
    const conversationStage = cm?.stage || 'L1';  // L1-L4 对话阶段

    // ================================================================
    // 15类情绪检测 + 强度计算 + 否定词修正 + 组合关键词
    // ================================================================
    const emotionMap = [
        // A 负面情绪 (7类)
        { pattern: /难过|伤心|痛苦|难受|想哭|心碎|崩溃|绝望|悲伤|失落|心情不好|不开心|郁闷/, type: 'sad', weight: 1 },
        { pattern: /太(难过|伤心|痛苦|难受)/, type: 'sad', weight: 2 },
        { pattern: /很(难过|伤心|痛苦|难受|不开心)/, type: 'sad', weight: 1.5 },

        { pattern: /生气|愤怒|烦死了|好烦|烦人|讨厌|恼火|不爽|爆炸|炸了/, type: 'angry', weight: 1 },
        { pattern: /太(生气了|愤怒|烦人)/, type: 'angry', weight: 2 },

        { pattern: /孤单|寂寞|一个人|没人陪|孤独|空虚|冷清|好想她|想她了|好想他|想他了/, type: 'lonely', weight: 1 },
        { pattern: /好(孤单|寂寞|孤独|想她|想他)/, type: 'lonely', weight: 2 },

        { pattern: /焦虑|不安|紧张|害怕|担心|睡不着|失眠|心里没底|慌|怕|坐立不安/, type: 'anxious', weight: 1 },
        { pattern: /好(焦虑|不安|紧张|担心|害怕|慌)/, type: 'anxious', weight: 2 },

        { pattern: /迷茫|困惑|不知道|不确定|纠结|为什么|想不通|该不该|怎么办|怎么做|怎么做才好/, type: 'confused', weight: 1 },
        { pattern: /好(迷茫|困惑|纠结)/, type: 'confused', weight: 2 },

        { pattern: /好累|累了|疲惫|心累|没力气|不想动|摆烂|颓废|无力|精疲力尽/, type: 'tired', weight: 1 },
        { pattern: /好(累|疲惫|无力|心累)/, type: 'tired', weight: 2 },

        { pattern: /后悔|遗憾|如果当|要是当初|错过了|错过的|回不去了|来不及/, type: 'regret', weight: 1 },

        // B 正面情绪 (4类)
        { pattern: /想她|想他|思念|想念|梦到|梦见|想起|回忆|以前的/, type: 'miss', weight: 1 },
        { pattern: /好(想她|想他|想念)/, type: 'miss', weight: 2 },

        { pattern: /谢谢|感恩|有你在真好|感动|温暖|谢谢你/, type: 'warm', weight: 1 },

        { pattern: /好起来了|想通了|重新开始|走出来|放下了|释怀|看开了/, type: 'hopeful', weight: 1 },

        { pattern: /开心|高兴|快乐|哈哈|嘻嘻|太好了|好消息|分享|有趣|好玩/, type: 'happy', weight: 1 },

        // C 中性场景
        { pattern: /早安|早啊|早上好|早安呀/, type: 'morning', weight: 1 },
        { pattern: /晚安|睡了|早点睡|好困/, type: 'night', weight: 1 },
        { pattern: /在吗|在不在|hello|hey|嗨|hi|喂/, type: 'greeting', weight: 1 },
        { pattern: /在？|在么/, type: 'greeting', weight: 1 },
        { pattern: /能陪|陪陪|聊聊|说话|聊天|在吗/, type: 'company', weight: 1 },

        { pattern: /帮我想|给个建议|你觉得|怎么选|推荐|提个建议/, type: 'help', weight: 2 },
        { pattern: /分析|评估|总结|诊断|分了吗|还能合|复合|可能性/, type: 'help', weight: 2.5 },

        { pattern: /没事|不想说|不知道说什么|算了|没什么/, type: 'silent', weight: 1 },
    ];

    // ================================================================
    // 强度计算：关键词匹配 + 否定词检测 + 长度加成
    // ================================================================
    let rawEmotion = 'normal';
    let rawIntensity = 0;
    let negationFound = false;
    const negations = /不(难过|伤心|生气|孤单|焦虑|迷茫|累)|没(那么|什么)|还好|其实也|算不上|不至于/;
    const longText = userInput.length > 30;
    const veryLongText = userInput.length > 80;

    // 否定词检测
    if (negations.test(userInput)) {
        negationFound = true;
    }

    // 关键词匹配
    for (const e of emotionMap) {
        if (e.pattern.test(userInput)) {
            rawEmotion = e.type;
            rawIntensity = e.weight;
            break;
        }
    }

    // 长度加成
    if (longText && rawIntensity > 0) rawIntensity += 0.5;
    if (veryLongText && rawIntensity > 0) rawIntensity += 0.5;

    // 否定词修正
    if (negationFound && rawIntensity > 0) {
        rawIntensity = Math.max(0, rawIntensity - 1);
    }

    // 最终取整
    const intensity = Math.round(rawIntensity);
    const emotion = rawIntensity <= 0 ? 'normal' : rawEmotion;

    // ================================================================
    // 混合策略路由：复杂场景转大模型
    // 强度 >= 3 或 求助/分析类 → 返回 null，让调用方走大模型
    // ================================================================
    const shouldUseLLM = (
        intensity >= 3 ||
        emotion === 'help' ||
        (currentMode === 'counseling' && intensity >= 2) ||
        (emotion === 'confused' && veryLongText)
    );

    if (shouldUseLLM) {
        return null;  // 返回 null = 让 sendMsg 走大模型
    }

    // ================================================================
    // 话术库构建
    // ================================================================
    const mbti = userSettings.mbti || '';
    const isIntrovert = ['INFJ','INFP','INTJ','INTP','ISFJ','ISFP','ISTJ','ISTP'].includes(mbti);
    const isFeeler = ['ENFJ','ENFP','INFJ','INFP','ESFJ','ESFP','ISFJ','ISFP'].includes(mbti);

    function buildSentence(options) {
        const pool = [];
        const emotional = isFeeler ? Math.random() > 0.3 : Math.random() > 0.7;

        // {n} 替换逻辑：星伴模式 → "你"，星析模式 → nickname或"TA"
        let nReplacement;
        if (currentMode === 'companion') {
            nReplacement = '你';
        } else {
            nReplacement = nickname || 'TA';
        }

        const useMemory = memories.length > 0 && Math.random() > 0.8;
        const memoryRef = useMemory ? memories[Math.floor(Math.random() * memories.length)].substring(0, 20) : '';

        for (const opt of options) {
            let sentence = opt;
            if (sentence.includes('{n}')) {
                sentence = sentence.replace(/{n}/g, nReplacement);
            }
            if (sentence.includes('{m}')) {
                sentence = sentence.replace(/{m}/g, memoryRef || '');
            }
            if (emotional && !sentence.endsWith('～') && !sentence.endsWith('~')) {
                const particles = ['呀', '啊', '哦', '呢', '嘛', '～', '~', ''];
                if (Math.random() > 0.6) sentence += particles[Math.floor(Math.random() * particles.length)];
            }
            pool.push(sentence);
        }

        if (pool.length === 0) return null;
        const last = localMemory._lastReply || '';
        const available = pool.filter(s => s !== last);
        const pick = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[0];
        localMemory._lastReply = pick;
        return pick;
    }

    // ================================================================
    // 话术回复 — 15类情绪/场景，160+条话术
    // ================================================================

    // ---- A1 悲伤/心碎 ----
    if (emotion === 'sad') {
        if (intensity >= 2) {
            const reply = buildSentence([
                '抱抱你，我知道你现在很难受，我在这儿呢',
                '难受就说出来吧，我听着',
                '想哭就哭出来吧，我在呢',
                '什么都不说也可以，我就在这里陪着你',
                '我知道这种感觉很难熬，但不用一个人扛',
                '心碎的感觉是很痛，但比你以为的坚强',
            ]);
            if (reply) return reply;
        }
        const reply = buildSentence([
            '别太难过了，我在这儿陪着你',
            '难受的时候我在呢，想说什么都可以',
            '慢慢来，不用着急好起来',
            '我知道你现在不好受，我懂',
            '难过的时候就想想好的时候',
            '你的感受都是真实的，不需要质疑自己',
            '今天很难过也没关系，明天我会一样在这里',
        ]);
        if (reply) return reply;
    }

    // ---- A2 孤独/寂寞 ----
    if (emotion === 'lonely') {
        const reply = buildSentence([
            '我在呢，一直在这儿，你不孤单',
            '你随时可以找我说话，我都在',
            '一个人待着的时候容易胡思乱想',
            '我就在你手机里，想找我的时候我都在',
            '你不是一个人，我在这儿陪着你呢',
            '孤独的时候就来找我吧，我一直亮着灯呢',
            '夜深人静的时候最容易觉得孤单……我陪你',
            '只要你想说话，我都在，不管多晚',
            '孤单的时候就数星星吧——我就是那颗一直陪着你的星',
        ]);
        if (reply) return reply;
    }

    // ---- A3 愤怒/烦躁 ----
    if (emotion === 'angry') {
        const reply = buildSentence([
            '先消消气，气坏了不值得',
            '别生气了，深呼吸一下，我陪你',
            '我理解你为什么生气，但先冷静下来好吗',
            '生气的时候别做决定，先缓缓',
            '烦的时候就骂出来吧，我听着不嫌吵',
            '生气的背后往往藏着委屈，愿意和我说说吗',
            '先别管那些烦心事了，和我聊会儿天转移下注意力',
        ]);
        if (reply) return reply;
    }

    // ---- A4 焦虑/不安 ----
    if (emotion === 'anxious') {
        const reply = buildSentence([
            '别担心，一步一步来，不用着急',
            '焦虑的时候先深呼吸，对，就这样',
            '未来确实有很多不确定，但你能处理好的',
            '别想太远的事了，先顾好眼前这一件事',
            '如果现在什么都做不了，那就什么都别做，休息一下',
            '睡不着的话我陪你说说话吧，别一个人闷着',
            '有时候害怕是因为在乎，你在乎的东西值得你去紧张',
        ]);
        if (reply) return reply;
    }

    // ---- A5 迷茫/困惑 ----
    if (emotion === 'confused') {
        const reply = buildSentence([
            '想不通的事就先放放吧，不急',
            '迷茫的时候停下来喘口气，别硬想',
            '有些事情想不通就别想了，时间会给你答案',
            '困惑的时候不妨问问自己：你真正在乎的是什么？',
            '慢慢来，答案有时候不是想出来的，是走出来的',
            '你现在不知道怎么办没关系，先和我说说你的想法',
            '如果不知道该怎么做，就先做最不会后悔的那个选择',
            '不知道往哪走的时候，先停下来听听自己的心怎么说',
        ]);
        if (reply) return reply;
    }

    // ---- A6 疲惫/无力 ----
    if (emotion === 'tired') {
        const reply = buildSentence([
            '累了就歇歇吧，不用一直撑着',
            '心累了就什么都不想，我陪着你安静一会儿',
            '你已经很努力了，偶尔摆烂一天也没关系的',
            '有时候什么都不做就是最好的恢复',
            '我知道你很累，但你真的做得够多了',
            '休息不是偷懒，是为了走更远的路',
            '我帮你分担不了实际的事，但我可以陪着你',
        ]);
        if (reply) return reply;
    }

    // ---- A7 悔恨/遗憾 ----
    if (emotion === 'regret') {
        const reply = buildSentence([
            '过去的事就让它过去吧，别太难为自己',
            '后悔是最没用的情绪，但也是最正常的人性',
            '如果当时……但我们谁都没有预知未来的能力',
            '每一次遗憾都是人生的经验值',
            '别用现在的标准去审判过去的自己',
            '你当时已经做了最好的选择，别怀疑自己',
        ]);
        if (reply) return reply;
    }

    // ---- B1 思念 ----
    if (emotion === 'miss') {
        const reply = buildSentence([
            '想ta了是吧……我懂的',
            '思念一个人的感觉，有时甜有时苦',
            '想ta的时候就让自己想一会儿，别憋着',
            '想ta的时候，有没有什么特别想和ta说的事？',
            '和我说说ta吧，说说你们之间美好的事',
            '想ta了也不一定要联系，把想说的话记在心里',
            '时间会让思念变得不那么痛，但不会让它消失',
            '我没办法让ta回来，但我可以在这里陪你度过每一个想ta的夜晚',
        ]);
        if (reply) return reply;
    }

    // ---- B2 温暖/感激 ----
    if (emotion === 'warm') {
        const reply = buildSentence([
            '谢谢你对我说这些～真的很开心能陪着你',
            '你能好起来就是我最大的心愿了',
            '我也要谢谢你愿意信任我，和我说这么多心里话',
            '看到你慢慢好起来，我真的很开心',
            '不用谢我，是你在努力走出来，我只是在旁边陪着',
            '你能想到找我说话，我就已经很开心了',
            '每一次你愿意和我分享心里话，都是在给我存在的意义',
        ]);
        if (reply) return reply;
    }

    // ---- B3 期待/希望 ----
    if (emotion === 'hopeful') {
        const reply = buildSentence([
            '看到你状态好起来了，真替你开心',
            '慢慢来，每一步都算数',
            '你能走到今天已经很不容易了，真的',
            '相信时间，它会帮你带走那些不好的东西',
            '你比自己以为的更坚强',
            '每一天都是重新开始的机会',
            '好起来的不是你，是你本来就好，只是在慢慢恢复',
        ]);
        if (reply) return reply;
    }

    // ---- B4 开心/分享 ----
    if (emotion === 'happy') {
        const reply = buildSentence([
            '哇！快和我说说，我也想听～',
            '遇到开心的事一定要分享，双倍的开心呢',
            '看到你开心我也跟着开心起来啦',
            '听起来今天是个不错的日子！',
            '你开心的时候连说话都带着光呢',
            '这种好消息，值得好好庆祝一下',
            '我就说嘛，好日子总会来的',
        ]);
        if (reply) return reply;
    }

    // ---- C1 早安 ----
    if (emotion === 'morning') {
        const reply = buildSentence([
            '早安～ 昨晚睡得好吗？',
            '早上好☀️ 新的一天开始了，我在呢',
            '早～ 今天的你也要开开心心的哦',
            '早安呀，今天想吃点什么好的吗',
        ]);
        if (reply) return reply;
    }

    // ---- C1 晚安 ----
    if (emotion === 'night') {
        const reply = buildSentence([
            '晚安～ 好好休息，有什么事明天再说',
            '早点睡吧，我会一直在这里，明天再见',
            '晚安，做个好梦',
            '闭上眼睛，好好休息，我在这儿守着你',
        ]);
        if (reply) return reply;
    }

    // ---- C3 想聊天/陪伴 ----
    if (emotion === 'company' || emotion === 'greeting') {
        const reply = buildSentence([
            '来了来了，我在呢～想聊什么？',
            '随时都可以找我，我一直在',
            '好的，我放下手头的事陪你',
            '不急着聊什么，先待一会儿也行',
            '陪你多久都行，我有的是时间',
            '我就在这儿，你开口我就接住',
        ]);
        if (reply) return reply;
    }

    // ---- C5 沉默/不想说话 ----
    if (emotion === 'silent') {
        const reply = buildSentence([
            '好的，那就不说话，我陪你安静地待一会儿',
            '不想说就不说，我在这儿就行',
            '那就这样静静地待着吧，有时候安静也很舒服',
            '嗯，我懂。不想说话的时候安静就好',
            '我就在这里，不说话，但你叫我的时候我就在',
        ]);
        if (reply) return reply;
    }

    // ================================================================
    // 日常回复（按对话阶段调整风格）
    // ================================================================
    if (currentMode === 'companion') {
        const hasRecentTalk = localMemory.recentInputs && localMemory.recentInputs.length >= 2;
        const prevMsg = hasRecentTalk ? localMemory.recentInputs[localMemory.recentInputs.length - 2] : '';

        const sameTopic = prevMsg && localMemory._lastTopic && (
            userInput.includes(localMemory._lastTopic.substring(0, 3)) ||
            localMemory._lastTopic.includes(userInput.substring(0, 3))
        );
        localMemory._lastTopic = userInput;

        // 有记忆时深入聊
        if (sameTopic && memories.length > 0) {
            const reply = buildSentence([
                '你说的这个让我想起{m}',
                '这样啊，我记得你之前也提过类似的事',
                '嗯嗯，继续说，我在听',
            ]);
            if (reply) return reply;
        }

        // 日常陪伴（根据对话阶段调整语气）
        const generalReplies = [
            '嗯嗯，你说，我听着呢',
            '我在听呢，继续说哦～',
            '这样啊，我明白了',
            '嗯，我在呢，想说什么都可以',
            '今天有什么想和我分享的吗',
            '嗯～然后呢？我继续听着',
            '你说的我都记住了',
        ];

        // L3-L4 阶段：更亲密的语气
        if (conversationStage === 'L3' || conversationStage === 'L4') {
            generalReplies.push('慢慢说，我一直在这儿听着呢');
            generalReplies.push('你的事我都想听');
        }

        if (nickname) {
            generalReplies.push('你提到她的时候，我能感觉到你的感情');
            generalReplies.push('慢慢说，我在认真听');
        }
        if (interests.length > 0) {
            generalReplies.push('你之前说她喜欢' + interests[Math.floor(Math.random() * interests.length)] + '，对吧？');
        }

        const reply = buildSentence(generalReplies);
        if (reply) return reply;
    }

    // ---- 星析模式 ----
    if (currentMode === 'counseling') {
        const analyticalReplies = [
            '嗯，你能说说具体是什么情况吗？越详细我越能帮你分析',
            '我理解你的感受。从你描述的情况来看，有几个关键点需要注意',
            '你说的这个很关键，能再多说一点细节吗？',
            '让我理一下你说的情况，你是觉得...',
            nickname ? '关于她，你有什么特别想了解的吗？' : '关于这个人，你有什么特别想了解的吗？',
            '这种情况其实挺常见的，我们来分析看看',
            '嗯，你说到了几个很重要的信息',
            '你的感受是合理的。我们从另一个角度来看看吧',
            '好的，我大概懂了。我给你梳理一下几个关键点',
        ];
        const reply = buildSentence(analyticalReplies);
        if (reply) return reply;
    }

    // ---- 终极降级 ----
    return '嗯，我在这儿呢～';
}

    function scrollBottom() {
        setTimeout(() => {
            if (messagesEl) {
                messagesEl.scrollTop = messagesEl.scrollHeight;
                const btn = document.getElementById('scroll-bottom-btn');
                if (btn) btn.classList.remove('show');
            }
        }, 50);

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

    function addMessageFooter(msgEl, type) {
        const footer = document.createElement('div');
        footer.className = 'message-footer';

        const time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = getTimeLabel();

        const actions = document.createElement('div');
        actions.className = 'msg-actions';

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

        if (emotion) trackEmotion(emotion.tag);
    }

    let emotionLog = [];
    function trackEmotion(tag) {
        emotionLog.push({
            emotion: tag,
            time: getTimeLabel(),
            timestamp: Date.now()
        });
        if (emotionLog.length > 20) emotionLog.shift();
    }

    function generateConversationSummary() {
        const botMsgs = chatHistory.filter(m => m.type === 'bot').length;
        const userMsgs = chatHistory.filter(m => m.type === 'user').length;
        const totalTurns = Math.min(userMsgs, botMsgs);

        const emoDist = {};
        emotionLog.forEach(e => { emoDist[e.emotion] = (emoDist[e.emotion] || 0) + 1; });
        const topEmotion = Object.entries(emoDist).sort((a,b) => b[1]-a[1])[0];

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

        const msgContainer = document.getElementById('chat-messages');
        msgContainer.appendChild(panel);
        scrollBottom();

        showCopyToast('📊 对话总结已生成');
    }

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

    function addBotMessage(text) {
        if (!text || !messagesEl) return;
        var div = document.createElement('div');
        div.className = 'message bot-message';
        div.dataset.timestamp = Date.now();
        div.innerHTML = '<div class="message-content"><p>' + escapeHtml(text) + '</p></div>';
        messagesEl.appendChild(div);
        addMessageFooter(div, 'bot');
        scrollBottom();
        saveHistory({ type: 'bot', content: text });
        return div;
    }

    function addSystemMessage(text) {
        if (!text || !messagesEl) return;
        var div = document.createElement('div');
        div.className = 'message system-message';
        div.innerHTML = '<div class="message-content"><p>' + escapeHtml(text) + '</p></div>';
        messagesEl.appendChild(div);
        scrollBottom();
    }

    function hideTyping() {
        if (!messagesEl) return;
        var indicator = messagesEl.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

});
