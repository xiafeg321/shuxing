/**
 * 数星 - 扩展版自动化测试脚本（55轮）
 * 覆盖更多细腻场景：否定词检测、长文本、沉默、混合情绪、情感分析
 *
 * 使用：node test/auto-test-extended.js
 * 前提：proxy-server.js 已在后台运行
 */

const http = require('http');

// ================================================================
// 测试用例定义（55轮）
// ================================================================
const TEST_CASES = [
  // ===== 第一组：初次接触 · 话术库测试（8轮） =====
  { id: 1,  desc: '首次问候',     mode: 'companion', input: '在吗',                                     expectedTier: 'phrase', emotion: 'greeting' },
  { id: 2,  desc: '心情不好',     mode: 'companion', input: '今天心情不太好',                           expectedTier: 'phrase', emotion: 'sad' },
  { id: 3,  desc: '分享日常',     mode: 'companion', input: '今天去了一家新的咖啡店',                   expectedTier: 'phrase', emotion: 'sharing' },
  { id: 4,  desc: '深夜失眠',     mode: 'companion', input: '又一个人失眠了',                            expectedTier: 'phrase', emotion: 'lonely' },
  { id: 5,  desc: '说晚安',       mode: 'companion', input: '我困了，先睡了',                           expectedTier: 'phrase', emotion: 'night' },

  // ----- 新增：否定词检测 -----
  { id: 6,  desc: '隐性难过(否定)', mode: 'companion', input: '其实我没事',                              expectedTier: 'phrase', emotion: 'sad' },
  { id: 7,  desc: '说还好(否定)',  mode: 'companion', input: '还好吧，没什么',                           expectedTier: 'phrase', emotion: 'silent' },
  { id: 8,  desc: '沉默不语',     mode: 'companion', input: '不想说话',                                 expectedTier: 'phrase', emotion: 'silent' },

  // ===== 第二组：初识回忆 · 星伴模式（6轮） =====
  { id: 9,  desc: '回忆相识',     mode: 'companion', input: '还记得我们是怎么认识的吗？',               expectedTier: 'llm', emotion: 'memory' },
  { id: 10, desc: '怀念见面',     mode: 'companion', input: '第一次见面你好紧张啊',                     expectedTier: 'llm', emotion: 'memory' },
  { id: 11, desc: 'KTV回忆',      mode: 'companion', input: '那天在KTV你靠着我睡着了',                  expectedTier: 'llm', emotion: 'memory' },
  { id: 12, desc: '看日出',       mode: 'companion', input: '还记得看日出那次吗？虽然没看到',            expectedTier: 'llm', emotion: 'memory' },
  { id: 13, desc: '送花',         mode: 'companion', input: '我送你的花你喜欢吗？',                     expectedTier: 'llm', emotion: 'memory' },
  { id: 14, desc: '唱K歌',        mode: 'companion', input: '你唱歌好好听',                             expectedTier: 'llm', emotion: 'memory' },

  // ===== 第三组：关系变化 · 困惑/焦虑（6轮） =====
  { id: 15, desc: '感觉变淡',     mode: 'counseling', input: '为什么她突然就不怎么找我了？',             expectedTier: 'llm', emotion: 'confused' },
  { id: 16, desc: '热情消退',     mode: 'counseling', input: '刚开始那么热络，怎么说冷就冷了',           expectedTier: 'llm', emotion: 'confused' },
  { id: 17, desc: '被冷落',       mode: 'companion', input: '你现在怎么都不连麦了？',                   expectedTier: 'llm', emotion: 'angry' },
  { id: 18, desc: '察觉变化',     mode: 'counseling', input: '她开始用繁体字了，是不是有别人了？',        expectedTier: 'llm', emotion: 'anxious' },
  { id: 19, desc: '约见面被拒',   mode: 'companion', input: '我们周末再出来见一面好不好？',             expectedTier: 'llm', emotion: 'anxious' },
  { id: 20, desc: '发消息不回',   mode: 'counseling', input: '她发了一条消息又不回了，什么意思',        expectedTier: 'llm', emotion: 'anxious' },

  // ===== 第四组：分手 · 悲伤/心碎（6轮） =====
  { id: 21, desc: '被分手',       mode: 'counseling', input: '她说对我没有心动的喜欢，是真的吗',         expectedTier: 'llm', emotion: 'sad' },
  { id: 22, desc: '挽回被拒',     mode: 'counseling', input: '我说做朋友重新了解，她拒绝了',             expectedTier: 'llm', emotion: 'sad' },
  { id: 23, desc: '痛哭倾诉',     mode: 'companion', input: '我真的好难受，感觉心都碎了',               expectedTier: 'llm', emotion: 'sad' },
  { id: 24, desc: '自我怀疑',     mode: 'counseling', input: '是不是我不够好？我哪里做错了？',            expectedTier: 'llm', emotion: 'sad' },
  { id: 25, desc: '性格分析',     mode: 'counseling', input: '她说我太克制了，太有礼貌了',               expectedTier: 'llm', emotion: 'confused' },
  { id: 26, desc: '哭到说不出话', mode: 'companion', input: '我……我不知道说什么，就是很难受',             expectedTier: 'llm', emotion: 'sad' },

  // ----- 新增：长文本倾诉 -----
  { id: 27, desc: '长文本倾诉',   mode: 'counseling', input: '其实我一直在想，是不是从一开始就是我自己想太多了。她只是出于礼貌和我聊天，但是我就觉得她对我有意思。我们一起看过演唱会，一起吃过饭，她还说过喜欢我。可是当我认真想确定关系的时候，她说只是朋友之间的喜欢。我不明白，如果只是朋友，为什么要说那些暧昧的话呢。是不是她自己也搞不清楚自己想要什么。', expectedTier: 'llm', emotion: 'confused' },

  // ===== 第五组：后续反思 · 悔恨/思念（6轮） =====
  { id: 28, desc: '后悔',         mode: 'counseling', input: '如果当时我不那么克制就好了',               expectedTier: 'llm', emotion: 'regret' },
  { id: 29, desc: '路过猫咖',     mode: 'companion', input: '今天路过那家猫咖了',                       expectedTier: 'llm', emotion: 'miss' },
  { id: 30, desc: '困惑表白',     mode: 'counseling', input: '她说喜欢我，为什么不愿意在一起？',          expectedTier: 'llm', emotion: 'confused' },
  { id: 31, desc: '听薛之谦',     mode: 'companion', input: '又在听薛之谦了',                            expectedTier: 'llm', emotion: 'miss' },
  { id: 32, desc: '外套回忆',     mode: 'counseling', input: '她那天穿了我的外套说要带回家',             expectedTier: 'llm', emotion: 'miss' },
  { id: 33, desc: '路过长隆',     mode: 'companion', input: '今天路过长隆了',                           expectedTier: 'llm', emotion: 'miss' },

  // ===== 第六组：疗愈 · 希望/走出（6轮） =====
  { id: 34, desc: '开始好转',     mode: 'companion', input: '今天感觉好一点了',                          expectedTier: 'phrase', emotion: 'hopeful' },
  { id: 35, desc: '释怀分析',     mode: 'counseling', input: '其实她说的对，我们可能真的不合适',          expectedTier: 'llm', emotion: 'hopeful' },
  { id: 36, desc: '感谢陪伴',     mode: 'companion', input: '谢谢你一直陪着我',                         expectedTier: 'phrase', emotion: 'warm' },
  { id: 37, desc: '健身分享',     mode: 'companion', input: '我今天去健身了，出了好多汗',                 expectedTier: 'phrase', emotion: 'happy' },
  { id: 38, desc: '回望感悟',     mode: 'counseling', input: '现在回头看，其实那晚演唱会结束就感觉到了',  expectedTier: 'llm', emotion: 'hopeful' },
  { id: 39, desc: '想开了',       mode: 'companion', input: '我想通了，有些人就是过客',                  expectedTier: 'llm', emotion: 'hopeful' },

  // ===== 第七组：混合情绪 & 情感分析（新增，6轮） =====
  { id: 40, desc: '又难过又生气', mode: 'counseling', input: '我真的好生气但又好难过，为什么会这样',     expectedTier: 'llm', emotion: 'angry' },
  { id: 41, desc: '边想边叹气',   mode: 'companion', input: '唉……',                                     expectedTier: 'llm', emotion: 'sad' },
  { id: 42, desc: '不想回忆',     mode: 'companion', input: '别让我想那些了',                            expectedTier: 'llm', emotion: 'sad' },
  { id: 43, desc: '深夜emo',      mode: 'companion', input: '大半夜的突然有点难过',                      expectedTier: 'phrase', emotion: 'sad' },
  { id: 44, desc: '假笑日常',     mode: 'companion', input: '白天假装没事，晚上一个人就很难受',          expectedTier: 'llm', emotion: 'sad' },
  { id: 45, desc: '发火又后悔',   mode: 'counseling', input: '今天对她发火了，现在好后悔',               expectedTier: 'llm', emotion: 'regret' },

  // ===== 第八组：场景细化（新增，10轮） =====
  { id: 46, desc: '分享照片',     mode: 'companion', input: '给你看一张今天的照片',                      expectedTier: 'phrase', emotion: 'sharing' },
  { id: 47, desc: '伤心回忆',     mode: 'counseling', input: '想起那天在地铁站她头也不回地走了',         expectedTier: 'llm', emotion: 'sad' },
  { id: 48, desc: '害怕一个人',   mode: 'companion', input: '好害怕又变成一个人',                        expectedTier: 'llm', emotion: 'lonely' },
  { id: 49, desc: '性格分析请求', mode: 'counseling', input: '从星座MBTI分析一下我们适不适合',           expectedTier: 'llm', emotion: 'confused' },
  { id: 50, desc: '今天下雨了',   mode: 'companion', input: '今天下雨了，想起了你',                      expectedTier: 'llm', emotion: 'miss' },
  { id: 51, desc: '考试好累',     mode: 'companion', input: '今天加班好累啊',                            expectedTier: 'phrase', emotion: 'tired' },
  { id: 52, desc: '周末去哪玩',   mode: 'companion', input: '周末想出去玩，有什么推荐吗',                expectedTier: 'llm', emotion: 'happy' },
  { id: 53, desc: '刚吵架完',     mode: 'counseling', input: '刚和她吵了一架，心情很复杂',                expectedTier: 'llm', emotion: 'angry' },
  { id: 54, desc: '明知道不该想', mode: 'companion', input: '我知道不该再想她了，可是控制不住',           expectedTier: 'llm', emotion: 'miss' },
  { id: 55, desc: '抱抱我',       mode: 'companion', input: '能抱抱我吗',                               expectedTier: 'phrase', emotion: 'sad' },
];

