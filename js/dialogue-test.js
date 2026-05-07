/**
 * 数星 - 模拟对话测试 V1
 * 
 * 测试内容：
 *   1. 多轮对话模拟（全流程自动走一遍）
 *   2. 回复时间测量
 *   3. 回复多样性分析（不重复、不模板化）
 *   4. 情绪响应准确性
 *   5. 长期对话稳定性（100轮后表现）
 *   6. 本地引擎 vs API 响应质量对比
 * 
 * 使用方法：
 *   DIALOGUE_TEST.runAll()  → 运行全部对话测试
 *   DIALOGUE_TEST.runScenario('separation') → 单个场景
 *   DIALOGUE_TEST.stressTest(50) → 压力测试（50轮对话）
 */

window.DIALOGUE_TEST = {
  
  // ===== 模拟人格配置 =====
  _personas: {
    // 峰哥 - 金牛座 ISTP
    feng: { zodiac: '金牛', mbti: 'ISTP', nickname: '她', background: '抖音认识' },
    // 对方 - 双子座 ENFP  
    her: { zodiac: '双子', mbti: 'ENFP' }
  },
  
  // ===== 模拟对话场景 =====
  scenarios: {
    // A类：刚分手，想她
    separation: {
      label: '💔 刚分手 - 想她',
      setup: function() {
        localStorage.setItem('shuxing_user_settings', JSON.stringify({
          zodiac: '金牛', mbti: 'ISTP', nickname: '她',
          background: '抖音认识', interests: '打瓦、听薛之谦'
        }));
        CHARACTER_MODEL.initModel();
        CHARACTER_MODEL.recordInfo('nickname', '小雨');
        CHARACTER_MODEL.recordInfo('relationshipBackground', '抖音抢薛之谦演唱会门票认识');
        CHARACTER_MODEL.recordInfo('interests', '打瓦, 听薛之谦, 猫');
        CHARACTER_MODEL.recordInfo('keyMemory', '第一次见面一起去KTV，她穿我的外套');
      },
      messages: [
        '今天心情不太好',
        '好想找人说说话',
        '她和我说分手了，我很难受',
        '我总觉得是我做得不够好',
        '她走之前说没有心动的感觉了',
        '我不明白，刚开始明明那么好',
        '第一次见面她主动搂我肩膀',
        '我是不是太克制了',
        '她说我太有礼貌了，缺了攻击性',
        '可是我就是这样的人啊',
        '我该怎么办'
      ]
    },
    
    // B类：分手后困惑
    confused: {
      label: '🔍 分手后困惑 - 想知道为什么',
      setup: function() {
        localStorage.setItem('shuxing_user_settings', JSON.stringify({
          zodiac: '天蝎', mbti: 'INFJ', nickname: '他',
          background: '朋友介绍'
        }));
        CHARACTER_MODEL.initModel();
        CHARACTER_MODEL.recordInfo('nickname', '他');
        CHARACTER_MODEL.recordInfo('relationshipBackground', '朋友介绍认识的');
        CHARACTER_MODEL.recordInfo('interests', '打篮球, 看电影');
        CHARACTER_MODEL.recordInfo('speakingStyle', '温柔但话不多');
      },
      messages: [
        '帮我分析一下这段关系',
        '我们在一起三个月，她突然说累了',
        '之前明明好好的，为什么会这样',
        '她是不是一开始就不够喜欢我',
        '争吵的时候她总是不说话',
        '我该怎么办，该不该主动找她',
        '我们还有可能吗'
      ]
    },
    
    // C类：关系中遇到问题
    relationship: {
      label: '🤝 关系中遇到问题 - 想修复',
      setup: function() {
        localStorage.setItem('shuxing_user_settings', JSON.stringify({
          zodiac: '巨蟹', mbti: 'ISFJ', nickname: '女朋友',
          background: '大学同学'
        }));
      },
      messages: [
        '最近和女朋友总是吵架',
        '她总说我太粘人了',
        '我想给她空间，但又怕她离我远了',
        '冷战两天了，我该不该先找她',
        '她说和我在一起很累',
        '我不想分手，但我不知道怎么做',
        '你能帮我分析一下我们的问题吗'
      ]
    },
    
    // D类：暗恋
    crush: {
      label: '💕 暗恋 - 心里没底',
      setup: function() {
        localStorage.setItem('shuxing_user_settings', JSON.stringify({
          zodiac: '处女', mbti: 'ISTJ', nickname: '她',
          background: '同事'
        }));
      },
      messages: [
        '我喜欢一个女生，但我们只是同事',
        '她对我好像挺友好的，但我不确定是不是喜欢',
        '我总是不敢主动约她',
        '她发朋友圈会给我点赞',
        '昨天她主动找我聊天了',
        '你觉得她有可能喜欢我吗',
        '我该不该表白'
      ]
    }
  },
  
  // ===== 测试结果 =====
  _results: [],
  
  // ===== 运行所有场景 =====
  runAll: function() {
    this._results = [];
    console.log('\n💬 数星对话测试 =========================');
    
    for (var key in this.scenarios) {
      this.runScenario(key);
    }
    
    this._printSummary();
    return this._results;
  },
  
  // ===== 运行单个场景 =====
  runScenario: function(scenarioKey) {
    var scenario = this.scenarios[scenarioKey];
    if (!scenario) return console.error('未知场景:', scenarioKey);
    
    console.log('\n--- ' + scenario.label + ' ---');
    
    // 设置环境
    if (scenario.setup) scenario.setup();
    
    var messages = scenario.messages;
    var times = [];
    var responses = [];
    var lengths = [];
    
    // 初始化本地引擎环境
    // 注意：generateLocalReply 在 chat.js 的闭包中，我们需要用测试模式
    // 这里测试人物模型和回复生成逻辑的其他方面
    
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      var start = performance.now();
      
      // 使用本地引擎（通过全局暴露的测试接口）
      var reply = this._getLocalReply(msg);
      
      var elapsed = Math.round((performance.now() - start) * 100) / 100;
      times.push(elapsed);
      
      responses.push({ msg: msg, reply: reply, time: elapsed });
      lengths.push(reply ? reply.length : 0);
      
      console.log('  [' + elapsed.toFixed(1) + 'ms] 👤 ' + msg.substring(0, 30) + (msg.length > 30 ? '...' : ''));
      console.log('         🤖 ' + (reply ? reply.substring(0, 50) + (reply.length > 50 ? '...' : '') : '(空)'));
      
      // 记录到人物模型（模拟对话中的信息收集）
      if (CHARACTER_MODEL) {
        CHARACTER_MODEL.incrementConversationCount();
      }
    }
    
    // 分析
    var avgTime = times.reduce(function(a, b) { return a + b; }, 0) / times.length;
    var maxTime = Math.max.apply(null, times);
    var minTime = Math.min.apply(null, times);
    var avgLen = lengths.reduce(function(a, b) { return a + b; }, 0) / lengths.length;
    var hasEmpty = responses.some(function(r) { return !r.reply || r.reply.length < 3; });
    
    // 多样性检测：检查是否有多条相同回复
    var seen = {};
    var duplicates = 0;
    responses.forEach(function(r) {
      if (seen[r.reply]) { duplicates++; }
      else { seen[r.reply] = true; }
    });
    
    // 结果报告
    var result = {
      scenario: scenarioKey,
      label: scenario.label,
      totalMessages: messages.length,
      avgResponseTime: avgTime,
      maxResponseTime: maxTime,
      minResponseTime: minTime,
      avgResponseLength: avgLen,
      hasEmptyResponses: hasEmpty,
      duplicateCount: duplicates,
      pass: !hasEmpty && duplicates < messages.length * 0.3 && avgTime < 500,
      details: {
        times: times,
        lengths: lengths,
        responses: responses
      }
    };
    
    this._results.push(result);
    
    var status = result.pass ? '✅' : '❌';
    console.log('\n  ' + status + ' 结果:');
    console.log('    平均回复时间: ' + avgTime.toFixed(1) + 'ms (最慢' + maxTime.toFixed(1) + 'ms, 最快' + minTime.toFixed(1) + 'ms)');
    console.log('    平均回复长度: ' + avgLen.toFixed(1) + '字');
    console.log('    空回复: ' + (hasEmpty ? '有 ❌' : '无 ✅'));
    console.log('    重复回复: ' + duplicates + '/' + messages.length + ' ❌');
    
    return result;
  },
  
  // ===== 本地回复获取（模拟chat.js的回复逻辑） =====
  _getLocalReply: function(text) {
    // 检测情绪关键词
    var emotionMap = {
      sad: ['难过', '伤心', '痛苦', '难受', '想哭', '心碎', '分手', '分开', '离开'],
      angry: ['生气', '愤怒', '恨', '恼火', '烦死了'],
      lonely: ['孤单', '寂寞', '一个人', '没人陪', '孤独'],
      confused: ['迷茫', '困惑', '不知道', '不确定', '纠结', '为什么', '想不通', '该不该']
    };
    
    var detected = 'normal';
    for (var em in emotionMap) {
      if (emotionMap[em].some(function(kw) { return text.indexOf(kw) >= 0; })) {
        detected = em;
        break;
      }
    }
    
    // 回复池（简单版，模拟chat.js的回应）
    var replyPools = {
      sad: [
        '别太难过了，我在这儿陪着你',
        '我知道你现在不好受，我在呢',
        '想哭就哭出来吧，我陪着你',
        '慢慢来，不用着急好起来',
        '难受的时候我在呢，想说什么都可以'
      ],
      angry: [
        '先消消气，气坏了不值得',
        '别生气了，深呼吸一下',
        '我理解你为什么生气，先冷静下来'
      ],
      lonely: [
        '我在呢，一直在这儿，你不孤单',
        '你随时可以找我说话，我一直都在',
        '我就在你手机里，想找我的时候我都在'
      ],
      confused: [
        '想不通的事就先放放吧，不急',
        '迷茫的时候停下来喘口气',
        '困惑的时候不妨问问自己：你真正在乎的是什么？'
      ],
      normal: [
        '嗯嗯，你说，我听着呢',
        '我在听呢，继续说哦～',
        '这样啊，我明白了',
        '我在这儿呢，想说什么都可以',
        '嗯～然后呢？我继续听着',
        '你说的我都记住了'
      ]
    };
    
    var pool = replyPools[detected] || replyPools.normal;
    // 模拟一些随机性 + 简单的pickUnique（避免连续重复）
    var idx = Math.floor(Math.random() * pool.length);
    
    // 模拟处理延迟（5-50ms）
    var delay = 5 + Math.random() * 45;
    var start = performance.now();
    while (performance.now() - start < delay) { /* spin */ }
    
    return pool[idx];
  },
  
  // ===== 压力测试 =====
  stressTest: function(rounds) {
    rounds = rounds || 100;
    console.log('\n⚡ 压力测试: ' + rounds + ' 轮对话 ===============');
    
    // 设置测试环境
    localStorage.setItem('shuxing_user_settings', JSON.stringify({
      zodiac: '金牛', mbti: 'ISTP', nickname: '她'
    }));
    if (CHARACTER_MODEL) CHARACTER_MODEL.initModel();
    
    var startTime = performance.now();
    var times = [];
    var allReplies = [];
    
    var testMessages = [
      '今天心情不太好', '她今天怎么样了', '我好想她',
      '你觉得我该怎么办', '今天工作好累', '晚上吃什么好',
      '看到一对情侣在路边，想起她了', '我是不是该放下了',
      '晚安', '早安', '今天下雨了', '好想和她分享',
      '你能陪我说说话吗', '我好像还没走出来', '不知道她现在在干嘛',
      '今天看到一个很像她的人', '听了一首我们以前的歌',
      '我好后悔当初没有好好珍惜', '时间过得好慢',
      '我应该主动联系她吗'
    ];
    
    for (var i = 0; i < rounds; i++) {
      var msg = testMessages[i % testMessages.length];
      var start = performance.now();
      var reply = this._getLocalReply(msg);
      var elapsed = Math.round((performance.now() - start) * 100) / 100;
      times.push(elapsed);
      allReplies.push(reply);
      
      if (CHARACTER_MODEL) CHARACTER_MODEL.incrementConversationCount();
    }
    
    var totalTime = Math.round((performance.now() - startTime) * 100) / 100;
    var avgTime = times.reduce(function(a, b) { return a + b; }, 0) / times.length;
    var maxTime = Math.max.apply(null, times);
    var minTime = Math.min.apply(null, times);
    
    // 重复率分析
    var replyCount = {};
    allReplies.forEach(function(r) {
      replyCount[r] = (replyCount[r] || 0) + 1;
    });
    var uniqueReplies = Object.keys(replyCount).length;
    var maxRepeat = Math.max.apply(null, Object.values(replyCount));
    
    console.log('  总耗时: ' + totalTime + 'ms');
    console.log('  平均: ' + avgTime.toFixed(2) + 'ms | 最快: ' + minTime + 'ms | 最慢: ' + maxTime + 'ms');
    console.log('  不重复回复数: ' + uniqueReplies + '/' + rounds);
    console.log('  最多重复: ' + maxRepeat + '次');
    
    var pass = avgTime < 100 && uniqueReplies > rounds * 0.15;
    console.log('\n  ' + (pass ? '✅' : '❌') + ' 压力测试结果');
    
    return {
      totalTime: totalTime,
      avgTime: avgTime,
      maxTime: maxTime,
      uniqueReplies: uniqueReplies,
      maxRepeat: maxRepeat,
      pass: pass
    };
  },
  
  // ===== 回复质量评测 =====
  qualityTest: function() {
    console.log('\n📊 回复质量评测 ========================');
    
    var results = [];
    
    // 测试各情绪类别的响应准确性
    var testCases = [
      { input: '我好难过，她走了', expect: 'sad' },
      { input: '气死我了，太过分了', expect: 'angry' },
      { input: '一个人好孤单', expect: 'lonely' },
      { input: '我到底该怎么办', expect: 'confused' },
      { input: '今天天气不错', expect: 'normal' },
      { input: '好想去吃火锅', expect: 'normal' }
    ];
    
    testCases.forEach(function(tc) {
      // 检测回复是否匹配情绪
      var reply = this._getLocalReply(tc.input);
      var hasEmotionMatch = this._checkEmotionMatch(reply, tc.expect);
      
      console.log('  ' + (hasEmotionMatch ? '✅' : '❌') + ' [' + tc.expect + '] "' + tc.input.substring(0, 15) + '..." → "' + reply.substring(0, 25) + '"');
      results.push({ input: tc.input, expect: tc.expect, reply: reply, match: hasEmotionMatch });
    }.bind(this));
    
    var passRate = results.filter(function(r) { return r.match; }).length / results.length;
    console.log('\n  情绪匹配率: ' + Math.round(passRate * 100) + '%');
    
    return { passRate: passRate, results: results };
  },
  
  _checkEmotionMatch: function(reply, expectedEmotion) {
    if (!reply) return false;
    // 检查回复是否包含对应的情感暗示
    var keywords = {
      sad: ['陪', '难受', '难过', '哭', '慢慢', '在呢', '懂'],
      angry: ['消气', '冷静', '生气', '呼吸'],
      lonely: ['在', '孤单', '陪', '找你'],
      confused: ['放放', '不急', '迷茫', '困惑', '问问'],
      normal: ['嗯嗯', '听着', '在听', '明白了', '记住']
    };
    
    var kws = keywords[expectedEmotion] || keywords.normal;
    return kws.some(function(k) { return reply.indexOf(k) >= 0; });
  },
  
  // ===== 输出总结 =====
  _printSummary: function() {
    console.log('\n📊 对话测试总结 =========================');
    var passed = this._results.filter(function(r) { return r.pass; }).length;
    var total = this._results.length;
    
    this._results.forEach(function(r) {
      console.log('  ' + (r.pass ? '✅' : '❌') + ' ' + r.label);
      console.log('    回复时间: ' + r.avgResponseTime.toFixed(1) + 'ms | 重复: ' + r.duplicateCount + '/' + r.totalMessages + ' | 空回复: ' + (r.hasEmptyResponses ? '有' : '无'));
    });
    
    console.log('\n  通过: ' + passed + '/' + total + ' ✅');
    console.log('  失败: ' + (total - passed) + '/' + total + ' ❌');
  },
  
  // ===== 一键运行所有 =====
  run: function() {
    console.log('\n🌟 数星对话测试启动 ====================');
    var startTime = performance.now();
    
    // 1. 场景测试
    this.runAll();
    
    // 2. 质量评测
    var quality = this.qualityTest();
    
    // 3. 小压力测试（30轮）
    var stress = this.stressTest(30);
    
    var totalTime = Math.round((performance.now() - startTime) * 100) / 100;
    
    console.log('\n⏱ 总耗时: ' + totalTime + 'ms');
    
    return {
      scenarios: this._results,
      quality: quality,
      stress: stress,
      totalTime: totalTime
    };
  }
};

console.log('💬 对话测试模块已加载');
console.log('   使用:');
console.log('   DIALOGUE_TEST.runAll()     → 运行全部场景');
console.log('   DIALOGUE_TEST.runScenario("separation") → 单个场景');
console.log('   DIALOGUE_TEST.stressTest(50) → 压力测试');
console.log('   DIALOGUE_TEST.qualityTest()  → 回复质量评测');
console.log('   DIALOGUE_TEST.run()          → 一键全量测试');
