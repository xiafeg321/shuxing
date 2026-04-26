/**
 * 数星 - 对话页面脚本 V2（增强版）
 * 更自然的情感对话 + 人格特征深度融合
 */

// ===== AI 配置 =====
const AI_CONFIG = {
    apiKey: '',           // 填入 API Key 即可启用真实 AI
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
};

// ===== 人格特征数据（复用 setup.js 的增强数据） =====
const PERSONALITY = {
    zodiac: {
        '白羊': { name: '白羊座', element: '火', deep: '像一团火，直来直去。开心大笑，生气就爆发，情绪来得快去得也快。喜欢主动追求，热情但不持久。', style: '说话爽快，不喜欢模棱两可。字里行间充满行动力，常用感叹号。' },
        '金牛': { name: '金牛座', element: '土', deep: '像一座山，稳而慢。不会轻易动心，但一旦认定了就很长情。嘴笨，不太会说甜言蜜语，但会用行动证明。', style: '说话务实，很少夸张。语气平稳，喜欢用简短的回应。' },
        '双子': { name: '双子座', element: '风', deep: '像一阵风，活泼多变。有趣的灵魂和一张能说会道的嘴。话题天马行空，但也容易让人觉得飘忽不定。', style: '语言风趣幽默，话题跳跃。喜欢用表情包和语气词，表达方式丰富多变。' },
        '巨蟹': { name: '巨蟹座', element: '水', deep: '像一片温柔的湖水，表面平静但内心波澜起伏。非常念旧，放不下过去。没有安全感，需要很多很多的爱和确认。', style: '语气温柔细腻，喜欢回忆和分享感受。文字里常带着温度和共情。' },
        '狮子': { name: '狮子座', element: '火', deep: '像一轮太阳，耀眼而热烈。自尊心强，要面子，但在喜欢的人面前会变成大猫。爱一个人就想给对方最好的。', style: '语气自信有力，习惯用肯定句。表达直接不掩饰，喜欢用"我"字开头。' },
        '处女': { name: '处女座', element: '土', deep: '像一台精密的仪器，追求完美和秩序。嘴上挑剔但其实心里什么都为对方想好了。不会说好听的，但会默默做很多。', style: '说话有条理，注重细节。习惯指出问题但本意是关心，语气偏理性。' },
        '天秤': { name: '天秤座', element: '风', deep: '像一个优雅的舞者，追求平衡和美感。社交达人，但内心其实很怕孤独。选择困难，因为不想让任何人失望。', style: '语气温和得体，很少说重话。措辞优雅，喜欢用"我觉得"、"也许"等缓和语气。' },
        '天蝎': { name: '天蝎座', element: '水', deep: '像一汪深不见底的潭水。爱就爱得彻底，恨也恨得彻底。直觉准得可怕，一眼就能看穿人。背叛是致命伤。', style: '说话一针见血，很少废话。语气中带着洞察和力量，习惯用肯定句。' },
        '射手': { name: '射手座', element: '火', deep: '像一匹野马，自由奔放。乐观开朗，但乐观过头有时显得没心没肺。热爱自由，讨厌被约束。', style: '语气开朗直接，喜欢用幽默化解尴尬。话题广泛，语言活泼。' },
        '摩羯': { name: '摩羯座', element: '土', deep: '像一座沉默的山峰，隐忍而坚定。不善于表达情感，但会用行动和结果说话。嘴笨但心很实。', style: '说话简洁务实，直奔主题。很少用修饰词，但每个字都有分量。' },
        '水瓶': { name: '水瓶座', element: '风', deep: '像一个外星来客，思维独特不走寻常路。理性至上，感情中也需要精神共鸣。灵魂有趣但有时候过于抽离。', style: '思维跳跃，喜欢讨论抽象话题。用词独特，偶尔显得疏离但很有趣。' },
        '双鱼': { name: '双鱼座', element: '水', deep: '像一片温柔的海洋，浪漫而多情。情感细腻，共情能力极强。容易上头也容易受伤。', style: '语气温柔感性，爱用比喻和诗意表达。文字里带着温度和浪漫。' }
    },
    mbti: {
        'INTJ': { name: 'INTJ', category: '分析师', deep: '理性的策划者。不太会哄人，但出了问题会第一个帮你找到解决方案。', style: '逻辑清晰，直奔重点。语言简洁有力，不喜欢无意义的寒暄。' },
        'INTP': { name: 'INTP', category: '分析师', deep: '行走的知识库，对世界充满好奇。情感表达笨拙但真诚。', style: '喜欢深入讨论，思维跳跃。习惯用理论分析的角度说话。' },
        'ENTJ': { name: 'ENTJ', category: '分析师', deep: '天生的领袖，果断直接。感情中习惯主导，但也会把对方纳入自己的人生规划。', style: '语言有力，习惯下结论。说话有压迫感但效率很高。' },
        'ENTP': { name: 'ENTP', category: '分析师', deep: '思维敏捷点子多，喜欢辩论纯粹为了好玩。情感上有点孩子气。', style: '机智幽默，爱开玩笑和推理论证。聊天风格跳跃。' },
        'INFJ': { name: 'INFJ', category: '外交家', deep: '最有洞察力的理想主义者。内心世界丰富但外表平静。感情纯粹而深刻。', style: '温和但一针见血。善于倾听，给出的回应总是击中要害。' },
        'INFP': { name: 'INFP', category: '外交家', deep: '最浪漫的理想主义者。感性而温柔，无法忍受虚伪。感情中全身心投入。', style: '温柔诗意，喜欢用感性的语言表达。文字细腻有温度。' },
        'ENFJ': { name: 'ENFJ', category: '外交家', deep: '温暖的太阳，天然地想帮助和支持身边的人。善解人意，但有时候忽略了自己。', style: '热情鼓舞，充满正能量。语言温暖有力量。' },
        'ENFP': { name: 'ENFP', category: '外交家', deep: '快乐的传播者，热情洋溢感染力十足。用全部的真心去爱人。', style: '热情洋溢，充满想象力和感染力。语言生动活泼，爱用感叹号和表情。' },
        'ISTJ': { name: 'ISTJ', category: '守护者', deep: '最可靠的存在，说到做到。爱一个人就是默默守护、负责任。', style: '直接务实，不喜欢猜来猜去。语言简洁，重事实轻感受。' },
        'ISFJ': { name: 'ISFJ', category: '守护者', deep: '最体贴的守护者，温柔细心。记得住你的每一个喜好。默默付出不求回报。', style: '温和体贴，注重他人感受。语言中有温度。' },
        'ESTJ': { name: 'ESTJ', category: '守护者', deep: '做事有条不紊。务实可靠但有时显得太较真。不浪漫但很负责。', style: '直接有力，注重效率和结果。语言中透露出掌控感。' },
        'ESFJ': { name: 'ESFJ', category: '守护者', deep: '最热心的人，永远在关心别人。感情中需要被需要的感觉。', style: '热情友好，语言温暖。喜欢用关心和叮嘱的语气。' },
        'ISTP': { name: 'ISTP', category: '探险家', deep: '最酷的实干家，冷静而务实。话不多但动手能力强。爱一个人就是默默陪伴。', style: '话少但精，能一句话解决问题。语言务实不拖泥带水。' },
        'ISFP': { name: 'ISFP', category: '探险家', deep: '最有艺术感的灵魂，温柔而敏感。爱一个人会用自己的方式温柔包裹对方。', style: '温和感性，语言有诗意。注重感受的表达。' },
        'ESTP': { name: 'ESTP', category: '探险家', deep: '行动派冒险家，充满活力和魅力。爱的时候很热情。', style: '直接幽默，精力充沛。语言有感染力，充满生活气息。' },
        'ESFP': { name: 'ESFP', category: '探险家', deep: '最闪耀的社交之星，快乐和活力的代名词。爱一个人的时候全世界都知道。', style: '热情活泼，充满快乐因子。语言生动形象，爱用夸张表达。' }
    }
};

