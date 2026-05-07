/**
 * 数星 - 多模型调度器 V1（前端）
 * 
 * 按文档5.3-5.4设计：
 * - 按任务类型分级调用（简单/中等/深度）
 * - 模型配置中心（API key留空，峰哥后填）
 * - 自动降级机制（第一个模型挂了自动切到下一个）
 * - 当前仅DeepSeek可用，其他模型留空等配置
 */

window.MODEL_SCHEDULER = {
  
  // ===== 模型配置注册表 =====
  // API key 统一留空，峰哥填进去即可生效
  models: {
    // ===== 已配置 =====
    deepseek: {
      id: 'deepseek',
      name: 'DeepSeek V4',
      provider: 'deepseek',
      enabled: true,
      apiKey: 'sk-f01481a824b243b28999980106c876c8',  // ✅ 已配置
      baseURL: '',
      modelName: 'deepseek-chat',
      tier: ['simple', 'medium', 'deep'],  // 全能型，所有任务都能跑
      cost: 'cheap',
      status: 'active'
    },
    
    // ===== 待配置（API key留空） =====
    doubao: {
      id: 'doubao',
      name: '豆包-Lite',
      provider: 'doubao',
      enabled: false,
      apiKey: '',        // 峰哥填入豆包API key
      baseURL: '',       // 峰哥填入豆包接口地址
      modelName: 'doubao-lite',
      tier: ['simple'],  // 适合日常闲聊
      cost: 'free',
      status: 'pending'
    },
    
    deepseek_r1: {
      id: 'deepseek_r1',
      name: 'DeepSeek R1',
      provider: 'deepseek',
      enabled: false,
      apiKey: '',        // 峰哥填入DeepSeek R1的API key（和V3不同key则填不同）
      baseURL: '',       // 留空用DeepSeek默认地址
      modelName: 'deepseek-reasoner',
      tier: ['deep'],    // 适合深度分析
      cost: 'expensive',
      status: 'pending'
    },
    
    qwen: {
      id: 'qwen',
      name: '通义千问-Turbo',
      provider: 'qwen',
      enabled: false,
      apiKey: '',        // 峰哥填入通义API key
      baseURL: '',
      modelName: 'qwen-turbo',
      tier: ['simple', 'medium'],
      cost: 'free',
      status: 'pending'
    },
    
    glm: {
      id: 'glm',
      name: '智谱GLM-4',
      provider: 'glm',
      enabled: false,
      apiKey: '',        // 峰哥填入智谱API key
      baseURL: '',
      modelName: 'glm-4',
      tier: ['medium'],
      cost: 'medium',
      status: 'pending'
    }
  },
  
  // ===== 任务类型定义 =====
  taskTiers: {
    simple: {   // 简单对话：星伴日常、信息收集
      label: '日常对话',
      description: '简短回复、问候、信息收集',
      recommendedModels: ['doubao', 'deepseek', 'qwen'],
      maxTokens: 200,
      temperature: 0.9
    },
    medium: {   // 中等分析：基础分析、性格匹配、记忆引用
      label: '基础分析',
      description: '性格匹配、关系分析、记忆引用',
      recommendedModels: ['deepseek', 'qwen', 'glm'],
      maxTokens: 400,
      temperature: 0.7
    },
    deep: {     // 深度分析：关系诊断、复合评估、复杂推理
      label: '深度分析',
      description: '多维度分析、复合评估、复杂推理',
      recommendedModels: ['deepseek_r1', 'deepseek', 'glm'],
      maxTokens: 800,
      temperature: 0.5
    }
  },
  
  // ===== 当前使用的模型 =====
  _currentModel: 'deepseek',
  
  // ===== 根据任务类型选择模型 =====
  selectModel: function(taskTier) {
    // 如果任务不知道，默认用deepseek
    if (!taskTier || !this.taskTiers[taskTier]) {
      return this.models.deepseek;
    }
    
    const tier = this.taskTiers[taskTier];
    
    // 按优先级遍历推荐模型，找到第一个启用的
    for (const modelId of tier.recommendedModels) {
      const model = this.models[modelId];
      if (model && model.enabled && model.status === 'active') {
        this._currentModel = modelId;
        return model;
      }
    }
    
    // 推荐的全没启用 → 降级到当前启用的任意模型
    for (const [id, model] of Object.entries(this.models)) {
      if (model.enabled && model.status === 'active') {
        this._currentModel = id;
        return model;
      }
    }
    
    // 实在没有 → 报错
    console.warn('没有启用的模型，请配置至少一个模型');
    return null;
  },
  
  // ===== 智能判断任务类型 =====
  classifyTask: function(userInput, currentMode) {
    if (!userInput) return 'simple';
    
    // 星析模式 → 至少中等任务
    if (currentMode === 'counseling') {
      // 深度分析关键词
      const deepKeywords = [
        '分析', '评估', '总结', '诊断', '为什么分手', '可能性',
        '能不能复合', '她还爱不爱', '该不该', '走下去',
        '做决定', '值不值得', '深度', '全面分析',
        '复合评估', '关系诊断', '最终建议',
        '帮我想清楚', '给我分析一下',
        '综合来看', '整体来看'
      ];
      
      const mediumKeywords = [
        '性格匹配', '合适吗', '适合', '匹配', '问题出在哪',
        '她是怎么想的', '他是什么意思', '为什么这样',
        '矛盾', '吵架', '冷战', '回避',
        '沟通', '理解', '相处', '磨合'
      ];
      
      const input = userInput.toLowerCase();
      
      for (const kw of deepKeywords) {
        if (input.includes(kw)) return 'deep';
      }
      for (const kw of mediumKeywords) {
        if (input.includes(kw)) return 'medium';
      }
      return 'medium'; // 星析默认中等
    }
    
    // 星伴模式 → 简单任务
    return 'simple';
  },
  
  // ===== 获取当前模型信息 =====
  getCurrentModel: function() {
    return this.models[this._currentModel] || this.models.deepseek;
  },
  
  // ===== 获取模型状态摘要 =====
  getStatusSummary: function() {
    const summary = {};
    for (const [id, model] of Object.entries(this.models)) {
      summary[id] = {
        name: model.name,
        enabled: model.enabled,
        status: model.status,
        hasKey: !!model.apiKey,
        tasks: model.tier
      };
    }
    return summary;
  },
  
  // ===== 获取任务配置（含模型选择结果） =====
  getTaskConfig: function(userInput, currentMode) {
    const tier = this.classifyTask(userInput, currentMode);
    const model = this.selectModel(tier);
    const tierConfig = this.taskTiers[tier];
    
    return {
      tier: tier,
      tierLabel: tierConfig.label,
      model: model,
      temperature: tierConfig.temperature,
      maxTokens: tierConfig.maxTokens
    };
  },
  
  // ===== 为proxy-server生成请求头 =====
  getRequestHeaders: function(userInput, currentMode) {
    const config = this.getTaskConfig(userInput, currentMode);
    return {
      'Content-Type': 'application/json',
      'X-Model-Provider': config.model.provider,
      'X-Model-Name': config.model.modelName,
      'X-Task-Tier': config.tier
    };
  },
  
  // ===== 模型管理（峰哥未来配置用） =====
  enableModel: function(modelId, apiKey, baseURL) {
    if (!this.models[modelId]) {
      console.error('未知模型:', modelId);
      return false;
    }
    const model = this.models[modelId];
    model.apiKey = apiKey;
    if (baseURL) model.baseURL = baseURL;
    model.enabled = true;
    model.status = 'active';
    console.log(`✅ 模型 ${model.name} 已启用`);
    this._saveConfig();
    return true;
  },
  
  disableModel: function(modelId) {
    if (!this.models[modelId]) return false;
    this.models[modelId].enabled = false;
    this.models[modelId].status = 'inactive';
    this._saveConfig();
    return true;
  },
  
  // ===== 持久化配置（localStorage） =====
  _saveConfig: function() {
    try {
      const config = {};
      for (const [id, model] of Object.entries(this.models)) {
        config[id] = {
          apiKey: model.apiKey,
          baseURL: model.baseURL,
          enabled: model.enabled,
          status: model.status
        };
      }
      localStorage.setItem('shuxing_model_config', JSON.stringify(config));
    } catch (e) {
      console.warn('保存模型配置失败:', e);
    }
  },
  
  _loadConfig: function() {
    try {
      const saved = localStorage.getItem('shuxing_model_config');
      if (saved) {
        const config = JSON.parse(saved);
        for (const [id, cfg] of Object.entries(config)) {
          if (this.models[id]) {
            this.models[id].apiKey = cfg.apiKey || this.models[id].apiKey;
            this.models[id].baseURL = cfg.baseURL || this.models[id].baseURL;
            this.models[id].enabled = cfg.enabled ?? this.models[id].enabled;
            this.models[id].status = cfg.status || this.models[id].status;
          }
        }
      }
    } catch (e) {}
  },
  
  // ===== 初始化 =====
  init: function() {
    this._loadConfig();
    console.log('🔧 模型调度器已初始化');
    console.log('📋 可用模型:', Object.values(this.models).filter(m => m.enabled).map(m => m.name).join(', ') || '仅DeepSeek');
    console.log('⏳ 待配置:', Object.values(this.models).filter(m => !m.enabled).map(m => `${m.name} (待填API key)`).join(', '));
  }
};

// 自动初始化
MODEL_SCHEDULER.init();
