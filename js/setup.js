/**
 * 数星 - 人格设置脚本 V2（优化版）
 * 完善的人格特征库 + 深层洞察生成
 */

// ===== 人格特征数据（增强版） =====
const PERSONALITY = {
    zodiac: {
        '白羊': { name: '白羊座', symbol: '♈', element: '火', 
            trait: '热情直接，行动力强，喜欢挑战',
            deep: '白羊座的人像一团火，直来直去不拐弯。开心就大笑，生气就爆发，情绪来得快去得也快。吵架不过夜，但脱口而出的话可能伤到人。',
            love: '喜欢主动追求，热情直接但不持久。需要对方同样热烈的回应。被冷落时容易炸毛。',
            hurt: '被无视和冷暴力是最痛的。宁愿大吵一架也不要被冷落。',
            style: '说话爽快，不喜欢模棱两可。字里行间充满行动力，常用感叹号。' },
        '金牛': { name: '金牛座', symbol: '♉', element: '土',
            trait: '稳重固执，注重实际，享受生活',
            deep: '金牛座的人像一座山，稳而慢。不会轻易动心，但一旦认定了就很长情。嘴笨，不太会说甜言蜜语，但会用行动证明。',
            love: '慢热但长情。喜欢用行动表达爱：帮你点外卖、记得你的喜好。不轻易说分手，但一旦决定就很决绝。',
            hurt: '被背叛和欺骗是最痛的。物质安全感被打破也会很难受。',
            style: '说话务实，很少夸张。语气平稳，喜欢用"嗯"、"好"、"行"这类简短回应。' },
        '双子': { name: '双子座', symbol: '♊', element: '风',
            trait: '多变好奇，善于沟通，思维敏捷',
            deep: '双子座像一阵风，活泼多变。有趣的灵魂和一张能说会道的嘴。话题天马行空，上一秒在聊电影下一秒就能聊人生。但也容易让人觉得飘忽不定。',
            love: '喜欢新鲜感和有趣的对话。受不了沉闷的关系。需要对方能跟上自己的思维节奏。',
            hurt: '被束缚和无聊的关系是最难受的。需要自由呼吸的空间。',
            style: '语言风趣幽默，话题跳跃。喜欢用表情包和语气词，表达方式丰富多变。' },
        '巨蟹': { name: '巨蟹座', symbol: '♋', element: '水',
            trait: '敏感体贴，家庭为重，情感丰富',
            deep: '巨蟹座像一片温柔的湖水，表面平静但内心波澜起伏。非常念旧，放不下过去。没有安全感，需要很多很多的爱和确认。',
            love: '爱一个人就全身心投入，会记得所有细节。但敏感多疑，一点冷落就会胡思乱想。需要对方给足安全感。',
            hurt: '被伤害后会缩进壳里，很久都不出来。过去的回忆是最锋利的刀。',
            style: '语气温柔细腻，喜欢回忆和分享感受。文字里常带着温度和共情。' },
        '狮子': { name: '狮子座', symbol: '♌', element: '火',
            trait: '自信领导，喜欢关注，慷慨大方',
            deep: '狮子座像一轮太阳，耀眼而热烈。自尊心强，要面子，但在喜欢的人面前会变成大猫。爱一个人就想给对方最好的。',
            love: '享受被崇拜和关注的感觉。恋爱中大方真诚，但占有欲也强。需要对方欣赏和肯定自己。',
            hurt: '被忽视和不被尊重是最伤的。面子被踩了比什么都难受。',
            style: '语气自信有力，习惯用肯定句。表达直接不掩饰，喜欢用"我"字开头。' },
        '处女': { name: '处女座', symbol: '♍', element: '土',
            trait: '细致完美，注重细节，服务他人',
            deep: '处女座像一台精密的仪器，追求完美和秩序。嘴上挑剔但其实心里什么都为对方想好了。不会说好听的，但会默默做很多。',
            love: '爱一个人就体现在细节里：提醒你吃饭、帮你整理、记你的习惯。越在乎越挑剔，但挑剔是因为想更好。',
            hurt: '被嫌弃和否定努力是最难受的。付出不被看见会很失落。',
            style: '说话有条理，注重细节。习惯指出问题但本意是关心，语气偏理性。' },
        '天秤': { name: '天秤座', symbol: '♎', element: '风',
            trait: '平衡和谐，追求美感，善于交际',
            deep: '天秤座像一个优雅的舞者，追求平衡和美感。社交达人，但内心其实很怕孤独。选择困难，因为不想让任何人失望。',
            love: '喜欢浪漫和仪式感。在感情里容易妥协和讨好，害怕冲突。需要被坚定地选择和偏爱。',
            hurt: '被冷落和纠结的氛围最难受。长时间的冷战是酷刑。',
            style: '语气温和得体，很少说重话。措辞优雅，喜欢用"我觉得"、"也许"等缓和语气。' },
        '天蝎': { name: '天蝎座', symbol: '♏', element: '水',
            trait: '深沉神秘，情感强烈，直觉敏锐',
            deep: '天蝎座像一汪深不见底的潭水，表面平静，水下暗流汹涌。爱就爱得彻底，恨也恨得彻底。直觉准得可怕，一眼就能看穿人。',
            love: '要么不爱，要么爱到极致。占有欲和掌控欲很强。需要对方完全忠诚和透明。爱得深但也伤得深。',
            hurt: '背叛是致命伤。一旦信任崩塌，很难重建。',
            style: '说话一针见血，很少废话。语气中带着洞察和力量，习惯用肯定句。' },
        '射手': { name: '射手座', symbol: '♐', element: '火',
            trait: '自由乐观，热爱冒险，思想开放',
            deep: '射手座像一匹野马，自由奔放。乐观开朗，但乐观过头有时显得没心没肺。热爱自由，讨厌被约束。',
            love: '喜欢一起疯一起玩的人。恋爱中也需要个人空间。受不了粘人和束缚，但真心喜欢时也会很专一。',
            hurt: '被限制自由和过度束缚是最压抑的。沉闷的关系会让他们想逃跑。',
            style: '语气开朗直接，喜欢用幽默化解尴尬。话题广泛，语言活泼。' },
        '摩羯': { name: '摩羯座', symbol: '♑', element: '土',
            trait: '务实责任，目标明确，耐心坚持',
            deep: '摩羯座像一座沉默的山峰，隐忍而坚定。不善于表达情感，但会用行动和结果说话。目标感强，认真做事的时候最有魅力。',
            love: '务实恋爱观，看重对方的上进心和责任感。不擅长浪漫但会给实际的承诺。嘴笨但心很实。',
            hurt: '被否定努力和看不到未来是最焦虑的。情绪被忽视也会难受但不表现出来。',
            style: '说话简洁务实，直奔主题。很少用修饰词，但每个字都有分量。' },
        '水瓶': { name: '水瓶座', symbol: '♒', element: '风',
            trait: '独立创新，思想独特，人道主义',
            deep: '水瓶座像一个外星来客，思维独特不走寻常路。理性至上，感情中也需要精神共鸣。灵魂有趣但有时候过于抽离。',
            love: '需要精神层面的共鸣和理解。不喜欢太粘人，但也需要被懂。爱一个人时会表现得与众不同。',
            hurt: '被误解和不被理解是最孤独的。控制欲太强的关系会窒息。',
            style: '思维跳跃，喜欢讨论抽象话题。用词独特，偶尔显得疏离但很有趣。' },
        '双鱼': { name: '双鱼座', symbol: '♓', element: '水',
            trait: '浪漫感性，富有同情，想象力丰富',
            deep: '双鱼座像一片温柔的海洋，浪漫而多情。情感细腻，共情能力极强，能感受到别人的情绪。但有时候太沉溺于自己的世界。',
            love: '浪漫至上，追求偶像剧般的恋爱。容易上头也容易受伤。需要对方温柔包容，能接住自己的情绪。',
            hurt: '现实太残酷，幻灭感让人崩溃。付出真心却被辜负是最痛的。',
            style: '语气温柔感性，爱用比喻和诗意表达。文字里带着温度和浪漫。' }
    },

    mbti: {
        'INTJ': { name: 'INTJ', category: '分析师', 
            trait: '战略思考，独立自主，追求效率',
            deep: 'INTJ是天然的策划者，脑子里永远在规划B计划。理性优先，感情排在后面。不太会哄人，但出了问题会第一个帮你找到解决方案。',
            love: '不擅长甜言蜜语但会用行动表达。需要的是灵魂伴侣而不是依赖者。欣赏独立思考的伴侣。',
            style: '逻辑清晰，直奔重点。语言简洁有力，不喜欢无意义的寒暄。' },
        'INTP': { name: 'INTP', category: '分析师',
            trait: '逻辑分析，好奇心强，理论思维',
            deep: 'INTP是行走的知识库，对世界充满好奇。看起来呆萌但脑子里在跑无数条逻辑链。情感表达笨拙但真诚。',
            love: '喜欢能一起讨论有趣话题的人。需要对方理解自己对知识的痴迷。不擅长浪漫但很真诚。',
            style: '喜欢深入讨论，思维跳跃。习惯用"从理论上来说"、"逻辑上"这类开场白。' },
        'ENTJ': { name: 'ENTJ', category: '分析师',
            trait: '领导决策，目标导向，组织能力强',
            deep: 'ENTJ是天生的领袖，目标感和执行力一流。果断直接，但也强势。感情中习惯主导，但也会把对方纳入自己的人生规划。',
            love: '看重对方的独立能力和上进心。喜欢有主见但不对抗的伴侣。目标感强，恋爱也要有计划。',
            style: '语言有力，习惯下结论。说话有压迫感，但效率很高。' },
        'ENTP': { name: 'ENTP', category: '分析师',
            trait: '创新辩论，头脑灵活，喜欢挑战',
            deep: 'ENTP是大家的开心果和杠精担当。思维敏捷点子多，喜欢辩论但纯粹是为了好玩。情感上有点孩子气。',
            love: '需要能接住自己脑洞的伴侣。喜欢有智慧的互动游戏。受不了无聊和单一。',
            style: '机智幽默，爱开玩笑和推理论证。聊天风格跳跃，话题转换快。' },
        'INFJ': { name: 'INFJ', category: '外交家',
            trait: '理想洞察，富有同情，追求意义',
            deep: 'INFJ是最有洞察力的理想主义者。能一眼看穿人的本质，但不会揭穿。内心世界丰富但外表平静。感情纯粹而深刻。',
            love: '追求灵魂共鸣和精神契合。对关系的要求很高，不愿将就。一旦认定就非常忠诚。',
            style: '温和但一针见血。善于倾听，给出的回应总是击中要害。' },
        'INFP': { name: 'INFP', category: '外交家',
            trait: '理想价值，敏感细腻，忠于信念',
            deep: 'INFP是最浪漫的理想主义者。内心住着一个小诗人，感性而温柔。非常重视真实和真诚，无法忍受虚伪。感情中全身心投入。',
            love: '追求纯粹的爱，眼里容不下沙子。爱一个人的时候会把对方写进自己的故事里。',
            style: '温柔诗意，喜欢用感性的语言表达。文字细腻有温度，常带着情感色彩。' },
        'ENFJ': { name: 'ENFJ', category: '外交家',
            trait: '激励引导，善于交际，关心他人',
            deep: 'ENFJ是温暖的太阳，天然地想帮助和支持身边的人。善解人意，能察觉别人的情绪变化。但有时候忽略了自己的需要。',
            love: '喜欢照顾对方，但也被需要被理解和珍惜。会倾注全部热情去爱，但需要有回应。',
            style: '热情鼓舞，充满正能量。语言温暖有力量，善于鼓励和引导。' },
        'ENFP': { name: 'ENFP', category: '外交家',
            trait: '热情创意，充满灵感，乐观积极',
            deep: 'ENFP是快乐的传播者，热情洋溢感染力十足。想法天马行空，喜欢探索各种可能性。情感丰富而真诚。',
            love: '喜欢新鲜有趣的恋爱体验。需要对方能理解自己的热情和创造力。用全部的真心去爱人。',
            style: '热情洋溢，充满想象力和感染力。语言生动活泼，爱用感叹号和表情。' },
        'ISTJ': { name: 'ISTJ', category: '守护者',
            trait: '责任传统，务实可靠，注重细节',
            deep: 'ISTJ是最可靠的存在，说到做到。务实稳重，但不太会表达情感。爱一个人就是默默守护、负责任。',
            love: '行动派，做得比说得多。看重责任和承诺。不浪漫但很安心。',
            style: '直接务实，不喜欢猜来猜去。语言简洁，重事实轻感受。' },
        'ISFJ': { name: 'ISFJ', category: '守护者',
            trait: '支持关怀，细致负责，保护他人',
            deep: 'ISFJ是最体贴的守护者，温柔细心。记得住你的每一个喜好和习惯。默默付出不求回报，但内心也需要被疼爱。',
            love: '用细节和行动表达爱，是最好的照顾者。需要对方看到自己的付出并给予回应。',
            style: '温和体贴，注重他人感受。语言中有温度，文字细腻。' },
        'ESTJ': { name: 'ESTJ', category: '守护者',
            trait: '组织管理，高效务实，遵守规则',
            deep: 'ESTJ是天然的管家，做事有条不紊。务实可靠但有时显得太较真。感情中注重实际，会规划好一切。',
            love: '看重对方的可靠和踏实。喜欢有秩序和计划的关系。不浪漫但很负责。',
            style: '直接有力，注重效率和结果。语言中透露出掌控感。' },
        'ESFJ': { name: 'ESFJ', category: '守护者',
            trait: '社交和谐，乐于助人，注重传统',
            deep: 'ESFJ是最热心的人，永远在关心别人。社交能力强，很会照顾气氛。感情中需要被需要的感觉。',
            love: '喜欢传统浪漫，注重节日和仪式。善于创造温馨的关系氛围。需要对方的认可和欣赏。',
            style: '热情友好，语言温暖。喜欢用关心和叮嘱的语气。' },
        'ISTP': { name: 'ISTP', category: '探险家',
            trait: '实用解决，冷静分析，动手能力强',
            deep: 'ISTP是最酷的实干家，冷静而务实。话不多但动手能力强。情感上有点酷，不是不关心而是不擅长表达。',
            love: '需要独立空间，不喜欢太粘人。爱一个人的方式是陪在身边默默做事。',
            style: '话少但精，能一句话解决问题。语言务实，不拖泥带水。' },
        'ISFP': { name: 'ISFP', category: '探险家',
            trait: '审美体验，温和敏感，享受当下',
            deep: 'ISFP是最有艺术感的灵魂，温柔而敏感。用审美和体验感受世界。不善于争辩但内心丰富。感情中既温柔又坚定。',
            love: '需要细腻的相处和审美共鸣。不喜欢太强烈直接的追求。爱一个人会用自己的方式温柔包裹对方。',
            style: '温和感性，语言有诗意。注重感受的表达，文字令人舒适。' },
        'ESTP': { name: 'ESTP', category: '探险家',
            trait: '行动适应，精力充沛，现实导向',
            deep: 'ESTP是行动派冒险家，充满活力和魅力。活在当下，享受每一刻。社交能手，但感情中需要新鲜感。',
            love: '喜欢一起做有趣的事。受不了沉闷和被管束。爱的时候很热情但不长久。',
            style: '直接幽默，精力充沛。语言有感染力，充满生活气息。' },
        'ESFP': { name: 'ESFP', category: '探险家',
            trait: '活力社交，热情开朗，享受生活',
            deep: 'ESFP是最闪耀的社交之星，快乐和活力的代名词。享受成为焦点的感觉。感情中热情奔放，需要被关注和宠爱。',
            love: '喜欢浪漫和惊喜，需要对方能陪自己玩。爱一个人的时候全世界都知道。害怕被冷落。',
            style: '热情活泼，充满快乐因子。语言生动形象，爱用夸张的表达。' }
    },

    // 星座+MBTI组合洞察
    combinationInsight: function(zodiacKey, mbtiKey) {
        const z = this.zodiac[zodiacKey];
        const m = this.mbti[mbtiKey];
        if (!z || !m) return '人格特征已保存。';

        // 元素 + 类别组合分析
        const element = z.element;
        const category = m.category;
        
        const combinations = {
            '火-分析师': '理性与热情的结合。做事有明确目标，但同时充满激情和行动力。在感情中既理性又直接，不太会绕弯子。',
            '火-外交家': '热情的理想主义者。用全部热情去爱人，对关系有很高的期待。容易受伤但也容易重新燃起希望。',
            '火-守护者': '可靠的热心肠。既有行动力又有责任感，是那种"说了就做，做了就负责到底"的类型。',
            '火-探险家': '自由的行动派。充满活力喜欢新鲜事物，不喜欢被束缚。活在当下，享受每一个精彩瞬间。',
            '土-分析师': '冷静的战略家。务实理性，做事有规划。感情中不轻易动心但一旦认真就很长情。',
            '土-外交家': '温柔的理想主义者。表面上务实，内心却有丰富的情感世界。对爱有很高的要求但不轻易表露。',
            '土-守护者': '最靠谱的存在。稳重可靠，说到做到。感情中用行动证明一切，不需要甜言蜜语。',
            '土-探险家': '低调的享受者。务实但懂得享受生活。感情中不张扬但很用心。',
            '风-分析师': '头脑风暴型。思维敏捷，喜欢深入讨论。有趣的灵魂加上理性的分析能力。',
            '风-外交家': '有魅力的沟通者。善于表达情感，也善于理解他人。感情中需要精神层面的深度交流。',
            '风-守护者': '靠谱的社交家。既有社交能力又有责任感。在感情中既会照顾人又靠谱。',
            '风-探险家': '有趣的冒险家。活泼多变喜欢新鲜事物。感情中有趣但可能不稳定。',
            '水-分析师': '深沉的思考者。表面冷静，内心情感丰富。感情中需要深度连接和心灵共鸣。',
            '水-外交家': '最有同理心的类型。情感细腻，善于理解和共情。在感情中全心投入但也容易受伤。',
            '水-守护者': '最温暖的守护者。温柔体贴又可靠，会用自己的方式默默保护和照顾对方。',
            '水-探险家': '感性的体验者。用感受和直觉去体验世界和爱情。感情中的温度恰到好处。'
        };

        const combo = combinations[`${element}-${category}`] || '这个人格组合有独特的魅力。';
        
        return `作为${z.name}（${element}象）${m.name}（${m.category}），${combo}\n\n💬 TA的沟通风格：${z.style} ${m.style}\n\n💝 在感情中：${z.love || z.deep}`;
    }
};

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
        const insight = PERSONALITY.combinationInsight(userSelections.zodiac, userSelections.mbti);
        insightEl.textContent = insight;
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