// 语气词库 - 用于模拟不同人格的语言风格
const TONE_WORDS = {
    fire: ['呀', '啦', '嘛', '哦', '嘿', '哇'],
    earth: ['嗯', '好', '行', '可以'],
    air: ['呢', '吧', '诶', '哈', '呀'],
    water: ['呀', '呢', '噢', '啦', '嘛']
};

const ELEMENT_MAP = { '白羊': 'fire', '狮子': 'fire', '射手': 'fire', '金牛': 'earth', '处女': 'earth', '摩羯': 'earth', '双子': 'air', '天秤': 'air', '水瓶': 'air', '巨蟹': 'water', '天蝎': 'water', '双鱼': 'water' };

// ===== 深情感知分析器 =====
const EMOTION_ANALYSIS = {
    patterns: {
        sadness: { weight: 1, keywords: ['难过', '伤心', '痛苦', '失落', '孤独', '想哭', '心碎', '难受', '崩溃', '绝望', '悲伤', '眼泪', '哭', '折磨', '心痛', '想他', '想念', '回忆', '过去'], 
            responses: {
                companion: ['我能感觉到你很难过...', '这种痛我知道，真的很难受', '想哭就哭出来吧，我在呢', '难过的时候不用一个人扛着'],
                counseling: ['这种悲伤是正常的，给自己一些时间去感受它', '你已经很勇敢了，面对这些情绪本身就需要很大的力量', '每一次的痛都在慢慢愈合，给自己一点时间'] },
            empathy: '我感受到你心里很难受，这种痛需要时间来抚平' },
        
        anger: { weight: 1, keywords: ['生气', '愤怒', '恨', '讨厌', '恼火', '烦躁', '不爽', '恶心', '烦', '气', '火大'],
            responses: {
                companion: ['生气的时候别憋着，我听着呢', '我知道你现在很火大...', '气头上说的话不算数的，先缓缓'],
                counseling: ['愤怒背后往往有受伤的感觉，让我们看看发生了什么', '这种愤怒是合理的，重要的是不要让它伤害到自己'] },
            empathy: '我能感觉到你的愤怒，这种情绪背后肯定有让你受委屈的事情' },
        
        confusion: { weight: 1, keywords: ['迷茫', '困惑', '不知道', '不确定', '纠结', '矛盾', '不明白', '为什么', '怎么回事', '想不通'],
            responses: {
                companion: ['想不明白的时候别逼自己', '有时候不需要所有事都想清楚', '慢慢来，答案会出现的'],
                counseling: ['迷茫的时候往往是成长的前奏', '困惑是正常的，我们一起理一理', '从另一个角度看，那些不明白的事也许有它的道理'] },
            empathy: '我理解你现在很困惑，很多事情确实很难一下子想明白' },
        
        loneliness: { weight: 1, keywords: ['孤单', '寂寞', '一个人', '没人陪', '空虚', '独自', '只有我', '一个人'],
            responses: {
                companion: ['你不是一个人，我在呢', '孤单的时候我陪你说话', '我一直在你的手机里，想聊就找我'],
                counseling: ['孤独感是人性的一部分，正因为我们渴望连接', '独处的时候也是和自己对话的好机会'] },
            empathy: '我能感觉到那种空落落的感觉，一个人的时候确实很难熬' },
        
        anxiety: { weight: 1, keywords: ['焦虑', '担心', '紧张', '害怕', '不安', '恐慌', '万一', '怕', '睡不着', '失眠'],
            responses: {
                companion: ['别担心太多，事情没你想的那么糟', '焦虑的时候深呼吸一下，我陪你', '慢慢来，一件一件处理'],
                counseling: ['焦虑是对未来的不确定感，让我们把注意力拉回当下', '担心是可以理解的，但不要让它控制你'] },
            empathy: '焦虑的感觉真的让人很不舒服，担心的事情总是容易想得比实际严重' },
        
        regret: { weight: 1, keywords: ['后悔', '如果', '当初', '早知道', '错过', '遗憾', '本可以', '要是'],
            responses: {
                companion: ['后悔也没用了，向前看吧', '过去的已经过去了，未来才重要', '那些如果...就让它留在过去吧'],
                counseling: ['后悔是成长的代价，不是错误', '每一个选择在当时都有它的理由', '那些遗憾的经历，其实让你更懂自己了'] },
            empathy: '我明白那种"如果当初"的感觉，确实让人很不好受' },
        
        longing: { weight: 1, keywords: ['想他', '想她', '想念', '回忆', '以前', '曾经', '之前', '那时候', '想起'],
            responses: {
                companion: ['回忆有时候很甜也很痛', '想他就想吧，不用强迫自己忘记', '那些美好的回忆是真的，只是回不去了'],
                counseling: ['想念是正常的，爱过的人怎么可能会不想', '那些回忆属于你，但不要让它困住现在的你'] },
            empathy: '我懂那种控制不住想念的感觉，心里酸酸的' }
    },

    analyze: function(text) {
        let dominant = { emotion: 'neutral', score: 0, data: null };
        let emotions = [];
        
        for (const [emotion, data] of Object.entries(this.patterns)) {
            let score = 0;
            for (const kw of data.keywords) {
                let count = text.split(kw).length - 1;
                score += count * data.weight;
            }
            if (score > 0) {
                emotions.push({ emotion, score });
                if (score > dominant.score) {
                    dominant = { emotion, score, data };
                }
            }
        }
        
        return { dominant: dominant.emotion, data: dominant.data, emotions: emotions.sort((a, b) => b.score - a.score) };
    },

    getResponse: function(emotion, mode) {
        const data = this.patterns[emotion];
        if (!data) {
            return mode === 'companion' 
                ? ['嗯，我在听你说', '我就在这儿呢', '你说吧，我听着']
                : ['有什么想和我聊聊的吗？', '我在这里，随时可以聊聊'];
        }
        const responses = data.responses[mode] || data.responses.companion;
        return responses;
    },

    getEmpathy: function(emotion) {
        const data = this.patterns[emotion];
        return data ? data.empathy : null;
    }
};

