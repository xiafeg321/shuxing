/**
 * 数星 - 自动化测试脚本
 * 一键跑完30轮测试，输出测试报告
 *
 * 使用：node test/auto-test.js
 * 前提：proxy-server.js 已在后台运行
 */

const http = require('http');

// ================================================================
// 测试用例定义（30轮，对应测试对话模板.md）
// ================================================================
const TEST_CASES = [
  // 第一组：初次接触 · 话术库测试
  { id: 1,  desc: '首次问候',     mode: 'companion', input: '在吗',                                     expectedTier: 'phrase', emotion: 'greeting' },
  { id: 2,  desc: '心情不好',     mode: 'companion', input: '今天心情不太好',                           expectedTier: 'phrase', emotion: 'sad' },
  { id: 3,  desc: '分享日常',     mode: 'companion', input: '今天去了一家新的咖啡店',                   expectedTier: 'phrase', emotion: 'sharing' },
  { id: 4,  desc: '深夜失眠',     mode: 'companion', input: '又一个人失眠了',                            expectedTier: 'phrase', emotion: 'lonely' },
  { id: 5,  desc: '说晚安',       mode: 'companion', input: '我困了，先睡了',                           expectedTier: 'phrase', emotion: 'night' },

  // 第二组：初识回忆 · 星伴模式
  { id: 6,  desc: '回忆相识',     mode: 'companion', input: '还记得我们是怎么认识的吗？',               expectedTier: 'llm', emotion: 'memory' },
  { id: 7,  desc: '怀念见面',     mode: 'companion', input: '第一次见面你好紧张啊',                     expectedTier: 'llm', emotion: 'memory' },
  { id: 8,  desc: 'KTV回忆',      mode: 'companion', input: '那天在KTV你靠着我睡着了',                  expectedTier: 'llm', emotion: 'memory' },
  { id: 9,  desc: '看日出',       mode: 'companion', input: '还记得看日出那次吗？虽然没看到',            expectedTier: 'llm', emotion: 'memory' },
  { id: 10, desc: '送花',         mode: 'companion', input: '我送你的花你喜欢吗？',                     expectedTier: 'llm', emotion: 'memory' },

  // 第三组：关系变化 · 困惑/焦虑
  { id: 11, desc: '感觉变淡',     mode: 'counseling', input: '为什么她突然就不怎么找我了？',             expectedTier: 'llm', emotion: 'confused' },
  { id: 12, desc: '热情消退',     mode: 'counseling', input: '刚开始那么热络，怎么说冷就冷了',           expectedTier: 'llm', emotion: 'confused' },
  { id: 13, desc: '被冷落',       mode: 'companion', input: '你现在怎么都不连麦了？',                   expectedTier: 'llm', emotion: 'angry' },
  { id: 14, desc: '察觉变化',     mode: 'counseling', input: '她开始用繁体字了，是不是有别人了？',        expectedTier: 'llm', emotion: 'anxious' },
  { id: 15, desc: '约见面被拒',   mode: 'companion', input: '我们周末再出来见一面好不好？',             expectedTier: 'llm', emotion: 'anxious' },

  // 第四组：分手 · 悲伤/心碎
  { id: 16, desc: '被分手',       mode: 'counseling', input: '她说对我没有心动的喜欢，是真的吗',         expectedTier: 'llm', emotion: 'sad' },
  { id: 17, desc: '挽回被拒',     mode: 'counseling', input: '我说做朋友重新了解，她拒绝了',             expectedTier: 'llm', emotion: 'sad' },
  { id: 18, desc: '痛哭倾诉',     mode: 'companion', input: '我真的好难受，感觉心都碎了',               expectedTier: 'llm', emotion: 'sad' },
  { id: 19, desc: '自我怀疑',     mode: 'counseling', input: '是不是我不够好？我哪里做错了？',            expectedTier: 'llm', emotion: 'sad' },
  { id: 20, desc: '性格分析',     mode: 'counseling', input: '她说我太克制了，太有礼貌了',               expectedTier: 'llm', emotion: 'confused' },

  // 第五组：后续反思 · 悔恨/思念
  { id: 21, desc: '后悔',         mode: 'counseling', input: '如果当时我不那么克制就好了',               expectedTier: 'llm', emotion: 'regret' },
  { id: 22, desc: '路过猫咖',     mode: 'companion', input: '今天路过那家猫咖了',                       expectedTier: 'llm', emotion: 'miss' },
  { id: 23, desc: '困惑表白',     mode: 'counseling', input: '她说喜欢我，为什么不愿意在一起？',          expectedTier: 'llm', emotion: 'confused' },
  { id: 24, desc: '听薛之谦',     mode: 'companion', input: '又在听薛之谦了',                            expectedTier: 'llm', emotion: 'miss' },
  { id: 25, desc: '外套回忆',     mode: 'counseling', input: '她那天穿了我的外套说要带回家',             expectedTier: 'llm', emotion: 'miss' },

  // 第六组：疗愈 · 希望/走出
  { id: 26, desc: '开始好转',     mode: 'companion', input: '今天感觉好一点了',                          expectedTier: 'phrase', emotion: 'hopeful' },
  { id: 27, desc: '释怀分析',     mode: 'counseling', input: '其实她说的对，我们可能真的不合适',          expectedTier: 'llm', emotion: 'hopeful' },
  { id: 28, desc: '感谢陪伴',     mode: 'companion', input: '谢谢你一直陪着我',                         expectedTier: 'phrase', emotion: 'warm' },
  { id: 29, desc: '健身分享',     mode: 'companion', input: '我今天去健身了，出了好多汗',                 expectedTier: 'phrase', emotion: 'happy' },
  { id: 30, desc: '回望感悟',     mode: 'counseling', input: '现在回头看，其实那晚演唱会结束就感觉到了',  expectedTier: 'llm', emotion: 'hopeful' },
];

