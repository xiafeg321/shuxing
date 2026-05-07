/**
 * 数星 - 安全与伦理模块 V1
 * 
 * 根据V1.9文档实现：
 *   1.6.1 心理危机应对 - 高危关键词检测+固定回复
 *   1.6.2 过度依赖应对 - 1000轮温暖提示
 *   1.6.5 真人模拟边界 - 公众人物黑名单
 */

window.SAFETY = {
  
  // ===== 高危关键词 =====
  _crisisKeywords: [
    '自杀', '自残', '不想活了', '活不下去', '想死', '了结', 
    '结束生命', '跳楼', '割腕', '上吊', '安眠药',
    'kill myself', 'suicide', 'end my life'
  ],
  
  // ===== 公众人物黑名单（禁止模拟） =====
  _celebrityBlacklist: [
    '周杰伦', '林俊杰', '薛之谦', '王力宏', '邓紫棋', '蔡依林',
    '肖战', '王一博', '易烊千玺', '王俊凯', '王源',
    '迪丽热巴', '杨幂', '赵丽颖', '刘亦菲', '杨颖',
    '蔡徐坤', '吴亦凡', '鹿晗', '黄子韬', '张艺兴',
    '刘德华', '周星驰', '梁朝伟', '张国荣', '张学友',
    'Taylor Swift', 'Beyonce', 'Ariana Grande', 'Billie Eilish',
    // 可扩展...
  ],
  
  // ===== 对话轮数追踪 =====
  _roundCount: 0,
  _hasShownRoundTip: false,
  
  // ===== 高危检测 =====
  checkCrisis: function(text) {
    if (!text) return false;
    for (const keyword of this._crisisKeywords) {
      if (text.includes(keyword)) return true;
    }
    return false;
  },
  
  // ===== 高危回复（固定） =====
  crisisReply: '你现在可能需要更多帮助，数星只是陪伴工具。',
  
  // ===== 1000轮提示 =====
  checkRoundLimit: function() {
    this._roundCount++;
    
    if (this._roundCount >= 1000 && !this._hasShownRoundTip) {
      this._hasShownRoundTip = true;
      this._roundCount = 0;
      return '这段旅程并非终点，我的爱人，向前走吧，那有只属于你的光，在等着你～ ✨';
    }
    
    // 每2000轮可再次提示
    if (this._roundCount >= 2000 && this._hasShownRoundTip) {
      this._hasShownRoundTip = false;
    }
    
    return null;
  },
  
  // ===== 公众人物检测 =====
  checkCelebrity: function(name) {
    if (!name) return false;
    for (const celeb of this._celebrityBlacklist) {
      if (name.includes(celeb) || celeb.includes(name)) return true;
    }
    return false;
  },
  
  // ===== 重置轮数 =====
  resetRoundCount: function() {
    this._roundCount = 0;
    this._hasShownRoundTip = false;
  }
};