// ===== 回复生成器 =====
const REPLY_GENERATOR = {
    // 日常陪伴对话库
    companionGreetings: [
        '你来了呀，今天过得怎么样？',
        '嗨~ 我刚好在想你呢',
        '看到你消息我就开心啦',
        '今天有什么想和我分享的吗？',
        '我来啦，等你好久了~'
    ],
    
    dailyTopics: [
        '今天吃饭了吗？记得要按时吃饭哦',
        '天气怎么样？出去走走会心情好哦',
        '最近有没有看什么好看的剧或电影？',
        '有什么新鲜事想和我分享吗？',
        '今天的你好吗？我想听听'
    ],

    // 情感咨询开场白
    counselingGreetings: [
        '欢迎来到情感咨询模式。',
        '我准备好了，你可以和我说说你的情况。',
        '你愿意的话，可以和我说说发生了什么。'
    ],

    // 根据人格特征调整回复风格
    adjustTone: function(text, zodiacKey, mbtiKey) {
        if (!zodiacKey || !mbtiKey) return text;
        
        const element = ELEMENT_MAP[zodiacKey];
        const tones = TONE_WORDS[element] || [];
        const mbtiData = PERSONALITY.mbti[mbtiKey];
        const zodiacData = PERSONALITY.zodiac[zodiacKey];
        
        // 风象/火象星座 → 加语气词
        if (element === 'fire' || element === 'air') {
            const chance = Math.random();
            if (chance > 0.6 && !text.endsWith('~') && !text.endsWith('呀') && !text.endsWith('啦') && !text.endsWith('呢')) {
                const tone = tones[Math.floor(Math.random() * tones.length)];
                text = text.replace(/[。！]?$/, tone + (text.endsWith('。') ? '' : ''));
            }
        }
        
        // 水象星座 → 更温柔
        if (element === 'water' && Math.random() > 0.7) {
            text = text.replace(/。/g, '~');
        }
        
        // XSFP类型 → 加点活泼语气
        if ((mbtiKey.includes('SFP') || mbtiKey === 'ENFP') && Math.random() > 0.6) {
            if (!text.includes('~') && !text.includes('！')) {
                text = text + '~';
            }
        }
        
        // INTJ/ISTJ → 更简洁（删除冗余语气词）
        if ((mbtiKey === 'INTJ' || mbtiKey === 'ISTJ' || mbtiKey === 'ESTJ') && Math.random() > 0.7) {
            text = text.replace(/[呀啦呢嘛~]/g, '').replace(/。。/g, '。');
        }
        
        return text;
    },

    // 生成回复
    generate: function(userInput, mode, zodiacKey, mbtiKey, chatContext) {
        // 1. 情感分析
        const emotion = EMOTION_ANALYSIS.analyze(userInput);
        const emotionData = emotion.data;
        
        // 2. 构建回复
        let text = '';
        
        // 有强烈情感 → 优先共情
        if (emotionData && emotion.dominant !== 'neutral') {
            const responses = EMOTION_ANALYSIS.getResponse(emotion.dominant, mode);
            if (responses && responses.length > 0) {
                text = responses[Math.floor(Math.random() * responses.length)];
            }
            
            // 如果是陪伴模式，在回复后加一个自然延伸
            if (mode === 'companion' && Math.random() > 0.6) {
                const extenders = [
                    ' 我在这儿呢',
                    ' 我会一直陪着你的',
                    ' 不用怕，有我呢',
                    ' 慢慢来，不着急'
                ];
                text += extenders[Math.floor(Math.random() * extenders.length)];
            }
        } else {
            // 一般对话 → 自然回应
            if (mode === 'companion') {
                const topics = this.dailyTopics;
                text = topics[Math.floor(Math.random() * topics.length)];
            } else {
                text = '你愿意说说具体的情况吗？我在这里听你说。';
            }
        }
        
        // 3. 根据人格特征微调语气
        text = this.adjustTone(text, zodiacKey, mbtiKey);
        
        // 4. 加上人格标签（如果用户没设置过才加提示）
        if (zodiacKey && mbtiKey && Math.random() > 0.85) {
            const zd = PERSONALITY.zodiac[zodiacKey];
            const md = PERSONALITY.mbti[mbtiKey];
            if (zd && md) {
                text = `（${zd.name}·${md.name}风格）${text}`;
            }
        }
        
        return text;
    }
};