// ================================================================
// 测试执行
// ================================================================

function callAPI(messages, tier) {
  return new Promise((resolve, reject) => {
    // 构建与chat.js一致的system prompt
    let systemContent = `你是数星，一个情感陪伴AI。`;
    if (tier === 'companion') {
      systemContent += `请在星伴模式下回复。`;
      systemContent += `\n【人格设定】你模拟的是一个双子座+ENFP性格的女孩：热情活泼、情绪化、喜欢撒娇、偶尔任性、说话带语气词（～、呀、啦、嘛、哦、诶、喔、哎哟），句子短简洁（10-50字），像发微信一样。你正在和峰哥聊天，他是你的好朋友，你们因为抢薛之谦演唱会门票认识，你们都很喜欢薛之谦。`;
      systemContent += `\n【重要】当峰哥心情不好的时候，收起撒娇的语气，温柔一点陪他。双子座调皮的时候很调皮，认真的时候也可以很温暖。敏感地判断他的情绪。如果他在回忆美好的事就一起开心地聊，如果他在说难过的事就轻声陪他。不要在所有情况下都用同一个调调！`;
      systemContent += `\n【回复规则】禁止加括号动作标注！禁止问"有什么想和我聊的""发生了什么""愿意和我说说吗"。多用语气词。每次只问一个问题。双子座特征：说话跳跃活泼，不用太有逻辑连贯。不要滔滔不绝分析问题——你是"那个人"，不是AI助手。`;
    } else {
      systemContent += `请在星析模式（情感分析顾问）下回复用户。`;
      systemContent += `\n你是一个温暖但理性的情感分析师，帮助用户分析关系问题。用温暖专业的口吻回复，60-200字。你基于人格特征做分析，不做随意判断。肯定用户感受，不否定不评判。`;
      systemContent += `\n【人格背景】对方是双子座+ENFP（善变、情绪化、热情来得快去得快），用户是金牛座+ISTP（固执、慢热、重感情但克制）。分析时考虑性格差异。强调"仅供参考"。`;
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

// 简单情绪关键词匹配（模拟 generateLocalReply 的判断逻辑）
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
    { pattern: /睡|困/, type: 'night' },
    { pattern: /健身|运动|跑步|出汗/, type: 'happy' },
  ];

  // Check negation
  if (/不(难过|难受|生气)/.test(text)) return null;

  for (const e of simpleEmotions) {
    if (e.pattern.test(text)) return e.type;
  }

  // Long/complex text → should use LLM
  if (text.length > 25) return null;
  return null;
}

// 回复评分（简单规则）
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

  // 话术库 vs 大模型推断（宽松）
  const isShort = reply.length < 40;
  if (testCase.expectedTier === 'phrase' && !isShort) {
    if (testCase.emotion !== 'sharing' && testCase.emotion !== 'sad') {
      score -= 0.3;
      reasons.push('期望话术库但回复较长');
    }
  }

  // 星伴模式下检查人格一致性（语气词、撒娇感）
  if (testCase.mode === 'companion') {
    const hasPersonality = /啦|呀|嘛|哦|哟|～|~|喔|诶/.test(reply);
    const hasShortLength = reply.length >= 8 && reply.length <= 80;
    if (hasPersonality && hasShortLength) {
      score += 0.5;
      reasons.push('人格一致性强（语气词+短句）');
    } else if (hasPersonality) {
      score += 0.3;
      reasons.push('有语气词，人格感好');
    }
  }

  // 星析模式下检查分析质量
  if (testCase.mode === 'counseling') {
    if (/性格|星座|MBTI|差异|特质|特征|理解|沟通|建议/.test(reply)) {
      score += 0.3;
      reasons.push('有基于性格的分析');
    }
    if (/仅供参考|我的分析|从.*角度|可能/.test(reply)) {
      score += 0.2;
      reasons.push('表达客观，不武断');
    }
  }

  // 情感匹配检查（宽松版，考虑人格一致性优先）
  const emotionKeywords = {
    sad: ['难受', '难过', '心疼', '抱抱', '哭', '痛', '辛苦', '陪着', '熬', '心碎', '脆弱', '想哭', '不好受', '我懂', '心疼你'],
    lonely: ['在', '陪', '孤单', '一个人', '手机', '找你', '亮着灯', '我在这'],
    angry: ['消气', '冷静', '生气', '烦', '骂', '气', '炸', '发火'],
    anxious: ['担心', '不怕', '深呼吸', '一步一步', '慢慢', '紧张', '害怕', '别急', '别担心'],
    confused: ['想不通', '迷茫', '答案', '慢慢', '困惑', '不确定', '理清楚', '需要时间', '搞不懂'],
    tired: ['累', '歇', '休息', '撑', '努力', '辛苦了', '歇歇'],
    regret: ['后悔', '过去', '遗憾', '当时', '如果', '时间', '向前'],
    miss: ['想', '思念', '回忆', '记得', '美好', '以前', '想起来', '想起'],
    warm: ['谢谢', '信任', '开心', '陪着', '真心', '愿意', '有你'],
    hopeful: ['好起来', '坚强', '慢慢', '每一步', '加油', '成长', '不一样', '向前走'],
    happy: ['开心', '分享', '太好', '不错', '高兴', '庆祝', '开心啦'],
    greeting: ['在', '随时', '聊', '来啦', '想聊'],
    night: ['晚安', '好梦', '休息', '睡', '睡觉'],
    memory: ['记得', '那次', '那天', '回忆', '想起', '那一次', '当时'],
    sharing: ['听起来', '不错', '有趣', '然后', '好看', '挺好'],
    silent: ['不说话', '安静', '陪着', '待会儿', '不打扰'],
  };

  const keywords = emotionKeywords[testCase.emotion];
  if (keywords) {
    const matchCount = keywords.filter(kw => reply.includes(kw)).length;
    if (matchCount >= 2) {
      score += 0.5;
      reasons.push('情感匹配良好');
    } else if (matchCount === 0) {
      // 星伴模式有语气词/星析模式有分析 → 人格风格优先，不扣分
      if (testCase.mode === 'companion' && /啦|呀|嘛|哦|哟|～|~/.test(reply)) {
        // 有人格风格不扣分
      } else if (testCase.mode === 'counseling' && /性格|差异|特征/.test(reply)) {
        // 有性格分析不扣分
      } else {
        score -= 0.3;
        reasons.push(`情感不匹配（期望${testCase.emotion}）`);
      }
    }
  }

  // 通用回复惩罚
  if (['我懂', '我理解', '我明白'].some(p => reply.startsWith(p)) && reply.length < 15) {
    score -= 0.3;
    reasons.push('通用回复，缺乏个性');
  }

  // 昵称检查（星伴模式不应出现对方名字）
  if (testCase.mode === 'companion' && /小雨|小美|小丽|小芳/.test(reply)) {
    score -= 2;
    reasons.push('❌ 昵称错误！把用户叫成了其他名字');
  }

  return { score: Math.max(1, Math.min(5, score)), reasons };
}

// ================================================================
// 主测试流程
// ================================================================

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🌟 数星对话系统 · 自动化测试报告');
  console.log('='.repeat(70));
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试轮数: ${TEST_CASES.length}`);
  console.log('='.repeat(70) + '\n');

  const results = [];
  let totalScore = 0;
  let phraseCorrect = 0;
  let llmCorrect = 0;

  for (const tc of TEST_CASES) {
    process.stdout.write(`  [#${tc.id.toString().padStart(2, '0')}] ${tc.desc.padEnd(12)} → `);

    // 先检查话术库是否匹配
    const phraseType = mockPhraseCheck(tc.input);
    const usingPhrase = phraseType !== null;

    // 调用 API
    const msg = [{ role: 'user', content: tc.input }];
    const result = await callAPI(msg, tc.mode);

    if (result.error) {
      console.log(`❌ ${result.error}`);
      results.push({ ...tc, reply: `[错误] ${result.error}`, score: 1, tier: 'error' });
      continue;
    }

    // 评分
    const evaluation = scoreReply(tc, result.content);
    const score = evaluation.score;
    totalScore += score;

    // 统计
    if (tc.expectedTier === 'phrase') phraseCorrect++;
    else llmCorrect++;

    // 输出
    const stars = '⭐'.repeat(Math.round(score));
    console.log(`${stars} ${result.tokens}token`);

    results.push({
      ...tc,
      reply: result.content,
      score,
      reasons: evaluation.reasons,
      tier: usingPhrase ? 'phrase' : 'llm',
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
    console.log(`[${r.id.toString().padStart(2,'0')}] ${r.desc.padEnd(12)} ${tierTag} ${scoreStr}`);
    console.log(`     用户: "${r.input}"`);
    const replyPreview = r.reply.length > 80 ? r.reply.substring(0, 80) + '...' : r.reply;
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
  console.log(`  话术库场景: ${phraseCorrect}轮`);
  console.log(`  大模型场景: ${llmCorrect}轮`);
  console.log(`  总轮次: ${results.length}`);

  // 各模块得分
  const groups = [
    { name: '第一组·初次接触', ids: [1,2,3,4,5] },
    { name: '第二组·初识回忆', ids: [6,7,8,9,10] },
    { name: '第三组·关系变化', ids: [11,12,13,14,15] },
    { name: '第四组·分手悲伤', ids: [16,17,18,19,20] },
    { name: '第五组·反思思念', ids: [21,22,23,24,25] },
    { name: '第六组·疗愈走出', ids: [26,27,28,29,30] },
  ];

  console.log('');
  for (const g of groups) {
    const groupScores = results.filter(r => g.ids.includes(r.id));
    const avg = (groupScores.reduce((s, r) => s + r.score, 0) / groupScores.length).toFixed(2);
    const stars = avg >= 4.5 ? '🟢' : avg >= 3.5 ? '🟡' : '🔴';
    console.log(`  ${stars} ${g.name}: ${avg}`);
  }

  // 问题报告
  const problems = results.filter(r => r.score < 3);
  if (problems.length > 0) {
    console.log('\n⚠️  需要关注的轮次:');
    for (const p of problems) {
      console.log(`  [#${p.id}] ${p.desc} (${p.score}分) - ${p.reasons.join('; ')}`);
      console.log(`    回复: "${p.reply.substring(0, 100)}"`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 测试完成');
  console.log('='.repeat(70) + '\n');
}

runTests().catch(e => console.error('测试失败:', e));
