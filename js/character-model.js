/**
 * 数星 - 人物模型 + 对话阶段管理系统 V1
 * 
 * 管理：
 *   1. L1/L2/L3/L4 分阶段信息收集
 *   2. 信息收集完成度追踪
 *   3. 记忆锚点管理（AI主动引用用户说过的话）
 *   4. 隐式反馈收集（通过用户行为判断）
 *   5. 信息修正机制
 *   6. 相似度渐进
 */

window.CHARACTER_MODEL = {
  
  // ===== 默认空模型 =====
  _defaultModel: () => ({
    // ---- L1层：快速信息 ----
    L1: {
      nickname: '',              // 昵称/称呼
      relationshipBackground: '', // 关系背景（怎么认识的）
      personalityBrief: '',       // 性格简述
      interests: [],              // 兴趣爱好
      speakingStyle: '',          // 说话风格特点
      keyMemory: '',              // 印象最深的一次
      _collected: 0,              // 已收集项数（共6项）
      _required: 6
    },
    
    // ---- L2层：深度信息 ----
    L2: {
      importantMemories: [],     // 重要记忆列表
      interactionPatterns: [],   // 相处模式
      specificScenarios: [],     // 具体场景描述
      details: [],               // 更多细节
      _collected: 0
    },
    
    // ---- L3层：持续优化 ----
    L3: {
      corrections: [],            // 用户修正记录
      implicitFeedbackLog: [],    // 隐式反馈日志
      conversationCount: 0,       // 对话轮数
    },
    
    // ---- 追踪状态 ----
    currentStage: 'L1',          // L1 → L2 → L3 → L4
    similarityPercent: 10,       // 0-100% 相似度
    similarityLevel: '初期',     // 初期(1-30%) / 中期(31-70%) / 后期(71-100%)
    lastStagePrompt: '',         // 上次用户遇到哪个阶段的提示
    
    // ---- 记忆锚点（AI可主动引用） ----
    memoryAnchors: [],           
    // 格式: { text: "她喜欢下雨天听雨声", context: "天气", createdAt: timestamp, used: false }
    
    // ---- 已收集信息索引（用于去重+避免重复问） ----
    collectedTopics: new Set(),
    
    // ---- 人物基本信息（直接引用） ----
    zodiac: '',
    mbti: '',
    chatHistory: '',
  }),
  
  // ===== 当前模型（从localStorage加载） =====
  _model: null,
  
  // ===== 初始化/加载模型 =====
  initModel: function() {
    try {
      // 从settings加载基础信息
      const settings = localStorage.getItem('shuxing_user_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this._model = this._defaultModel();
        this._model.zodiac = parsed.zodiac || '';
        this._model.mbti = parsed.mbti || '';
        this._model.chatHistory = parsed.chatHistory || '';
        
        // 如果有更完整的模型数据，合并
        const modelData = localStorage.getItem('shuxing_character_model');
        if (modelData) {
          const saved = JSON.parse(modelData);
          Object.assign(this._model, saved);
          // 确保collectedTopics是Set（JSON序列化会变成普通数组）
          if (Array.isArray(this._model.collectedTopics)) {
            this._model.collectedTopics = new Set(this._model.collectedTopics);
          }
          // 确保L2和L3数据
          if (!this._model.L1) this._model.L1 = this._defaultModel().L1;
          if (!this._model.L2) this._model.L2 = this._defaultModel().L2;
          if (!this._model.L3) this._model.L3 = this._defaultModel().L3;
          if (!this._model.memoryAnchors) this._model.memoryAnchors = [];
          if (!this._model.L1._collected) this._model.L1._collected = 0;
        }
        this._save();
        return this._model;
      }
    } catch (e) {
      console.warn('加载人物模型失败:', e);
    }
    
    this._model = this._defaultModel();
    return this._model;
  },
  
  // ===== 获取当前模型 =====
  getModel: function() {
    if (!this._model) this.initModel();
    return this._model;
  },
  
  // ===== 私有：保存到localStorage =====
  _save: function() {
    try {
      if (!this._model) return;
      const toSave = JSON.parse(JSON.stringify(this._model));
      // 转换Set为数组
      toSave.collectedTopics = Array.from(this._model.collectedTopics || []);
      // 移除冗余字段
      toSave.L1._required = this._defaultModel().L1._required;
      localStorage.setItem('shuxing_character_model', JSON.stringify(toSave));
    } catch (e) {
      console.warn('保存人物模型失败:', e);
    }
  },
  
  // ===== 记录一条新信息（更新完成度） =====
  recordInfo: function(category, value, anchorText) {
    const model = this.getModel();
    if (!value || !value.trim()) return;
    
    switch(category) {
      case 'nickname':
        if (!model.L1.nickname) model.L1._collected++;
        model.L1.nickname = value.trim();
        break;
      case 'relationshipBackground':
        if (!model.L1.relationshipBackground) model.L1._collected++;
        model.L1.relationshipBackground = value.trim();
        break;
      case 'personalityBrief':
        if (!model.L1.personalityBrief) model.L1._collected++;
        model.L1.personalityBrief = value.trim();
        break;
      case 'interests':
        const interests = value.split(/[,，、\s]+/).filter(Boolean);
        interests.forEach(i => {
          if (!model.L1.interests.includes(i)) {
            model.L1.interests.push(i);
            model.L1._collected++;
          }
        });
        break;
      case 'speakingStyle':
        if (!model.L1.speakingStyle) model.L1._collected++;
        model.L1.speakingStyle = value.trim();
        break;
      case 'keyMemory':
        if (!model.L1.keyMemory) model.L1._collected++;
        model.L1.keyMemory = value.trim();
        break;
      case 'deepMemory':
        model.L2.importantMemories.push(value.trim());
        model.L2._collected = (model.L2._collected || 0) + 1;
        break;
      case 'interactionPattern':
        model.L2.interactionPatterns.push(value.trim());
        model.L2._collected = (model.L2._collected || 0) + 1;
        break;
      case 'scenario':
        model.L2.specificScenarios.push(value.trim());
        model.L2._collected = (model.L2._collected || 0) + 1;
        break;
    }
    
    // 更新相似度
    this._updateSimilarity();
    
    // 添加记忆锚点
    if (anchorText) {
      this.addMemoryAnchor(anchorText, category);
    }
    
    this._save();
  },
  
  // ===== 添加记忆锚点 =====
  addMemoryAnchor: function(text, context) {
    const model = this.getModel();
    model.memoryAnchors.push({
      text: text,
      context: context || 'general',
      createdAt: Date.now(),
      used: false
    });
    // 最多保留50条
    if (model.memoryAnchors.length > 50) {
      model.memoryAnchors.shift();
    }
    this._save();
  },
  
  // ===== 获取一个未使用的记忆锚点（用于AI主动引用） =====
  getUnusedAnchor: function() {
    const model = this.getModel();
    const unused = model.memoryAnchors.filter(a => !a.used);
    if (unused.length === 0) return null;
    
    // 优先选和当前情景相关的
    const pick = unused[Math.floor(Math.random() * unused.length)];
    pick.used = true;
    this._save();
    return pick;
  },
  
  // ===== 获取可引用的记忆锚点（不一定未使用，可以是最近用过的） =====
  getReferenceAnchor: function() {
    const model = this.getModel();
    if (model.memoryAnchors.length === 0) return null;
    
    // 50%概率引用已标记为used的（复习用户说过的），50%概率引用新的
    if (Math.random() > 0.5) {
      const unused = model.memoryAnchors.filter(a => !a.used);
      if (unused.length > 0) {
        const pick = unused[Math.floor(Math.random() * unused.length)];
        pick.used = true;
        this._save();
        return pick;
      }
    }
    
    // 从所有锚点中随机选一个
    const pick = model.memoryAnchors[Math.floor(Math.random() * model.memoryAnchors.length)];
    return pick;
  },
  
  // ===== 信息修正 =====
  correctInfo: function(originalTopic, correctedText) {
    const model = this.getModel();
    model.L3.corrections.push({
      original: originalTopic,
      corrected: correctedText,
      timestamp: Date.now()
    });
    
    // 从锚点中标记相关项
    model.memoryAnchors.forEach(a => {
      if (a.text.includes(originalTopic) || originalTopic.includes(a.text)) {
        a.text = a.text.replace(originalTopic, correctedText);
      }
    });
    
    this._save();
    return true;
  },
  
  // ===== 记录隐式反馈 =====
  recordImplicitFeedback: function(type, detail) {
    const model = this.getModel();
    model.L3.implicitFeedbackLog.push({
      type: type,      // 'continue' 继续聊 / 'correct' 纠正 / 'silence' 沉默 / 'redirect' 转移话题
      detail: detail,
      timestamp: Date.now()
    });
    // 只保留最近50条
    if (model.L3.implicitFeedbackLog.length > 50) {
      model.L3.implicitFeedbackLog.shift();
    }
    this._save();
  },
  
  // ===== 检查是否进入新阶段 =====
  checkStageTransition: function() {
    const model = this.getModel();
    const pct = this.getL1Completion();
    
    // L1 → L2：L1完成度>50%且聊了10轮以上
    if (model.currentStage === 'L1' && pct >= 50 && model.L3.conversationCount >= 10) {
      model.currentStage = 'L2';
      this._save();
      return 'L2';
    }
    
    // L2 → L3：L2有5条以上深度信息且聊了50轮以上
    if (model.currentStage === 'L2' && (model.L2._collected || 0) >= 5 && model.L3.conversationCount >= 50) {
      model.currentStage = 'L3';
      this._save();
      return 'L3';
    }
    
    // L3 → L4：聊了200轮以上
    if (model.currentStage === 'L3' && model.L3.conversationCount >= 200) {
      model.currentStage = 'L4';
      this._save();
      return 'L4';
    }
    
    return null;
  },
  
  // ===== 获取当前阶段名称 =====
  getStageName: function() {
    const names = {
      'L1': '初遇 · 认识她',
      'L2': '熟悉 · 了解她',
      'L3': '深入 · 像她了',
      'L4': '陪伴 · 如她常在'
    };
    return names[this._model?.currentStage] || '认识她';
  },
  
  // ===== 获取L1完成度(%) =====
  getL1Completion: function() {
    const model = this.getModel();
    const l1 = model.L1;
    if (!l1) return 0;
    
    // 计算实际已收集项（去重后）
    let collected = 0;
    if (l1.nickname) collected++;
    if (l1.relationshipBackground) collected++;
    if (l1.personalityBrief) collected++;
    if (l1.interests.length > 0) collected++;
    if (l1.speakingStyle) collected++;
    if (l1.keyMemory) collected++;
    
    // + 导入聊天记录额外加分
    const chatBoost = model.chatHistory && model.chatHistory.trim().length > 50 ? 20 : 0;
    
    return Math.min(100, Math.round((collected / 6) * 80 + chatBoost));
  },
  
  // ===== 获取L2完成度(%) =====
  getL2Completion: function() {
    const model = this.getModel();
    const collected = model.L2._collected || 0;
    return Math.min(100, Math.round((collected / 15) * 100));
  },
  
  // ===== 获取总进度(%) =====
  getTotalProgress: function() {
    const l1 = this.getL1Completion();
    const l2 = this.getL2Completion();
    return Math.round(l1 * 0.4 + l2 * 0.6);
  },
  
  // ===== 更新相似度 =====
  _updateSimilarity: function() {
    const model = this.getModel();
    const progress = this.getTotalProgress();
    
    // 相似度 = 总进度 * 0.8 + 对话轮数微调
    const turnBonus = Math.min(20, Math.floor(model.L3.conversationCount / 10));
    model.similarityPercent = Math.min(95, Math.round(progress * 0.8 + turnBonus));
    
    // 更新阶段标签
    if (model.similarityPercent <= 30) {
      model.similarityLevel = '初期';
    } else if (model.similarityPercent <= 70) {
      model.similarityLevel = '中期';
    } else {
      model.similarityLevel = '后期';
    }
  },
  
  // ===== 获取养成感反馈文案 =====
  getProgressFeedback: function() {
    const model = this.getModel();
    const pct = this.getTotalProgress();
    
    if (pct < 20) return '慢慢来，让我一点一点认识她';
    if (pct < 40) return `已经了解她${Math.round(pct/10)*10}%了，继续说下去，她越来越清晰～`;
    if (pct < 60) return `已经了解她${Math.round(pct/10)*10}%！我感觉到她的轮廓了✨`;
    if (pct < 80) return `我越来越了解她了，她的样子越来越清晰🌟`;
    return '她在我心里已经很完整了，我会一直记得你说过的一切✨';
  },
  
  // ===== 增加对话轮数 =====
  incrementConversationCount: function() {
    const model = this.getModel();
    model.L3.conversationCount++;
    this._updateSimilarity();
    this._save();
  },
  
  // ===== 检查是否需要提示"了解更多" =====
  shouldPromptLearnMore: function() {
    const model = this.getModel();
    if (!this._model) this.initModel();
    
    // 每10轮检查一次，L1未满50%时提示
    if (model.currentStage === 'L1' && model.L3.conversationCount > 0 && 
        model.L3.conversationCount % 10 === 0 && this.getL1Completion() < 50) {
      return true;
    }
    return false;
  },
  
  // ===== 获取需要补充的问题（根据当前缺失的L1信息） =====
  getMissingPrompt: function() {
    const model = this.getModel();
    const questions = [];
    
    if (!model.L1.nickname) questions.push('她叫什么名字呀？');
    if (!model.L1.relationshipBackground) questions.push('你们是怎么认识的？');
    if (!model.L1.personalityBrief) questions.push('她平时是活泼还是安静？');
    if (model.L1.interests.length === 0) questions.push('她平时喜欢做什么？');
    if (!model.L1.speakingStyle) questions.push('她说话有什么特点吗？');
    if (!model.L1.keyMemory) questions.push('有没有印象最深的一次？');
    
    return questions.length > 0 ? questions[Math.floor(Math.random() * questions.length)] : null;
  },
  
  // ===== 重置模型 =====
  resetModel: function() {
    this._model = this._defaultModel();
    this._save();
  }
};