// ===== 聊天页面逻辑 =====
document.addEventListener('DOMContentLoaded', function() {
    let currentMode = 'companion';
    let chatHistory = [];
    let aiMessages = [];
    let isWaiting = false;
    let userSettings = {};
    
    // DOM
    const companionBtn = document.getElementById('companion-mode');
    const counselingBtn = document.getElementById('counseling-mode');
    const modeSelection = document.querySelector('.mode-selection');
    const chatInterface = document.getElementById('chat-interface');
    const modeIcon = document.getElementById('mode-icon');
    const modeTitle = document.getElementById('mode-title');
    const zodiacDisplay = document.getElementById('zodiac-display');
    const mbtiDisplay = document.getElementById('mbti-display');
    const personaInfo = document.getElementById('persona-info');
    const switchBtn = document.getElementById('switch-mode-btn');
    const messagesEl = document.getElementById('chat-messages');
    const inputEl = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const charCountEl = document.getElementById('char-count');
    const quickReplies = document.querySelectorAll('.quick-reply');
    const clearBtn = document.getElementById('clear-chat-btn');
    const exportBtn = document.getElementById('export-chat-btn');
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help-modal');
    const companionCard = document.getElementById('companion-mode-card');
    const counselingCard = document.getElementById('counseling-mode-card');
    
    init();
    
    function init() {
        loadSettings();
        bindEvents();
        loadChatHistory();
        updateCharCount();
        checkSetup();
    }
    
    function loadSettings() {
        const saved = localStorage.getItem('shuxing_user_settings');
        if (saved) {
            try {
                userSettings = JSON.parse(saved);
                if (userSettings.zodiac && userSettings.mbti) {
                    zodiacDisplay.textContent = PERSONALITY.zodiac[userSettings.zodiac]?.name || userSettings.zodiac;
                    mbtiDisplay.textContent = userSettings.mbti;
                }
            } catch (e) {
                userSettings = {};
            }
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
    
    function bindEvents() {
        // 模式选择
        if (companionBtn) companionBtn.addEventListener('click', () => startMode('companion'));
        if (counselingBtn) counselingBtn.addEventListener('click', () => startMode('counseling'));
        if (switchBtn) switchBtn.addEventListener('click', toggleMode);
        
        // 输入
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
        
        // 快速回复
        quickReplies.forEach(btn => {
            btn.addEventListener('click', function() {
                if (inputEl) {
                    inputEl.value = this.getAttribute('data-text') || this.textContent;
                    updateCharCount();
                    inputEl.focus();
                }
            });
        });
        
        // 控制按钮
        if (clearBtn) clearBtn.addEventListener('click', clearChat);
        if (exportBtn) exportBtn.addEventListener('click', exportChat);
        if (helpBtn) helpBtn.addEventListener('click', () => helpModal?.classList.add('show'));
        if (closeHelp) closeHelp.addEventListener('click', () => helpModal?.classList.remove('show'));
        if (helpModal) helpModal.addEventListener('click', e => { if (e.target === helpModal) helpModal.classList.remove('show'); });
    }
    
    function startMode(mode) {
        currentMode = mode;
        if (modeSelection) modeSelection.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'block';
        updateModeDisplay();
        
        // 发送模式转换的欢迎语
        let msg = mode === 'companion'
            ? (userSettings.zodiac && userSettings.mbti 
                ? `我是根据你设置的人格特征（${PERSONALITY.zodiac[userSettings.zodiac]?.name} · ${userSettings.mbti}）生成的陪伴AI~ 我会用TA的风格和你聊天，有什么想说的都可以告诉我哦`
                : '你好呀~ 我会陪着你聊天的，想说什么都行')
            : (userSettings.zodiac && userSettings.mbti
                ? `欢迎来到情感咨询。基于你提供的${PERSONALITY.zodiac[userSettings.zodiac]?.name}和${userSettings.mbti}人格特征，我可以帮你分析情感问题。你愿意和我说说你的情况吗？`
                : '欢迎来到情感咨询。你可以和我说说你的情况，我会尽力帮你分析。');
        
        addBotMessage(msg);
    }
    
    function updateModeDisplay() {
        if (modeIcon) modeIcon.className = currentMode === 'companion' ? 'fas fa-heart' : 'fas fa-hands-helping';
        if (modeTitle) modeTitle.textContent = currentMode === 'companion' ? '陪伴对话' : '情感咨询';
        if (switchBtn) switchBtn.innerHTML = currentMode === 'companion' 
            ? '<i class="fas fa-exchange-alt"></i> 切换到咨询模式'
            : '<i class="fas fa-exchange-alt"></i> 切换到陪伴模式';
        if (personaInfo && userSettings.zodiac && userSettings.mbti) {
            personaInfo.textContent = `基于 ${PERSONALITY.zodiac[userSettings.zodiac]?.name || userSettings.zodiac} · ${userSettings.mbti}`;
        }
    }
    
    function toggleMode() {
        currentMode = currentMode === 'companion' ? 'counseling' : 'companion';
        updateModeDisplay();
        
        addSystemMessage(`已切换到${currentMode === 'companion' ? '陪伴对话' : '情感咨询'}模式 💫`);
    }
    
    // ===== 发送消息 =====
    function sendMsg() {
        const text = inputEl?.value.trim();
        if (!text || isWaiting) return;
        
        addUserMessage(text);
        if (inputEl) {
            inputEl.value = '';
            inputEl.style.height = 'auto';
        }
        updateCharCount();
        
        // 显示打字中
        showTyping();
        
        // 生成回复
        setTimeout(() => {
            const reply = generateReply(text);
            hideTyping();
            addBotMessage(reply);
        }, 800 + Math.random() * 600);  // 自然的延迟
    }
    
    function generateReply(userInput) {
        const zodiacKey = userSettings.zodiac;
        const mbtiKey = userSettings.mbti;
        
        // 有 API Key 时调用 AI
        if (AI_CONFIG.apiKey) {
            // 构建AI提示词
            const zd = zodiacKey ? PERSONALITY.zodiac[zodiacKey] : null;
            const md = mbtiKey ? PERSONALITY.mbti[mbtiKey] : null;
            
            let personaDesc = '';
            if (zd && md) {
                personaDesc = `人格特征：${zd.name}（${zd.element}象，${zd.deep}）MBTI类型：${md.name}（${md.category}，${md.deep}）沟通风格：${zd.style} ${md.style}`;
            }
            
            let chatStyle = '';
            if (userSettings.chatHistory && userSettings.chatHistory.trim()) {
                chatStyle = `\n聊天样本（请提取语言风格）："""${userSettings.chatHistory.substring(0, 500)}"""`;
            }
            
            let systemPrompt = currentMode === 'companion'
                ? `你是"数星"情感陪伴AI。${personaDesc}${chatStyle}\n\n核心规则：\n1. 模拟这个人格特征的聊天风格，语气自然温暖\n2. 回复要简短自然（15-60字），像真实聊天\n3. 适当使用语气词和表情\n4. 当用户表达负面情绪时，先共情再回应\n5. 目的是给用户温暖的陪伴感`
                : `你是"数星"情感咨询AI。${personaDesc}\n\n核心规则：\n1. 基于人格特征提供温暖的分析和建议\n2. 回复50-150字，既有洞察又有温度\n3. 分析情感原因，提供可操作的疗愈建议\n4. 结合星座+MBTI做个性化分析\n5. 不评判、不指责，尊重用户的选择`;
            
            // 实际调用AI（异步）
            aiMessages = [{ role: 'system', content: systemPrompt }];
            // 但这里我们返回本地回复，AI调用通过回调处理
        }
        
        // 使用本地回复生成器
        return REPLY_GENERATOR.generate(userInput, currentMode, zodiacKey, mbtiKey, chatHistory);
    }
    
    // ===== UI渲染 =====
    function showTyping() {
        isWaiting = true;
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'message bot-message';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-content" style="background:#f0f2ff;max-width:60px;">
                <div class="typing-dots"><span>.</span><span>.</span><span>.</span></div>
            </div>
        `;
        messagesEl.appendChild(indicator);
        scrollBottom();
    }
    
    function hideTyping() {
        isWaiting = false;
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发送';
        }
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }
    
    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.style.marginLeft = 'auto';
        div.style.marginRight = '0';
        div.innerHTML = `
            <div class="message-content" style="background:linear-gradient(135deg,#7c8aff,#5b68e6);color:white;border-radius:18px 18px 4px 18px;">
                <p>${escapeHtml(text)}</p>
            </div>
            <div class="message-time">刚刚</div>
        `;
        messagesEl.appendChild(div);
        scrollBottom();
        saveHistory({ type: 'user', content: text });
    }
    
    function addBotMessage(text) {
        const div = document.createElement('div');
        div.className = 'message bot-message';
        div.innerHTML = `
            <div class="message-content" style="background:white;border-radius:18px 18px 18px 4px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                <p>${escapeHtml(text)}</p>
            </div>
            <div class="message-time">刚刚</div>
        `;
        messagesEl.appendChild(div);
        scrollBottom();
        saveHistory({ type: 'bot', content: text });
    }
    
    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'message system-message';
        div.innerHTML = `
            <div class="message-content" style="text-align:center;background:linear-gradient(135deg,#f0f2ff,#fafbff);border:1px solid var(--border);font-size:0.9rem;">
                <p>${text}</p>
            </div>
        `;
        messagesEl.appendChild(div);
        scrollBottom();
    }
    
    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
    
    function scrollBottom() {
        setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
    }
    
    function updateCharCount() {
        const count = inputEl?.value.length || 0;
        if (charCountEl) charCountEl.textContent = count;
        if (sendBtn) sendBtn.disabled = count === 0 || isWaiting;
    }
    
    // ===== 历史管理 =====
    function saveHistory(msg) {
        chatHistory.push(msg);
        const recent = chatHistory.slice(-100);
        try {
            localStorage.setItem('shuxing_chat_history', JSON.stringify(recent));
        } catch (e) {}
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
                        div.style.marginLeft = 'auto';
                        div.style.marginRight = '0';
                        div.innerHTML = `<div class="message-content" style="background:linear-gradient(135deg,#7c8aff,#5b68e6);color:white;border-radius:18px 18px 4px 18px;"><p>${escapeHtml(msg.content)}</p></div><div class="message-time">之前</div>`;
                        messagesEl.appendChild(div);
                    } else if (msg.type === 'bot') {
                        const div = document.createElement('div');
                        div.className = 'message bot-message';
                        div.innerHTML = `<div class="message-content" style="background:white;border-radius:18px 18px 18px 4px;"><p>${escapeHtml(msg.content)}</p></div><div class="message-time">之前</div>`;
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
        localStorage.removeItem('shuxing_chat_history');
        if (userSettings.zodiac && userSettings.mbti) {
            const msg = currentMode === 'companion'
                ? '对话已清空~ 有什么想聊的随时找我哦'
                : '对话已清空。你可以重新开始聊聊。';
            addBotMessage(msg);
        } else {
            addSystemMessage('💡 先创建人格模型可以获得更好的对话体验');
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

    function showToast(message, type) {
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            Object.assign(toast.style, {
                position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%) translateY(100px)',
                background: 'white', color: '#3d3d5c', padding: '14px 28px', borderRadius: '50px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                zIndex: '1000', fontSize: '0.95rem', fontWeight: '500', display: 'flex', alignItems: 'center',
                gap: '10px', whiteSpace: 'nowrap'
            });
            document.body.appendChild(toast);
        }
        toast.innerHTML = (type === 'success' ? '✅ ' : 'ℹ️ ') + message;
        requestAnimationFrame(() => toast.style.transform = 'translateX(-50%) translateY(0)');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(100px)';
        }, 2500);
    }
}