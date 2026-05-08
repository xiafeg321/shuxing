/**
 * 数星 - 星空特效系统 V4（单色系暗调版）
 * 流星效果 + 星光粒子 - 更柔和、更克制
 */

// ===== 流星效果 =====
function createShootingStar(container) {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    
    const startX = Math.random() * 100;
    const startY = Math.random() * 30;
    const angle = -20 + Math.random() * 40;
    const length = 60 + Math.random() * 100;
    
    Object.assign(star.style, {
        left: startX + '%',
        top: startY + '%',
        width: length + 'px',
        height: '1px',
        transform: `rotate(${angle}deg)`,
        background: `linear-gradient(to right, transparent, rgba(200,198,220,0.4), rgba(155,153,184,0.3))`,
        position: 'absolute',
        borderRadius: '1px',
        opacity: '0',
        boxShadow: '0 0 4px rgba(155,153,184,0.15)',
        animation: `shoot ${1.5 + Math.random() * 1}s ease-out forwards`,
        animationDelay: `${Math.random() * 2}s`,
        pointerEvents: 'none',
        zIndex: '0'
    });
    
    const glow = document.createElement('div');
    Object.assign(glow.style, {
        position: 'absolute',
        right: '-2px',
        top: '-1px',
        width: '3px',
        height: '3px',
        borderRadius: '50%',
        background: 'rgba(230,228,238,0.5)',
        boxShadow: '0 0 6px rgba(155,153,184,0.3)'
    });
    star.appendChild(glow);
    
    container.appendChild(star);
    setTimeout(() => star.remove(), 4000);
}

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

// ===== 注入动画样式 =====
(function injectStarAnimations() {
    if (document.getElementById('star-effects-style')) return;
    const style = document.createElement('style');
    style.id = 'star-effects-style';
    style.textContent = `
        @keyframes shoot {
            0% { opacity: 0; transform: translateX(0) translateY(0) rotate(var(--shoot-angle, -30deg)); }
            10% { opacity: 0.6; }
            70% { opacity: 0.5; }
            100% { opacity: 0; transform: translateX(300px) translateY(150px) rotate(var(--shoot-angle, -30deg)); }
        }
        .shooting-star { will-change: transform, opacity; }
        .star-point { will-change: transform, opacity; }
        .bg-glow {
            position: fixed;
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            animation: glowPulse 8s ease-in-out infinite;
        }
        @keyframes glowPulse {
            0%, 100% { opacity: 0.1; transform: scale(1); }
            50% { opacity: 0.2; transform: scale(1.15); }
        }
    `;
    document.head.appendChild(style);
})();

// ===== 背景光晕 =====
function createBackgroundGlow(container) {
    const glows = [
        { x: '15%', y: '20%', size: '350px', color: 'rgba(123,121,160,0.05)', dur: '10s' },
        { x: '75%', y: '55%', size: '300px', color: 'rgba(200,204,208,0.03)', dur: '12s' },
        { x: '50%', y: '12%', size: '280px', color: 'rgba(123,121,160,0.04)', dur: '9s' }
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

// 导出
window.StarEffects = {
    start: (container) => {
        createBackgroundGlow(container);
        startShootingStars(container, 120000 + Math.random() * 60000);
    },
    stop: stopShootingStars
};
