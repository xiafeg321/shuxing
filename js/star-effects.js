/**
 * 数星 - 星空特效系统 V3（增强版）
 * 流星效果 + 星光粒子 + 花瓣飘落
 */

// ===== 流星效果 =====
function createShootingStar(container) {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    
    // 随机起点（顶部区域）
    const startX = Math.random() * 100;
    const startY = Math.random() * 30;  // 顶部30%
    
    // 随机方向和长度
    const angle = -20 + Math.random() * 40; // 偏向左右
    const length = 80 + Math.random() * 120;
    
    Object.assign(star.style, {
        left: startX + '%',
        top: startY + '%',
        width: length + 'px',
        height: '1.5px',
        transform: `rotate(${angle}deg)`,
        background: `linear-gradient(to right, transparent, rgba(255,255,255,0.6), rgba(168,178,255,0.4))`,
        position: 'absolute',
        borderRadius: '1px',
        opacity: '0',
        boxShadow: '0 0 6px rgba(168,178,255,0.3)',
        animation: `shoot ${1.2 + Math.random() * 0.8}s ease-out forwards`,
        animationDelay: `${Math.random() * 2}s`,
        pointerEvents: 'none',
        zIndex: '0'
    });
    
    // 尾迹发光点
    const glow = document.createElement('div');
    Object.assign(glow.style, {
        position: 'absolute',
        right: '-3px',
        top: '-1.5px',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)',
        boxShadow: '0 0 8px rgba(168,178,255,0.5)'
    });
    star.appendChild(glow);
    
    container.appendChild(star);
    
    // 动画结束后移除
    setTimeout(() => star.remove(), 3000);
}

// ===== 间歇产生流星 =====
let shootingStarTimer = null;

function startShootingStars(container, interval = 8000) {
    stopShootingStars();
    createShootingStar(container);
    shootingStarTimer = setInterval(() => {
        createShootingStar(container);
    }, interval + Math.random() * 4000);
}

function stopShootingStars() {
    if (shootingStarTimer) {
        clearInterval(shootingStarTimer);
        shootingStarTimer = null;
    }
}

// ===== 注入流星动画样式 =====
(function injectStarAnimations() {
    if (document.getElementById('star-effects-style')) return;
    const style = document.createElement('style');
    style.id = 'star-effects-style';
    style.textContent = `
        @keyframes shoot {
            0% {
                opacity: 0;
                transform: translateX(0) translateY(0) rotate(var(--shoot-angle, -30deg));
            }
            10% {
                opacity: 1;
            }
            70% {
                opacity: 0.8;
            }
            100% {
                opacity: 0;
                transform: translateX(300px) translateY(150px) rotate(var(--shoot-angle, -30deg));
            }
        }
        
        .shooting-star {
            will-change: transform, opacity;
        }
        
        /* 星光闪烁增强 */
        .star-point {
            will-change: transform, opacity;
            transition: opacity 0.5s ease;
        }
        
        /* 渐入背景装饰光晕 */
        .bg-glow {
            position: fixed;
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            animation: glowPulse 6s ease-in-out infinite;
        }
        
        @keyframes glowPulse {
            0%, 100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.2); }
        }
    `;
    document.head.appendChild(style);
})();

// ===== 背景光晕 =====
function createBackgroundGlow(container) {
    const glows = [
        { x: '10%', y: '20%', size: '400px', color: 'rgba(124,138,255,0.08)', dur: '8s' },
        { x: '70%', y: '60%', size: '350px', color: 'rgba(255,138,118,0.06)', dur: '7s' },
        { x: '50%', y: '10%', size: '300px', color: 'rgba(168,178,255,0.06)', dur: '9s' }
    ];
    
    glows.forEach((g, i) => {
        const div = document.createElement('div');
        div.className = 'bg-glow';
        div.style.cssText = `
            left: ${g.x}; top: ${g.y};
            width: ${g.size}; height: ${g.size};
            background: radial-gradient(circle, ${g.color} 0%, transparent 70%);
            animation-delay: ${i * 2}s;
            animation-duration: ${g.dur};
        `;
        container.appendChild(div);
    });
}

// ===== 情侣剪影（文档5.8.2节） =====
function createCoupleSilhouette() {
    if (document.getElementById('couple-silhouette')) return;
    var div = document.createElement('div');
    div.className = 'couple-silhouette';
    div.id = 'couple-silhouette';
    var heads = document.createElement('div');
    heads.className = 'couple-heads';
    div.appendChild(heads);
    document.body.appendChild(div);
}

// ===== 海面波光（文档5.8.3节） =====
function createSeaShimmer() {
    if (document.getElementById('sea-shimmer')) return;
    var div = document.createElement('div');
    div.className = 'sea-shimmer';
    div.id = 'sea-shimmer';
    document.body.appendChild(div);
}

// 导出
window.StarEffects = {
    start: (container) => {
        createBackgroundGlow(container);
        // 流星频率：文档说3-5分钟一次，但演示时调整为1.5-3分钟
        startShootingStars(container, 90000 + Math.random() * 90000);
        // 添加情侣剪影
        createCoupleSilhouette();
        // 添加海面波光
        createSeaShimmer();
    },
    stop: stopShootingStars
};
