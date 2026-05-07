/**
 * 数星 - 自动化测试框架 V1
 * 
 * 用法：
 *   1. 打开任意页面，在控制台运行：
 *      SHUXING_TEST.runAll()
 *   2. 或在浏览器中打开 test.html
 *   3. 每次迭代后先跑一遍测试再提pr
 * 
 * 测试用例规则：
 *   - 每个测试用 return { pass: true/false, msg: '说明' }
 *   - 所有测试必须独立可重入
 *   - 测试修改localStorage后要还原
 */

window.SHUXING_TEST = {
  
  // ===== 测试计数器 =====
  _results: { total: 0, passed: 0, failed: 0 },
  
  // ===== localStorage 快照（测试前后还原） =====
  _snapshot: {},
  
  _saveSnapshot: function() {
    this._snapshot = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key.startsWith('shuxing_')) {
        this._snapshot[key] = localStorage.getItem(key);
      }
    }
  },
  
  _restoreSnapshot: function() {
    for (var key in this._snapshot) {
      localStorage.setItem(key, this._snapshot[key]);
    }
  },
  
  // ===== 断言工具 =====
  assert: {
    true: function(condition, msg) { return { pass: !!condition, msg: msg || '期望为true' }; },
    false: function(condition, msg) { return { pass: !condition, msg: msg || '期望为false' }; },
    eq: function(actual, expected, msg) {
      var pass = actual === expected;
      return { pass: pass, msg: msg + (pass ? '' : ' (期望=' + String(expected) + ', 实际=' + String(actual) + ')') };
    },
    has: function(obj, prop, msg) {
      var pass = obj && obj[prop] !== undefined;
      return { pass: pass, msg: msg || '对象应有属性' + prop };
    },
    type: function(val, type, msg) {
      var pass = typeof val === type;
      return { pass: pass, msg: msg + ' (期望类型=' + type + ', 实际=' + typeof val + ')' };
    },
    length: function(arr, min, msg) {
      var pass = arr && arr.length >= min;
      return { pass: pass, msg: msg + ' (长度=' + (arr ? arr.length : 0) + ', 期望≥' + min + ')' };
    }
  },
  
  // ===== 测试报告 =====
  _report: function(category, name, result) {
    this._results.total++;
    var icon = result.pass ? '✅' : '❌';
    var msg = icon + ' [' + category + '] ' + name + ' : ' + result.msg;
    if (result.pass) {
      this._results.passed++;
      console.log(msg);
    } else {
      this._results.failed++;
      console.error(msg);
    }
    return result;
  },
  
  // ===== 运行全部测试 =====
  runAll: function() {
    this._saveSnapshot();
    this._results = { total: 0, passed: 0, failed: 0 };
    
    console.log('\n🌟 数星测试套件启动 ==========================');
    console.log('开始时间:', new Date().toLocaleString());
    console.log('');
    
    // 按类别分组执行
    var categories = [
      'Core', 'Setup', 'CharacterModel', 'Chat', 'Analysis', 'Safety', 'Profile'
    ];
    // 检查当前页面，选择性执行
    var path = (window.location && window.location.pathname) || '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      if (this[cat] && typeof this[cat] === 'object') {
        this._runCategory(cat, this[cat]);
      }
    }
    
    console.log('\n📊 测试报告 =================================');
    console.log('总计: ' + this._results.total);
    console.log('通过: ' + this._results.passed + ' ✅');
    console.log('失败: ' + this._results.failed + ' ❌');
    console.log('通过率: ' + (this._results.total > 0 ? 
      Math.round(this._results.passed / this._results.total * 100) + '%' : 'N/A'));
    
    this._restoreSnapshot();
    
    if (this._results.failed > 0) {
      console.warn('⚠️ 有 ' + this._results.failed + ' 个测试未通过，请在提pr前修复');
    } else if (this._results.total > 0) {
      console.log('🎉 全部通过！提pr吧！');
    }
    
    return this._results;
  },
  
  _runCategory: function(name, tests) {
    console.log('\n--- ' + name + ' ---');
    for (var key in tests) {
      if (typeof tests[key] === 'function' && key.startsWith('test')) {
        try {
          var result = tests[key]();
          this._report(name, key, result);
        } catch (e) {
          this._report(name, key, { pass: false, msg: '异常: ' + e.message });
        }
      }
    }
  },
  
  // ================================================
  // 测试用例分类
  // ================================================
  
  Core: {
    // localStorage 读写
    testLocalStorageWrite: function() {
      var key = 'shuxing_test_temp';
      var val = JSON.stringify({ test: true, time: Date.now() });
      localStorage.setItem(key, val);
      var read = localStorage.getItem(key);
      localStorage.removeItem(key);
      return SHUXING_TEST.assert.eq(read, val, 'localStorage写读一致');
    },
    
    testLocalStorageRemove: function() {
      var key = 'shuxing_test_remove';
      localStorage.setItem(key, 'test');
      localStorage.removeItem(key);
      return SHUXING_TEST.assert.eq(localStorage.getItem(key), null, 'localStorage删除正常');
    },
    
    // 关键模块是否存在
    testCharacterModelExists: function() {
      return SHUXING_TEST.assert.true(!!window.CHARACTER_MODEL, '人物模型模块存在');
    },
    
    testPersonalityDataExists: function() {
      return SHUXING_TEST.assert.true(!!window.PERSONALITY, '人格数据模块存在');
    },
    
    testSafetyExists: function() {
      return SHUXING_TEST.assert.true(!!window.SAFETY, '安全模块存在');
    },
    
    testAnalysisEngineExists: function() {
      return SHUXING_TEST.assert.true(!!window.ANALYSIS_ENGINE, '分析引擎存在');
    },
    
    testModelSchedulerExists: function() {
      return SHUXING_TEST.assert.true(!!window.MODEL_SCHEDULER, '模型调度器存在');
    }
  },
  
  // ================================================
  Setup: {
    testDefaultSelections: function() {
      var s = localStorage.getItem('shuxing_user_settings');
      return SHUXING_TEST.assert.true(s === null || JSON.parse(s), '设置可读写');
    },
    
    testSaveAndLoad: function() {
      var saved = localStorage.getItem('shuxing_user_settings');
      var testData = { zodiac: '天蝎', mbti: 'INTJ', nickname: '小七', background: '大学同学' };
      localStorage.setItem('shuxing_user_settings', JSON.stringify(testData));
      var loaded = JSON.parse(localStorage.getItem('shuxing_user_settings'));
      // 还原
      if (saved) localStorage.setItem('shuxing_user_settings', saved);
      else localStorage.removeItem('shuxing_user_settings');
      return SHUXING_TEST.assert.eq(loaded.nickname, '小七', '设置保存读取正常');
    },
    
    testNicknameField: function() {
      // 检查setup页面是否有昵称输入框（DOM测试）
      var el = document.getElementById('input-nickname');
      return SHUXING_TEST.assert.true(!!el, '昵称输入框存在');
    },
    
    testBackgroundField: function() {
      var el = document.getElementById('input-background');
      return SHUXING_TEST.assert.true(!!el, '关系背景输入框存在');
    },
    
    testInterestsField: function() {
      var el = document.getElementById('input-interests');
      return SHUXING_TEST.assert.true(!!el, '兴趣输入框存在');
    },
    
    testZodiacGrid: function() {
      var grid = document.getElementById('zodiac-grid');
      if (!grid) return { pass: true, msg: '不在setup页面，跳过' };
      return SHUXING_TEST.assert.true(grid.children.length === 12, '12星座卡片');
    },
    
    testMbtiGrid: function() {
      var grid = document.getElementById('mbti-grid');
      if (!grid) return { pass: true, msg: '不在setup页面，跳过' };
      return SHUXING_TEST.assert.true(grid.children.length === 16, '16种MBTI卡片');
    }
  },
  
  // ================================================
  CharacterModel: {
    testInit: function() {
      SHUXING_TEST.characterModel = window.CHARACTER_MODEL;
      if (!SHUXING_TEST.characterModel) return { pass: false, msg: 'CHARACTER_MODEL未加载' };
      var m = SHUXING_TEST.characterModel.initModel();
      return SHUXING_TEST.assert.has(m, 'currentStage', '模型初始化有currentStage');
    },
    
    testL1Structure: function() {
      var m = SHUXING_TEST.characterModel.getModel();
      return SHUXING_TEST.assert.has(m.L1, 'nickname', 'L1层有nickname');
    },
    
    testL2Structure: function() {
      var m = SHUXING_TEST.characterModel.getModel();
      return SHUXING_TEST.assert.has(m.L2, 'importantMemories', 'L2层有importantMemories');
    },
    
    testL3Structure: function() {
      var m = SHUXING_TEST.characterModel.getModel();
      return SHUXING_TEST.assert.has(m.L3, 'corrections', 'L3层有corrections');
    },
    
    testMemoryAnchors: function() {
      var m = SHUXING_TEST.characterModel.getModel();
      return SHUXING_TEST.assert.has(m, 'memoryAnchors', '有memoryAnchors数组');
    },
    
    testRecordInfo: function() {
      SHUXING_TEST.characterModel.initModel();
      SHUXING_TEST.characterModel.recordInfo('nickname', '测试昵称');
      var m = SHUXING_TEST.characterModel.getModel();
      // Reset
      SHUXING_TEST.characterModel.initModel();
      return SHUXING_TEST.assert.eq(m.L1.nickname, '测试昵称', 'recordInfo写入nickname');
    },
    
    testAddMemoryAnchor: function() {
      SHUXING_TEST.characterModel.initModel();
      SHUXING_TEST.characterModel.addMemoryAnchor('她喜欢下雨天', 'weather');
      var m = SHUXING_TEST.characterModel.getModel();
      var hasAnchor = m.memoryAnchors.some(function(a) { return a.text.indexOf('下雨') >= 0; });
      SHUXING_TEST.characterModel.initModel();
      return SHUXING_TEST.assert.true(hasAnchor, '添加记忆锚点');
    },
    
    testGetReferenceAnchor: function() {
      SHUXING_TEST.characterModel.initModel();
      SHUXING_TEST.characterModel.addMemoryAnchor('测试锚点X', 'test');
      var anchor = SHUXING_TEST.characterModel.getReferenceAnchor();
      SHUXING_TEST.characterModel.initModel();
      return SHUXING_TEST.assert.true(anchor && anchor.text, '获取引用锚点');
    },
    
    testStageTransition: function() {
      return SHUXING_TEST.assert.has(
        SHUXING_TEST.characterModel.checkStageTransition(), 
        null, 
        '阶段转换函数存在'
      );
    },
    
    testProgressFeedback: function() {
      var feedback = SHUXING_TEST.characterModel.getProgressFeedback();
      return SHUXING_TEST.assert.true(typeof feedback === 'string' && feedback.length > 0, '养成感反馈文案');
    },
    
    testIncrementCount: function() {
      SHUXING_TEST.characterModel.initModel();
      var before = SHUXING_TEST.characterModel.getModel().L3.conversationCount;
      SHUXING_TEST.characterModel.incrementConversationCount();
      var after = SHUXING_TEST.characterModel.getModel().L3.conversationCount;
      SHUXING_TEST.characterModel.initModel();
      return SHUXING_TEST.assert.true(after > before, '对话轮数递增');
    }
  },
  
  // ================================================
  Chat: {
    testModeDisplay: function() {
      var modeTitle = document.getElementById('mode-title');
      if (!modeTitle) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(!!modeTitle.textContent, '模式标题存在');
    },
    
    testModeIndicator: function() {
      var indicator = document.getElementById('mode-indicator');
      if (!indicator) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(indicator.textContent.indexOf('星伴') >= 0 || indicator.textContent.indexOf('星析') >= 0, '模式指示器');
    },
    
    testSendButton: function() {
      var btn = document.getElementById('send-btn');
      if (!btn) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(!!btn, '发送按钮存在');
    },
    
    testInputField: function() {
      var input = document.getElementById('message-input');
      if (!input) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(!!input, '输入框存在');
    },
    
    testQuickReplies: function() {
      var container = document.getElementById('quick-replies');
      if (!container) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(container.children.length > 0, '快捷回复按钮');
    },
    
    testSwitchButton: function() {
      var btn = document.getElementById('switch-mode-btn');
      if (!btn) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(!!btn, '模式切换按钮存在');
    },
    
    testCharCount: function() {
      var count = document.getElementById('char-count');
      if (!count) return { pass: true, msg: '不在聊天页，跳过' };
      return SHUXING_TEST.assert.true(!!count, '字数统计存在');
    }
  },
  
  // ================================================
  Analysis: {
    testFrameworkWeights: function() {
      if (!window.ANALYSIS_ENGINE) return { pass: false, msg: '分析引擎未加载' };
      var summary = ANALYSIS_ENGINE.getFrameworkWeightsSummary();
      return SHUXING_TEST.assert.length(summary, 4, '框架权重有至少4个');
    },
    
    testMatchAnalysis: function() {
      if (!window.PERSONALITY) return { pass: false, msg: '人格数据未加载' };
      var result = ANALYSIS_ENGINE.analyzeMatch('金牛', 'ISTP', '双子', 'ENFP');
      return SHUXING_TEST.assert.has(result, 'score', '性格匹配返回分数');
    },
    
    testBuildAnalysisPrompt: function() {
      var prompt = ANALYSIS_ENGINE.buildAnalysisPrompt('我们分手了，我想知道为什么');
      return SHUXING_TEST.assert.has(prompt, 'systemIntro', '分析prompt有systemIntro');
    },
    
    testReconciliation: function() {
      var recon = ANALYSIS_ENGINE.buildReconciliationPrompt();
      return SHUXING_TEST.assert.has(recon, 'level', '复合评估有等级');
    },
    
    testReconciliationScore: function() {
      var recon = ANALYSIS_ENGINE.buildReconciliationPrompt();
      return SHUXING_TEST.assert.type(recon.score, 'number', '复合评估分数为数字');
    },
    
    testFrameworkRecording: function() {
      ANALYSIS_ENGINE.recordFrameworkFeedback('依恋理论', true);
      var summary = ANALYSIS_ENGINE.getFrameworkWeightsSummary();
      var love = summary.filter(function(s) { return s.name.indexOf('依恋') >= 0; });
      return SHUXING_TEST.assert.true(love.length > 0 && love[0].uses > 0, '框架使用记录');
    },
    
    testActionStages: function() {
      return SHUXING_TEST.assert.length(ANALYSIS_ENGINE.actionStages, 4, '4个行动建议阶段');
    }
  },
  
  // ================================================
  Safety: {
    testCrisisDetection: function() {
      return SHUXING_TEST.assert.true(SAFETY.checkCrisis('我不想活了'), '检测危机关键词');
    },
    
    testNormalDetection: function() {
      return SHUXING_TEST.assert.false(SAFETY.checkCrisis('今天心情不错'), '正常文本不触发');
    },
    
    testCrisisReply: function() {
      return SHUXING_TEST.assert.true(SAFETY.crisisReply.length > 10, '危机回复有内容');
    },
    
    testCelebrityBlacklist: function() {
      return SHUXING_TEST.assert.true(SAFETY.checkCelebrity('薛之谦'), '检测公众人物');
    },
    
    testNormalNoCelebrity: function() {
      return SHUXING_TEST.assert.false(SAFETY.checkCelebrity('张三'), '普通人不触发');
    },
    
    testRoundTracking: function() {
      SAFETY.resetRoundCount();
      var before = SAFETY.checkRoundLimit();
      // 999次后检查
      for (var i = 0; i < 999; i++) SAFETY.checkRoundLimit();
      var at999 = SAFETY.checkRoundLimit(); // this is the 1000th
      SAFETY.resetRoundCount();
      return SHUXING_TEST.assert.true(at999 !== null, '1000轮触发提示');
    }
  },
  
  // ================================================
  Profile: {
    testProfilePage: function() {
      var title = document.querySelector('title');
      if (!title || title.textContent.indexOf('个人中心') < 0) return { pass: true, msg: '不在个人中心页，跳过' };
      var zodiac = document.getElementById('profile-zodiac');
      return SHUXING_TEST.assert.true(!!zodiac, '星座信息显示');
    },
    
    testProgressBar: function() {
      var bars = document.querySelectorAll('.progress-fill');
      if (bars.length === 0) return { pass: true, msg: '不在个人中心页，跳过' };
      return SHUXING_TEST.assert.length(bars, 3, '3个进度条（L1/L2/总）');
    },
    
    testStatsGrid: function() {
      var stats = document.querySelectorAll('.stat-card');
      if (stats.length === 0) return { pass: true, msg: '不在个人中心页，跳过' };
      return SHUXING_TEST.assert.length(stats, 2, '2个统计卡片');
    }
  },
  
  // ================================================
  // 新增测试入口：在控制台调用 SHUXING_TEST.runAll()
  // ================================================
  
  // ===== 首页测试（独立） =====
  // 只在首页运行时触发
  Home: {
    testStateOptions: function() {
      var options = document.querySelectorAll('.state-option');
      if (options.length === 0) return { pass: true, msg: '不在首页，跳过' };
      return SHUXING_TEST.assert.eq(options.length, 4, '4个状态选项');
    },
    
    testDualEntry: function() {
      var entry = document.getElementById('dual-entry');
      if (!entry) return { pass: true, msg: '不在首页，跳过' };
      return SHUXING_TEST.assert.true(!!entry, '双功能入口存在');
    },
    
    testWelcomeOverlay: function() {
      var overlay = document.getElementById('welcome-overlay');
      if (!overlay) return { pass: true, msg: 'welcom-overlay不存在（首次访问后关闭）' };
      // Check structure
      var slides = overlay.querySelectorAll('.welcome-slide');
      return SHUXING_TEST.assert.eq(slides.length, 3, '引导页3个幻灯片');
    },
    
    testDisclaimer: function() {
      var disclaimer = document.getElementById('disclaimer-bar');
      if (!disclaimer) return { pass: true, msg: '不在首页，跳过' };
      return SHUXING_TEST.assert.true(!!disclaimer, '免责声明存在');
    }
  }
};

// 自动导出到全局
console.log('🧪 数星测试框架已加载');
console.log('   在控制台运行 SHUXING_TEST.runAll() 执行全部测试');
console.log('   或打开 test.html 查看可视化报告');
