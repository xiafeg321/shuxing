/**
 * 数星 - 星析结构化分析引擎 V1
 *
 * 按文档第三章设计：
 * 3.2 信息收集 → 3.3 分析模型 → 3.4 行动建议
 *
 * 分析模型：
 *   - 关系时间线还原（相识→热恋→平淡→裂痕→分手）
 *   - 性格匹配度分析（星座+MBTI + 心理学框架）
 *   - 分手原因多维度归因（表层/性格/需求/时机）
 *   - 复合可能性评估（高/中/低 + 关键因素）
 *   - 行动建议框架（止损→复盘→重建→选择）
 *
 * 心理学框架集成（3.3.2节）：
 *   - 依恋理论：安全型/焦虑型/回避型
 *   - 爱情三角理论：亲密+激情+承诺
 *   - 爱的五种语言：肯定的言词/精心的时刻/接受礼物/服务的行动/身体的接触
 *   - 戈特曼四骑士：批评/鄙视/辩护/冷战
 *
 * 引擎本身不直接调AI，而是生成结构化分析prompt交给chat.js
 */

window.ANALYSIS_ENGINE = {

  // ===== 心理学框架数据 =====
  frameworks: {
    attachment: {
      name: '依恋理论',
      types: {
        secure: {
          name: '安全型依恋',
          traits: ['能自然表达情感', '信任对方', '不害怕亲密', '能独立也能依赖'],
          signs: ['分开时能过好自己的生活', '有矛盾时愿意沟通', '不会过度焦虑对方的态度'],
          advice: '安全型是最健康的关系模式，保持这种状态就好'
        },
        anxious: {
          name: '焦虑型依恋',
          traits: ['极度渴望亲密', '害怕被抛弃', '需要大量确认', '敏感多疑'],
          signs: ['对方不回消息就焦虑', '总是担心对方会离开', '过度迎合对方', '容易吃醋'],
          advice: '需要建立安全感，学会自我安抚，不要过度依赖对方的回应来确认自己的价值'
        },
        avoidant: {
          name: '回避型依恋',
          traits: ['害怕亲密', '需要大量个人空间', '情感表达困难', '遇到压力倾向逃避'],
          signs: ['对方越靠近越想逃', '有矛盾就冷战', '不喜欢谈感情话题', '独立到疏离'],
          advice: '需要学习表达情感，适度打开心扉，记住亲密不是束缚'
        },
        anxious_avoidant: {
          name: '焦虑-回避型（混乱型）',
          traits: ['既渴望亲密又害怕亲密', '情绪不稳定', '关系模式反复'],
          signs: ['一会很热情一会很冷淡', '推开对方后又后悔', '在关系中极度不安'],
          advice: '建议寻求专业心理咨询，这种模式通常源于早期经历'
        }
      }
    },

    loveTriangle: {
      name: '爱情三角理论',
      dimensions: {
        intimacy: { name: '亲密', desc: '情感的连接和亲近感', low: '缺乏深度交流，像室友', high: '无话不谈，精神伴侣' },
        passion: { name: '激情', desc: '浪漫和性的吸引力', low: '缺乏火花，平淡如水', high: '强烈的吸引和心动' },
        commitment: { name: '承诺', desc: '维持关系的决定', low: '随时可能离开', high: '坚定的选择彼此' }
      },
      types: [
        { name: '完美之爱', intimacy: '高', passion: '高', commitment: '高', desc: '三者兼备，最理想的关系' },
        { name: '伴侣之爱', intimacy: '高', passion: '低', commitment: '高', desc: '亲密+承诺，缺乏激情的老夫老妻' },
        { name: '浪漫之爱', intimacy: '高', passion: '高', commitment: '低', desc: '亲密+激情，热恋期或短期关系' },
        { name: '空洞之爱', intimacy: '低', passion: '低', commitment: '高', desc: '只有承诺，有名无实的关系' },
        { name: '迷恋之爱', intimacy: '低', passion: '高', commitment: '低', desc: '只有激情，像crush或一夜情' },
        { name: '喜欢之爱', intimacy: '高', passion: '低', commitment: '低', desc: '只有亲密，像好朋友' }
      ]
    },

    loveLanguages: {
      name: '爱的五种语言',
      languages: [
        {
          name: '肯定的言词',
          desc: '通过言语表达爱意：赞美、鼓励、感谢',
          signs: ['喜欢被夸', '在意对方怎么说', '被批评会很受伤'],
          actions: ['多说夸奖的话', '表达感谢', '写小纸条']
        },
        {
          name: '精心的时刻',
          desc: '高质量的共处时间，全心全意的陪伴',
          signs: ['喜欢约会', '在意对方是否专注', '受不了对方玩手机'],
          actions: ['安排二人时光', '放下手机聊天', '一起做某件事']
        },
        {
          name: '接受礼物',
          desc: '通过礼物感受爱意，不在于价格在于心意',
          signs: ['喜欢惊喜', '认真保存对方的礼物', '会为对方精挑细选'],
          actions: ['偶尔带小礼物', '记住重要日子', '手写卡片']
        },
        {
          name: '服务的行动',
          desc: '用行动表达关心：帮忙做事、分担责任',
          signs: ['喜欢被照顾', '会默默为对方做事', '在意对方是否主动帮忙'],
          actions: ['帮忙做家务', '接送上下班', '生病时的照顾']
        },
        {
          name: '身体的接触',
          desc: '通过肢体接触感受爱意：拥抱、牵手、亲密',
          signs: ['喜欢肢体接触', '拥抱能缓解情绪', '身体距离远了心也远了'],
          actions: ['经常拥抱', '走路牵手', '亲密时需要温柔']
        }
      ]
    },

    gottmanFourHorsemen: {
      name: '戈特曼四骑士（关系中破坏性沟通模式）',
      riders: [
        {
          name: '批评',
          desc: '攻击对方人格而非具体行为',
          example: '"你总是这么自私" vs "你今天忘记洗碗了"',
          antidote: '用"我"开头表达感受，不攻击人格'
        },
        {
          name: '鄙视',
          desc: '嘲讽、挖苦、冷笑，是最具破坏性的',
          example: '"你行你上啊"、"呵呵"',
          antidote: '培养感谢和欣赏的习惯'
        },
        {
          name: '辩护',
          desc: '把自己放在受害者位置，拒绝接受反馈',
          example: '"你怎么不说你自己"、"这不关我的事"',
          antidote: '先理解对方的感受，再解释'
        },
        {
          name: '冷战',
          desc: '情感抽离，拒绝沟通',
          example: '对方说话时不回应、转身就走',
          antidote: '暂停休息后回来继续沟通'
        }
      ]
    }
  },

  // ===== 关系阶段定义 =====
  relationshipStages: [
    { key: 'meet', label: '相识', icon: '👋', questions: ['怎么认识的', '第一印象', '为什么会注意到对方'] },
    { key: 'attraction', label: '热恋', icon: '💕', questions: ['最甜蜜的回忆', '她什么时候最吸引你', '在一起时最开心的事'] },
    { key: 'normal', label: '平淡期', icon: '🌊', questions: ['什么时候感觉变了', '热恋持续了多久', '变得平淡后她在做什么'] },
    { key: 'crack', label: '裂痕出现', icon: '💔', questions: ['矛盾的导火索', '吵架的频繁程度', '她当时的反应'] },
    { key: 'end', label: '分开', icon: '🕊️', questions: ['最后怎么说的', '分开时的状态', '还有没有联系'] }
  ],

  // ===== 分手原因维度 =====
  breakupDimensions: [
    { key: 'surface', label: '表层原因', desc: '用户自己认知的原因', promptPlaceholder: '她是怎么说的' },
    { key: 'personality', label: '性格原因', desc: '基于星座+MBTI的性格冲突', promptPlaceholder: '两种性格的天然矛盾' },
    { key: 'need', label: '需求原因', desc: '底层情感需求未被满足', promptPlaceholder: '她真正需要什么' },
    { key: 'timing', label: '时机原因', desc: '关系节奏错位', promptPlaceholder: '相遇的时机对不对' }
  ],

  // ===== 复合评估维度 =====
  reconciliationFactors: {
    positive: [
      { key: 'stillContact', label: '还在联系', weight: 3, check: '是否还有联系方式，主动找你' },
      { key: 'softReason', label: '非核心矛盾分开', weight: 3, check: '分手原因是外部压力或误会' },
      { key: 'recent', label: '分手不久', weight: 2, check: '分开时间不长，感情还在' },
      { key: 'userStable', label: '用户状态稳定', weight: 2, check: '心态平复了，有自我提升' },
      { key: 'herSignals', label: '她释出信号', weight: 4, check: '她有关注你的动态，点赞或试探性联系' }
    ],
    negative: [
      { key: 'blocked', label: '已拉黑删除', weight: -4, check: '所有联系方式都被切断' },
      { key: 'explicitRefusal', label: '明确拒绝', weight: -3, check: '她说得很决绝不可能了' },
      { key: 'newPartner', label: '已有新欢', weight: -5, check: '她已经有新的对象了' },
      { key: 'coreConflict', label: '核心性格不合', weight: -3, check: '三观不合或核心需求不匹配' },
      { key: 'userClingy', label: '用户还在纠缠', weight: -2, check: '还在卑微讨好或不断联系' },
      { key: 'noContact1Month', label: '超过1个月没联系', weight: -1, check: '完全没有交集了' }
    ]
  },

  // ===== 行动建议阶段 =====
  actionStages: [
    {
      key: 'stop',
      label: '止损期',
      subtitle: '分手后1-2周',
      icon: '🛑',
      actions: [
        '断联，停止纠缠——越纠缠她跑得越远',
        '情绪急救——先让自己稳下来，不做任何重大决定',
        '不要再翻她的社交动态，这不是在帮她而是折磨自己',
        '允许自己难过，但别让难过控制你'
      ]
    },
    {
      key: 'review',
      label: '复盘期',
      subtitle: '分手后2-4周',
      icon: '📝',
      actions: [
        '冷静分析这段关系出了什么问题',
        '找到自己的核心问题（不是自责，而是成长）',
        '开始做一些提升自己的事情（健身、读书、新技能）',
        '想清楚：她是真的适合你，还是你只是舍不得'
      ]
    },
    {
      key: 'rebuild',
      label: '重建期',
      subtitle: '分手后1-3个月',
      icon: '🌱',
      actions: [
        '建设自己的生活——先让自己活得精彩',
        '提升吸引力——状态好了自然有魅力',
        '如果她释放了信号，可以谨慎试探——但别太主动',
        '一定要确认她有没有新的人出现'
      ]
    },
    {
      key: 'choose',
      label: '选择期',
      subtitle: '分手后3个月+',
      icon: '🌟',
      actions: [
        '评估是否还值得继续等下去',
        '如果她没有任何信号——放下，往前走',
        '如果仍有希望——尊重她的节奏，不逼不吵',
        '不管怎么选，记住——你已经走过来了，你比以前更强了'
      ]
    }
  ],

  // ===== 核心分析方法 =====

  /**
   * 分析性格匹配度（纯规则引擎，可用AI触发补充）
   */
  analyzeMatch: function(zodiacA, mbtiA, zodiacB, mbtiB) {
    const PERSONALITY = window.PERSONALITY;
    if (!PERSONALITY) return null;

    const zdA = PERSONALITY.zodiac[zodiacA];
    const zdB = PERSONALITY.zodiac[zodiacB];
    const mdA = PERSONALITY.mbti[mbtiA];
    const mdB = PERSONALITY.mbti[mbtiB];

    if (!zdA || !zdB || !mdA || !mdB) return null;

    // 星座元素匹配
    const elementMatch = zdA.element === zdB.element ? '互补' : '差异';
    const elementAdvice = elementMatch === '互补'
      ? `都是${zdA.element}象星座，在情感表达方式上很一致`
      : `${zdA.element}象和${zdB.element}象，表达方式不同但可以互补`;

    // MBTI维度匹配
    const ae = mbtiA[0], ai = mbtiA[1], at = mbtiA[2], aj = mbtiA[3];
    const be = mbtiB[0], bi = mbtiB[1], bt = mbtiB[2], bj = mbtiB[3];

    const dimensionMatch = {
      energy: { me: ae, them: be, same: ae === be,
        desc: ae === be ? '能量来源一致' : `${ae} vs ${be}，能量补充型` },
      info: { me: ai, them: bi, same: ai === bi,
        desc: ai === bi ? '信息处理方式相似' : `${ai} vs ${bi}，一个看大局一个看细节` },
      decision: { me: at, them: bt, same: at === bt,
        desc: at === bt ? '决策方式相同' : `${at} vs ${bt}，一个理性一个感性` },
      plan: { me: aj, them: bj, same: aj === bj,
        desc: aj === bj ? '生活节奏一致' : `${aj} vs ${bj}，一个有计划一个随性` }
    };

    const sameCount = [ae === be, ai === bi, at === bt, aj === bj].filter(Boolean).length;
    const matchScore = Math.round((sameCount / 4) * 100);

    // 冲突点分析
    const conflicts = [];
    if (zdA.element !== zdB.element) conflicts.push(`情感表达方式不同：${zdA.element}象 vs ${zdB.element}象`);
    if (ae !== be) conflicts.push(`能量来源不同：${ae}需要社交互动，${be}需要独处充电`);
    if (at !== bt) conflicts.push(`决策方式不同：${at}偏理性分析，${bt}偏情感价值`);
    if (aj !== bj) conflicts.push(`生活节奏不同：${aj}喜欢有规划，${bj}喜欢随性`);

    return {
      score: matchScore,
      elementMatch,
      elementAdvice,
      dimensionMatch,
      conflicts,
      summary: this._generateMatchSummary(zdA, mdA, zdB, mdB, matchScore)
    };
  },

  _generateMatchSummary: function(zdA, mdA, zdB, mdB, score) {
    if (score >= 75) {
      return `${zdA.name}${mdA.name}和${zdB.name}${mdB.name}是挺搭的组合。性格上有` +
        `不少共鸣点，处理事情的方式也比较一致。当然差异也有，但这不影响核心相处。`;
    } else if (score >= 50) {
      return `${zdA.name}${mdA.name}和${zdB.name}${mdB.name}有合拍的地方，` +
        `但需要双方在很多方面互相迁就。差异不是问题，问题是愿不愿意为彼此调整。`;
    }
    return `${zdA.name}${mdA.name}和${zdB.name}${mdB.name}在性格底层逻辑上差异较大。` +
      `不是不能在一起，但需要很强的理解和包容。`;
  },

  /**
   * 分析关系阶段（从收集的信息推断）
   */
  analyzeStages: function() {
    const model = CHARACTER_MODEL ? CHARACTER_MODEL.getModel() : null;
    if (!model) return null;

    const stages = [];
    for (const stage of this.relationshipStages) {
      stages.push({
        key: stage.key,
        label: stage.label,
        icon: stage.icon,
        hasInfo: !!model.L1.nickname  // 简化版：只要有基本人物信息就算
      });
    }
    return stages;
  },

  /**
   * 生成分析报告 prompt（让AI根据此结构回复）
   */
  buildAnalysisPrompt: function(userInput) {
    this._initWeights();
    const model = CHARACTER_MODEL ? CHARACTER_MODEL.getModel() : null;
    const settings = this._loadSettings();

    // 用户自己的信息
    const myZodiac = settings.zodiac || '';
    const myMbti = settings.mbti || '';
    const myZD = window.PERSONALITY?.zodiac[myZodiac];
    const myMD = window.PERSONALITY?.mbti[myMbti];

    // 如果有对方的信息（从对话中收集的）
    const hasPartnerInfo = model && model.L1.nickname;

    // 选择匹配的分析框架
    const frameworks = this._selectFrameworks(userInput);

    return {
      systemIntro: [
        '你是星析情感顾问，专门帮用户分析感情关系。',
        '请基于以下信息，给出结构化分析。',
        '用温暖专业的口吻，直接说分析结论，不加括号注释。',
        '每次分析聚焦一个角度，不同次对话覆盖不同角度。',
        '',
        '【分析框架】本次使用以下心理学框架：',
        ...frameworks.map(f => `- ${f}`)
      ].join('\n'),

      userInfo: hasPartnerInfo
        ? `用户（${myZD?.name || '未知'}${myMD?.name || ''}）正在分析他和` +
          `${model.L1.nickname}的关系。`
        : `用户（${myZD?.name || '未知'}${myMD?.name || ''}）请求关系分析` +
          `${myZD ? `，作为${myZD.element}象${myMD?.name || ''}类型的人` : ''}。`,

      relationshipInfo: hasPartnerInfo ? [
        `【关系基本信息】`,
        model.L1.relationshipBackground ? `认识方式：${model.L1.relationshipBackground}` : '',
        model.L1.interests.length > 0 ? `她的喜好：${model.L1.interests.join('、')}` : '',
        model.L2.importantMemories.length > 0 ? `重要回忆：${model.L2.importantMemories.slice(-3).join('、')}` : '',
        model.L2.interactionPatterns.length > 0 ? `相处模式：${model.L2.interactionPatterns.slice(-2).join('、')}` : '',
      ].filter(Boolean).join('\n') : '',

      analysisInstruction: this._buildAnalysisInstruction(frameworks, userInput)
    };
  },

  /**
   * ===== 框架权重管理系统（文档5.2.2节） =====
   */
  _frameworkWeights: null,

  _initWeights: function() {
    if (this._frameworkWeights) return;
    try {
      var saved = localStorage.getItem('shuxing_framework_weights');
      if (saved) { this._frameworkWeights = JSON.parse(saved); return; }
    } catch(e) {}
    this._frameworkWeights = {
      '星座+MBTI性格匹配分析': { weight: 1.0, uses: 0, pos: 0, neg: 0 },
      '依恋理论': { weight: 1.0, uses: 0, pos: 0, neg: 0 },
      '爱情三角理论': { weight: 1.0, uses: 0, pos: 0, neg: 0 },
      '爱的五种语言': { weight: 1.0, uses: 0, pos: 0, neg: 0 },
      '戈特曼四骑士': { weight: 1.0, uses: 0, pos: 0, neg: 0 }
    };
    this._saveWeights();
  },

  _saveWeights: function() {
    try { localStorage.setItem('shuxing_framework_weights', JSON.stringify(this._frameworkWeights)); } catch(e) {}
  },

  recordFrameworkFeedback: function(name, positive) {
    this._initWeights();
    var fw = this._frameworkWeights[name];
    if (!fw) return;
    fw.uses++;
    if (positive) { fw.pos++; fw.weight = Math.min(2.0, fw.weight + 0.1); }
    else { fw.neg++; fw.weight = Math.max(0.3, fw.weight - 0.15); }
    this._saveWeights();
  },

  getFrameworkWeightsSummary: function() {
    this._initWeights();
    return Object.entries(this._frameworkWeights)
      .map(function(e) { return { name: e[0], weight: Math.round(e[1].weight*100)/100, uses: e[1].uses, score: e[1].uses > 0 ? Math.round((e[1].pos/e[1].uses)*100) : 0 }; })
      .sort(function(a, b) { return b.weight - a.weight; });
  },

  /**
   * 智能选择分析框架（带权重调整）
   */
  _selectFrameworks: function(userInput) {
    this._initWeights();
    var selected = [];
    var input = (userInput || '').toLowerCase();

    // 默认框架（总是包含）
    selected.push('星座+MBTI性格匹配分析');

    // 依恋理论：涉及安全感、焦虑、回避
    if (/焦虑|不安|担心|安全感|回避|冷淡|忽冷|冷暴力|依赖/.test(input)) {
      selected.push('依恋理论（分析双方的依恋类型）');
    }

    // 爱情三角：涉及激情消退、平淡
    if (/激情|平淡|热恋|新鲜|火花|没感觉|不爱了/.test(input)) {
      selected.push('爱情三角理论（分析亲密+激情+承诺的平衡）');
    }

    // 爱的五种语言：涉及表达方式、需求
    if (/表达|说爱|关心|方式|付出|接受|吵架|沟通/.test(input)) {
      selected.push('爱的五种语言（分析表达/接收爱的方式差异）');
    }

    // 戈特曼四骑士：涉及吵架、冷战
    if (/吵架|冷战|争吵|矛盾|指责|嘲讽|不说话/.test(input)) {
      selected.push('戈特曼四骑士（识别关系中的破坏性沟通模式）');
    }

    // 保证至少2个框架
    if (selected.length < 2) {
      const extras = ['依恋理论', '爱情三角理论', '爱的五种语言', '戈特曼四骑士'];
      while (selected.length < 3) {
        const pick = extras[Math.floor(Math.random() * extras.length)];
        if (!selected.includes(pick)) selected.push(pick);
      }
    }

    // 记录本次使用的框架
    var w = this._frameworkWeights;
    selected.forEach(function(f) { if (w[f]) w[f].uses++; });
    this._saveWeights();

    return selected;
  },

  /**
   * 构建分析指令
   */
  _buildAnalysisInstruction: function(frameworks, userInput) {
    return [
      '请按照以下结构分析：',
      '',
      '1️⃣ 【当前状态判断】',
      `  基于用户的描述"${userInput?.substring(0, 50) || ''}"，判断他目前处于感情周期的哪个阶段。`,
      '',
      '2️⃣ 【核心问题定位】',
      '  用选择的框架分析核心问题所在。多角度分析，但不堆砌框架。',
      '',
      '3️⃣ 【对方视角解读】',
      '  尝试站在对方的角度理解她的感受和想法。',
      '',
      '4️⃣ 【行动建议】',
      '  给出具体的、可执行的建议。不要说大道理，要说"你可以这样做"。',
      '',
      '5️⃣ 【一句话总结】',
      '  用一句温暖的话收尾。',
      '',
      '注意事项：',
      '- 不说用户想听的，说用户需要听的',
      '- 用"我观察到..."而不是"你做错了..."',
      '- 不同对话从不同角度分析',
      '- 不评判用户的选择，给出分析让用户自己判断'
    ].join('\n');
  },

  /**
   * 生成复合可能性评估 prompt
   */
  buildReconciliationPrompt: function() {
    const model = CHARACTER_MODEL ? CHARACTER_MODEL.getModel() : null;
    const settings = this._loadSettings();

    const factors = {
      positive: [],
      negative: []
    };

    // 根据收集的信息判断复合因素
    if (model) {
      // 从记忆锚点中找线索
      const anchors = model.memoryAnchors || [];
      const anchorText = anchors.map(a => a.text).join(' ');

      // 积极信号
      if (anchorText.includes('联系') || anchorText.includes('回消息') || anchorText.includes('点赞')) {
        factors.positive.push('对方可能还有联系意愿');
      }
      if (model.L3.conversationCount < 50) {
        factors.positive.push('分开时间不长');
      }

      // 消极信号
      if (anchorText.includes('拉黑') || anchorText.includes('删')) {
        factors.negative.push('对方可能已切断联系');
      }
      if (anchorText.includes('新欢') || anchorText.includes('别人') || anchorText.includes('新对象')) {
        factors.negative.push('对方可能已有新的人出现');
      }
      if (anchorText.includes('不合适') || anchorText.includes('性格不合') || anchorText.includes('三观')) {
        factors.negative.push('对方认为是核心性格不合');
      }
    }

    return {
      factors,
      message: '基于你提到的信息，我初步判断如下。但更准确的评估需要更多信息：\n' +
        '1️⃣ 你们现在还有联系吗？\n' +
        '2️⃣ 她最后说的原因是什么？\n' +
        '3️⃣ 分开多久了？'
    };
  },

  /**
   * 生成行动建议 prompt
   */
  buildActionPrompt: function() {
    return JSON.stringify(this.actionStages.map(s => ({
      stage: `${s.icon} ${s.label}（${s.subtitle}）`,
      actions: s.actions
    })));
  },

  /**
   * 获取用户设置
   */
  _loadSettings: function() {
    try {
      const saved = localStorage.getItem('shuxing_user_settings');
      return saved ? JSON.parse(saved) : { zodiac: '', mbti: '', nickname: '' };
    } catch (e) {
      return { zodiac: '', mbti: '', nickname: '' };
    }
  },

  /**
   * 获取框架帮助文案（生成分析文案时用途）
   */
  getFrameworkHelp: function(frameworkKey) {
    const fw = this.frameworks[frameworkKey];
    if (!fw) return null;

    if (frameworkKey === 'loveLanguages') {
      return fw.languages.map(l =>
        `【${l.name}】${l.desc}。她如果在乎${l.signs.slice(0, 2).join('、')}，` +
        `说明她的主要爱语可能是${l.name}。你可以${l.actions.slice(0, 2).join('、')}。`
      ).join('\n');
    }

    if (frameworkKey === 'gottmanFourHorsemen') {
      return fw.riders.map(r =>
        `【${r.name}】${r.desc}。例如"${r.example}"。对策：${r.antidote}。`
      ).join('\n');
    }

    return JSON.stringify(fw, null, 2);
  }
};