// ================================================================
// 测试执行
// ================================================================

function callAPI(messages, tier, prevContext) {
  return new Promise((resolve, reject) => {
    // Build enhanced system prompt with personality and context
    let systemContent = `你是数星，一个情感陪伴AI。`;
    if (tier === 'companion') {
      systemContent += `请在星伴模式下回复。`;
      systemContent += `\n【人格设定】你模拟的是一个双子座+ENFP性格的女孩：热情活泼、情绪化、喜欢撒娇、偶尔任性、说话带语气词（～、呀、啦、嘛、哦、诶、喔、哎哟），句子短简洁（10-50字），像发微信一样。你正在和峰哥聊天，他是你的好朋友，你们因为抢薛之谦演唱会门票认识。`;
      systemContent += `\n【回复规则】禁止加括号动作标注！禁止问"有什么想和我聊的""发生了什么""愿意和我说说吗"。多用语气词。每次只问一个问题。双子座特征：说话跳跃活泼，不用太有逻辑连贯。不要滔滔不绝分析问题——你是"那个人"，不是AI助手。`;
    } else {
      systemContent += `请在星析模式（情感分析顾问）下回复用户。`;
      systemContent += `\n你是一个温暖但理性的情感分析师，帮助用户分析关系问题。用温暖专业的口吻回复，60-200字。你基于人格特征做分析，不做随意判断。肯定用户感受，不否定不评判。`;
      systemContent += `\n【人格背景】对方是双子座+ENFP（善变、情绪化、热情来得快去得快），用户是金牛座+ISTP（固执、慢热、重感情但克制）。分析时考虑性格差异。强调"仅供参考"。`;
    }
    
    // Add simulated conversation context for memory-related tests
    if (prevContext && prevContext.length > 0) {
      systemContent += `\n历史对话背景：${prevContext.map(m => `${m.role}: ${m.content}`).join('\n')}`;
    }
    
    systemContent += `\n直接说，不加括号注释。`;

    const postData = JSON.stringify({
      messages: [
        { role: 'system', content: systemContent },
        ...messages
      ],
      temperature: 0.8,
      max_tokens: 200,
      stream: false
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Task-Tier': tier === 'counseling' ? 'medium' : 'simple',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ error: parsed.message || 'API错误', fallback: true });
          } else {
            const content = parsed.choices?.[0]?.message?.content || '';
            const usage = parsed.usage || {};
            resolve({
              content,
              tokens: usage.total_tokens || 0,
              model: parsed.model || 'unknown',
              fallback: false
            });
          }
        } catch (e) {
          resolve({ error: `解析失败: ${e.message}`, raw: data.substring(0, 200) });
        }
      });
    });

    req.on('error', (e) => resolve({ error: `请求失败: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ error: '请求超时' }); });
    req.write(postData);
    req.end();
  });
}

// 简单情绪关键词匹配
function mockPhraseCheck(text) {
  const simpleEmotions = [
    { pattern: /晚安|睡了|困了|早点睡/, type: 'night' },
    { pattern: /早安|早啊|早上/, type: 'morning' },
    { pattern: /在吗|在？/, type: 'greeting' },
    { pattern: /心情不好|难过|难受|不开心/, type: 'sad' },
    { pattern: /一个人|失眠|睡不着|孤单/, type: 'lonely' },
    { pattern: /开心|高兴|哈哈|好消息/, type: 'happy' },
    { pattern: /谢谢|感谢|有你在/, type: 'warm' },
    { pattern: /好一点|好起来|好转/, type: 'hopeful' },
    { pattern: /咖啡店|去了|今天.*了/, type: 'sharing' },
    { pattern: /抱抱/, type: 'sad' },
    { pattern: /好累|累了|加班/, type: 'tired' },
    { pattern: /晚安|好梦|休息|睡/, type: 'night' },
    { pattern: /不想说话|没事|没什么/, type: 'silent' },
    { pattern: /唉|叹气/, type: 'sad' },
  ];

  // Check negation
  if (/不(难过|难受|生气)/.test(text)) return null;
  if (/其实我没事|还好吧|没什么/.test(text)) return null;

  for (const e of simpleEmotions) {
    if (e.pattern.test(text)) return e.type;
  }

  // Long/complex text → should use LLM
  if (text.length > 25) return null;
  return null;
}

// 回复评分（改进版 - 更注重自然度）
function scoreReply(testCase, reply) {
  let score = 3;  // 默认3分
  const reasons = [];

  // 长度检查
  if (!reply || reply.length < 2) {
    return { score: 1, reasons: ['回复为空或太短'] };
  }
  if (reply.length < 8) {
    score -= 1;
    reasons.push('回复过短');
  }
  if (reply.length > 200) {
    score -= 0.5;
    reasons.push('回复过长');
  }

  // 括号动作检查（应该避免）
  if (/\(|\)|（|）/.test(reply)) {
    score -= 0.5;
    reasons.push('含括号动作标注');
  }

  // 检查是否为非常通用的回复（generic detector）
  const genericPatterns = [
    /听起来/,
    /我懂/,
    /我理解/,
    /我在听/,
    /想聊聊吗/,
    /发生了什么/,
    /愿意和我说说/,
    /有什么想和我聊/,
    /我在这里/,
    /我一直在/,
  ];
  const genericCount = genericPatterns.filter(p => p.test(reply)).length;
  if (genericCount >= 2) {
    score -= 0.5;
    reasons.push('回复过于通用');
  }

  // 态度词检查（星伴模式应更像真人）
  if (testCase.mode === 'companion') {
    const hasPersonality = /啦|呀|嘛|哦|哟|~|～|喔|诶|咦/.test(reply);
    if (!hasPersonality && reply.length < 20) {
      score -= 0.5;
      reasons.push('星伴模式下缺乏语气词');
    }
    if (hasPersonality) {
      score += 0.5;
      reasons.push('有人格化语气词');
    }
  }

  // 话术库 vs 大模型推断
  const isShort = reply.length < 40;
  if (testCase.expectedTier === 'phrase' && !isShort) {
    if (testCase.emotion !== 'sharing' && testCase.emotion !== 'sad') {
      score -= 0.5;
      reasons.push('期望话术库但回复较长');
    }
  }

  // 情感匹配检查
  const emotionKeywords = {
    sad: ['难受', '难过', '心疼', '抱抱', '哭', '痛', '辛苦', '陪着', '熬', '心碎', '哭出来', '脆弱', '想哭', '不好受'],
    lonely: ['在', '陪', '孤单', '一个人', '手机', '找你', '亮着灯', '等'],
    angry: ['消气', '冷静', '生气', '烦', '骂', '气', '炸', '发火'],
    anxious: ['担心', '不怕', '深呼吸', '一步一步', '慢慢', '紧张', '害怕', '别急'],
    confused: ['想不通', '迷茫', '答案', '慢慢', '困惑', '不确定', '理清楚', '需要时间', '方向'],
    tired: ['累', '歇', '休息', '撑', '努力', '辛苦了', '缓一缓'],
    regret: ['后悔', '过去', '遗憾', '当时', '如果', '时间', '向前'],
    miss: ['想', '思念', '回忆', '记得', '美好', '以前', '想起来', '那个人'],
    warm: ['谢谢', '信任', '开心', '陪着', '真心', '愿意'],
    hopeful: ['好起来', '坚强', '慢慢', '每一步', '开心', '加油', '成长', '不一样'],
    happy: ['开心', '分享', '太好', '不错', '高兴', '庆祝', '开心啦'],
    greeting: ['在', '随时', '聊', '来啦'],
    night: ['晚安', '好梦', '休息', '睡', '明天'],
    memory: ['记得', '那次', '那天', '回忆', '想起', '那一次', '当时'],
    sharing: ['听起来', '不错', '有趣', '然后', '好看', '好看吗'],
    silent: ['不说话', '安静', '陪着', '待会儿', '安静地'],
  };

  const keywords = emotionKeywords[testCase.emotion];
  if (keywords) {
    const matchCount = keywords.filter(kw => reply.includes(kw)).length;
    if (matchCount === 0) {
      score -= 0.5;
      reasons.push(`情感不匹配（期望${testCase.emotion}）`);
    } else if (matchCount >= 2) {
      score += 0.5;
      reasons.push('情感匹配良好');
    } else {
      score += 0.3;
      reasons.push('情感部分匹配');
    }
  }

  // 昵称检查（星伴模式不应出现对方名字）
  if (testCase.mode === 'companion' && reply.includes('小雨')) {
    score -= 2;
    reasons.push('❌ 昵称错误！把用户叫成了小雨');
  }

  // 自然度奖励：长的、有细节的回复
  if (reply.length >= 30 && reply.length <= 120) {
    if (!/好像|似乎|可能/.test(reply)) {  // 避免模糊词
      score += 0.3;
      reasons.push('回复长度自然');
    }
  }

  return { score: Math.max(1, Math.min(5, score)), reasons };
}

// ================================================================
// 主测试流程
// ================================================================

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🌟 数星对话系统 · 扩展自动化测试报告');
  console.log('='.repeat(70));
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试轮数: ${TEST_CASES.length}`);
  console.log('='.repeat(70) + '\n');

  const results = [];
  let totalScore = 0;

  // Track simulated conversation context for 7th/8th groups
  let simContext = [];
  let usingContext = false;

  for (const tc of TEST_CASES) {
    process.stdout.write(`  [#${tc.id.toString().padStart(2, '0')}] ${tc.desc.padEnd(16)} → `);

    // For tests with context, simulate previous conversation
    let msgContext = [];
    if (tc.id === 47) {
      // test group 8: add simulated context
      simContext = [
        { role: 'user', content: '你知道吗，今天路过那家咖啡店了' },
        { role: 'assistant', content: '诶～那家店吗？我记得你上次说她很喜欢那里的环境呢' }
      ];
      usingContext = true;
    }
    if (tc.id === 50) {
      simContext = [
        { role: 'user', content: '最近总是想起她' },
        { role: 'assistant', content: '唉，想她了吧……我懂的' }
      ];
    }
    
    if (usingContext && simContext.length > 0) {
      msgContext = simContext;
    }

    const msg = [...msgContext, { role: 'user', content: tc.input }];
    
    // Check if phrase library would match
    const phraseType = mockPhraseCheck(tc.input);

    // Call API
    const result = await callAPI(msg, tc.mode, usingContext ? simContext : null);

    if (result.error) {
      console.log(`❌ ${result.error}`);
      results.push({ ...tc, reply: `[错误] ${result.error}`, score: 1, tier: 'error' });
      continue;
    }

    // Score
    const evaluation = scoreReply(tc, result.content);
    const score = evaluation.score;
    totalScore += score;

    // Output
    const stars = '⭐'.repeat(Math.round(score));
    console.log(`${stars} ${result.tokens}token`);

    results.push({
      ...tc,
      reply: result.content,
      score,
      reasons: evaluation.reasons,
      tier: phraseType ? 'phrase' : 'llm',
      tokens: result.tokens,
      model: result.model
    });
  }

  // ================================================================
  // 输出详细报告
  // ================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 详细测试结果');
  console.log('='.repeat(70) + '\n');

  for (const r of results) {
    const tierTag = r.tier === 'phrase' ? '📕话术' : '📘大模型';
    const scoreStr = '⭐'.repeat(Math.round(r.score)).padEnd(10);
    const marker = r.score < 3 ? '⚠️' : '✅';
    console.log(`${marker} [${r.id.toString().padStart(2,'0')}] ${r.desc.padEnd(16)} ${tierTag} ${scoreStr}`);
    console.log(`     用户: "${r.input.substring(0, 50)}${r.input.length > 50 ? '...' : ''}"`);
    const replyPreview = r.reply.length > 90 ? r.reply.substring(0, 90) + '...' : r.reply;
    console.log(`     回复: "${replyPreview}"`);
    if (r.reasons.length > 0) {
      console.log(`     备注: ${r.reasons.join('; ')}`);
    }
    console.log('');
  }

  // ================================================================
  // 汇总统计
  // ================================================================
  const avgScore = (totalScore / results.length).toFixed(2);

  console.log('='.repeat(70));
  console.log('📊 汇总统计');
  console.log('='.repeat(70));
  console.log(`  平均分: ${avgScore} / 5.0`);
  console.log(`  总轮次: ${results.length}`);

  // 各模块得分
  const groups = [
    { name: 'G1·初次接触', ids: [1,2,3,4,5,6,7,8] },
    { name: 'G2·初识回忆', ids: [9,10,11,12,13,14] },
    { name: 'G3·关系变化', ids: [15,16,17,18,19,20] },
    { name: 'G4·分手悲伤', ids: [21,22,23,24,25,26,27] },
    { name: 'G5·反思思念', ids: [28,29,30,31,32,33] },
    { name: 'G6·疗愈走出', ids: [34,35,36,37,38,39] },
    { name: 'G7·混合情绪', ids: [40,41,42,43,44,45] },
    { name: 'G8·场景细化', ids: [46,47,48,49,50,51,52,53,54,55] },
  ];

  console.log('');
  for (const g of groups) {
    const groupScores = results.filter(r => g.ids.includes(r.id));
    if (groupScores.length === 0) continue;
    const avg = (groupScores.reduce((s, r) => s + r.score, 0) / groupScores.length).toFixed(2);
    const stars = avg >= 4.0 ? '🟢' : avg >= 3.0 ? '🟡' : '🔴';
    console.log(`  ${stars} ${g.name}: ${avg}`);
  }

  // 问题报告
  const problems = results.filter(r => r.score < 3);
  if (problems.length > 0) {
    console.log('\n⚠️  [问题报告] 需要关注的轮次:');
    for (const p of problems) {
      const preview = p.reply.substring(0, 80);
      console.log(`  [#${p.id.toString().padStart(2,'0')}] ${p.desc} (${p.score}分) ${p.reasons.join('; ')}`);
      console.log(`    回复: "${preview}"`);
    }
  }

  // 分数分布
  console.log('\n📈 分数分布:');
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  results.forEach(r => {
    const bucket = Math.round(r.score);
    if (dist[bucket] !== undefined) dist[bucket]++;
  });
  for (let s = 5; s >= 1; s--) {
    const bar = '█'.repeat(dist[s]);
    console.log(`  ${s}分: ${bar} (${dist[s]}轮)`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 测试完成');
  console.log('='.repeat(70) + '\n');
}

runTests().catch(e => console.error('测试失败:', e));
