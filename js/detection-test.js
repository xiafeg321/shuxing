/**
 * 数星 - 用户类型自动识别测试（文档1.5.3节补充）
 * 独立于主测试框架，用 window.SHUXING_TEST 的断言工具
 */

(function() {
  if (!window.SHUXING_TEST) {
    console.warn('⚠️ 主测试框架未加载，跳过用户类型测试');
    return;
  }
  
  var T = SHUXING_TEST;
  var assert = T.assert;
  
  // 注册到测试框架的 Detection 分类
  T.Detection = {
    testModuleExists: function() {
      return assert.true(!!window.autoDetectUserType, 'autoDetectUserType模块存在');
    },
    
    testDetectA: function() {
      if (!window.autoDetectUserType) return { pass: false, msg: '模块未加载' };
      window.autoDetectUserType.reset();
      window.autoDetectUserType.analyze('我们刚分手，我好想她');
      window.autoDetectUserType.analyze('她走了，我很难过');
      var result = window.autoDetectUserType.analyze('她为什么离开我');
      return assert.eq(result, 'separation', 'A类（刚分手）被识别');
    },
    
    testDetectB: function() {
      if (!window.autoDetectUserType) return { pass: false, msg: '模块未加载' };
      window.autoDetectUserType.reset();
      window.autoDetectUserType.analyze('我想搞清楚为什么分开');
      window.autoDetectUserType.analyze('问题到底出在哪里');
      var result = window.autoDetectUserType.analyze('我哪里做错了');
      return assert.eq(result, 'confused', 'B类（困惑）被识别');
    },
    
    testDetectC: function() {
      if (!window.autoDetectUserType) return { pass: false, msg: '模块未加载' };
      window.autoDetectUserType.reset();
      window.autoDetectUserType.analyze('我们还在在一起，但总吵架');
      window.autoDetectUserType.analyze('异地好累，关系变淡了');
      var result = window.autoDetectUserType.analyze('该怎么挽救这段关系');
      return assert.eq(result, 'relationship', 'C类（关系问题）被识别');
    },
    
    testDetectD: function() {
      if (!window.autoDetectUserType) return { pass: false, msg: '模块未加载' };
      window.autoDetectUserType.reset();
      window.autoDetectUserType.analyze('我喜欢一个同事，但不确定她心意');
      window.autoDetectUserType.analyze('她对我挺好的，是不是也有好感');
      var result = window.autoDetectUserType.analyze('我该不该表白');
      return assert.eq(result, 'crush', 'D类（暗恋）被识别');
    },
    
    testNoPrematureDetection: function() {
      if (!window.autoDetectUserType) return { pass: false, msg: '模块未加载' };
      window.autoDetectUserType.reset();
      var r1 = window.autoDetectUserType.analyze('今天天气不错');
      var r2 = window.autoDetectUserType.analyze('昨晚睡得还行');
      var r3 = window.autoDetectUserType.analyze('中午吃了碗面');
      return assert.true(r1 === null && r2 === null && r3 === null, '前3轮不误判');
    },
    
    testLocalStoragePersistence: function() {
      if (!window.autoDetectUserType) return { pass: false, msg: '模块未加载' };
      window.autoDetectUserType.reset();
      window.autoDetectUserType.analyze('我们刚分手了');
      window.autoDetectUserType.analyze('我好想她');
      window.autoDetectUserType.analyze('她为什么要离开');
      var stored = localStorage.getItem('shuxing_user_state');
      return assert.eq(stored, 'separation', '类型持久化到localStorage');
    }
  };
  
  console.log('✅ 用户类型自动识别测试模块已加载（7项）');
})();
