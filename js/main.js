/**
 * 数星 - 主页面脚本（优化版）
 * 首页交互 + 星光背景 + 状态管理
 */

document.addEventListener('DOMContentLoaded', function() {
    initStars();
    initUI();
    checkSetupStatus();
    bindEvents();
    
    // 启动星空特效（首页专属）
    const container = document.getElementById('stars-container');
    if (container && window.StarEffects) {
        StarEffects.start(container);
    }
});

// ===== 星光背景系统（V2 — 更丰富的星群效果） =====
function initStars() {
    const container = document.getElementById('stars-container');
    if (!container) return;
    
    const starCount = window.innerWidth < 768 ? 30 : 50;
    const colors = ['rgba(124,138,255,', 'rgba(168,178,255,', 'rgba(255,138,118,', 'rgba(255,179,160,'];
    const sizes = [2, 3, 4];
    
    container.innerHTML = '';
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star-point';
        
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const colorBase = colors[Math.floor(Math.random() * colors.length)];
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const dur = 4 + Math.random() * 6;
        const delay = Math.random() * 8;
        const opacity = 0.2 + Math.random() * 0.4;
        
        Object.assign(star.style, {
            left: x + '%',
            top: y + '%',
            width: size + 'px',
            height: size + 'px',
            background: colorBase + opacity + ')',
            '--float-dur': dur + 's',
            '--float-delay': delay + 's',
            animationDelay: delay + 's',
            animationDuration: dur + 's'
        });
        
        container.appendChild(star);
    }
    
    // 添加一些大星星
    for (let i = 0; i < 5; i++) {
        const big = document.createElement('div');
        big.className = 'star-point';
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 80;
        Object.assign(big.style, {
            left: x + '%',
            top: y + '%',
            width: '6px',
            height: '6px',
            background: `rgba(255, 255, 255, ${0.3 + Math.random() * 0.3})`,
            boxShadow: '0 0 8px rgba(124,138,255,0.3)',
            '--float-dur': (8 + Math.random() * 4) + 's',
            '--float-delay': (Math.random() * 10) + 's',
            animationDelay: (Math.random() * 10) + 's',
            animationDuration: (8 + Math.random() * 4) + 's'
        });
        container.appendChild(big);
    }
}

// ===== 首页UI交互 =====
function initUI() {
    const learnMoreBtn = document.getElementById('learnMore');
    const instructions = document.getElementById('instructions');
    
    if (learnMoreBtn && instructions) {
        learnMoreBtn.addEventListener('click', function() {
            if (instructions.style.display === 'none' || !instructions.style.display) {
                instructions.style.display = 'block';
                instructions.scrollIntoView({ behavior: 'smooth', block: 'start' });
                this.innerHTML = '<i class="fas fa-times"></i><span>收起说明</span>';
            } else {
                instructions.style.display = 'none';
                this.innerHTML = '<i class="fas fa-info-circle"></i><span>了解更多</span>';
            }
        });
    }
}

// ===== 检查并显示已设置的状态 =====
function checkSetupStatus() {
    const statusEl = document.getElementById('setup-status');
    const setupBtn = document.getElementById('setup-btn');
    const chatBtn = document.getElementById('start-chat-btn');
    const personaEl = document.getElementById('current-persona');
    
    try {
        const saved = localStorage.getItem('shuxing_user_settings');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.zodiac && data.mbti) {
                // 获取星座名称
                const zodiacNames = {
                    '白羊': '白羊座', '金牛': '金牛座', '双子': '双子座',
                    '巨蟹': '巨蟹座', '狮子': '狮子座', '处女': '处女座',
                    '天秤': '天秤座', '天蝎': '天蝎座', '射手': '射手座',
                    '摩羯': '摩羯座', '水瓶': '水瓶座', '双鱼': '双鱼座'
                };
                const zName = zodiacNames[data.zodiac] || data.zodiac;
                
                if (statusEl) statusEl.style.display = 'flex';
                if (personaEl) personaEl.textContent = `${zName} · ${data.mbti || ''}`;
                if (setupBtn) setupBtn.textContent = '重新设置';
                if (chatBtn) chatBtn.style.display = 'inline-flex';
                
                return;
            }
        }
    } catch (e) {
        console.error('读取设置失败:', e);
    }
    
    // 未设置：隐藏已设置提示，显示创建按钮
    if (statusEl) statusEl.style.display = 'none';
    if (chatBtn) chatBtn.style.display = 'none';
    if (setupBtn) setupBtn.innerHTML = '<i class="fas fa-user-astronaut"></i><span>创建人格模型</span>';
}

// ===== 事件绑定 =====
function bindEvents() {
    // 窗口大小变化时重新生成星星
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initStars, 500);
    });
    
    // 按钮点击涟漪效果
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // 所有渐入动画元素
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '50px' });
        observer.observe(el);
    });
}

// ===== 涟漪效果样式（动态注入） =====
(function injectRippleStyle() {
    if (document.getElementById('ripple-style')) return;
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
        .btn { position: relative; overflow: hidden; }
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transform: scale(0);
            animation: rippleAnim 0.6s ease-out;
            pointer-events: none;
        }
        @keyframes rippleAnim {
            to { transform: scale(4); opacity: 0; }
        }
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();
