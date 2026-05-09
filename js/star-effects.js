/**
 * 数星 - 星空特效系统 V5（单色系柔和色 · 新极简特效）
 * 流星效果 + 星光粒子 + 环境光晕 + 柔和渐变
 * Muted & Pastel · Monochromatic · Approachable Sophistication
 */

// ===== 流星效果（更柔和） =====
function createShootingStar(container) {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    
    const startX = 30 + Math.random() * 60;
    const startY = Math.random() * 25;
    const length = 50 + Math.random() * 80;
    const opacity = 0.2 + Math.random() * 0.3;
    
    Object.assign(star.style, {
        left: startX + '%',
        top: startY + '%',
        width: length + 'px',
        height: '1px',
        transform: `rotate(-25deg)`,
        background: `linear-gradient(to right, transparent, rgba(200,198,220,${opacity}), rgba(155,153,184,${opacity * 0.7}))`,
        position: 'absolute',
        borderRadius: '1px',
        opacity: '0',
        boxShadow: `0 0 6px rgba(155,153,184,${opacity * 0.4})`,
        animation: `shoot ${1.8 + Math.random() * 1.2}s ease-out forwards`,
        animationDelay: `${Math.random() * 3}s`,
        pointerEvents: 'none',
        zIndex: '0'
    });
    
    const glow = document.createElement('div');
    Object.assign(glow.style, {
        position: 'absolute',
        right: '-2px',
        top: '-1.5px',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: 'rgba(230,228,238,0.6)',
        boxShadow: '0 0 8px rgba(155,153,184,0.4)'
    });
    star.appendChild(glow);
    
    container.appendChild(star);
    setTimeout(() => star.remove(), 5000);
}

let shootingStarTimer = null;

function startShootingStars(container, interval = 10000) {
    stopShootingStars();
    // 首次延迟后发射
    setTimeout(() => createShootingStar(container), 1000 + Math.random() * 3000);
    shootingStarTimer = setInterval(() => {
        createShootingStar(container);
    }, interval + Math.random() * 5000);
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
            0% { opacity: 0; transform: translateX(0) translateY(0) rotate(-25deg); }
            8% { opacity: 0.7; }
            60% { opacity: 0.5; }
            100% { opacity: 0; transform: translateX(280px) translateY(130px) rotate(-25deg); }
        }
        .shooting-star { will-change: transform, opacity; }
        .star-point { will-change: transform, opacity; }
        .bg-glow {
            position: fixed;
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            animation: glowPulse 10s ease-in-out infinite;
        }
        @keyframes glowPulse {
            0%, 100% { opacity: 0.08; transform: scale(1); }
            50% { opacity: 0.18; transform: scale(1.1); }
        }

        /* 柔和环境光晕（新极简装饰） */
        .ambient-gradient {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
            background: 
                radial-gradient(ellipse at 20% 15%, rgba(123, 121, 160, 0.04) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 65%, rgba(138, 172, 176, 0.03) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 85%, rgba(200, 176, 136, 0.02) 0%, transparent 40%);
        }
    `;
    document.head.appendChild(style);
})();

// ===== 创建环境光晕 =====
function createAmbientGlow(container) {
    // 添加环境渐变层
    const ambient = document.createElement('div');
    ambient.className = 'ambient-gradient';
    container.prepend(ambient);

    // 柔和光晕
    const glows = [
        { x: '12%', y: '18%', size: '400px', color: 'rgba(123,121,160,0.05)', dur: '12s', delay: '0s' },
        { x: '78%', y: '50%', size: '320px', color: 'rgba(138,172,176,0.03)', dur: '14s', delay: '2s' },
        { x: '45%', y: '10%', size: '300px', color: 'rgba(123,121,160,0.04)', dur: '11s', delay: '4s' },
        { x: '60%', y: '80%', size: '280px', color: 'rgba(200,176,136,0.025)', dur: '13s', delay: '1s' }
    ];
    
    glows.forEach((g) => {
        const div = document.createElement('div');
        div.className = 'bg-glow';
        Object.assign(div.style, {
            left: g.x, top: g.y,
            width: g.size, height: g.size,
            background: `radial-gradient(circle, ${g.color} 0%, transparent 65%)`,
            animationDelay: g.delay,
            animationDuration: g.dur
        });
        container.appendChild(div);
    });
}

// ===== 生成柔和星光粒子 =====
function createStars(container, count = 80) {
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star-point';
        const size = 1 + Math.random() * 1.5;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = 4 + Math.random() * 6;
        const delay = Math.random() * 8;
        const opacity = 0.2 + Math.random() * 0.4;
        
        Object.assign(star.style, {
            left: x + '%',
            top: y + '%',
            width: size + 'px',
            height: size + 'px',
            background: `rgba(200, 198, 220, ${opacity * 0.8})`,
            boxShadow: `0 0 ${2 + size}px rgba(155, 153, 184, ${opacity * 0.3})`,
            animationDuration: duration + 's',
            animationDelay: delay + 's',
            opacity: '0'
        });
        container.appendChild(star);
    }
}

// ===== 导出接口 =====
window.StarEffects = {
    start: (container) => {
        // 先创建星光粒子
        createStars(container, 60);
        // 然后环境光晕
        createAmbientGlow(container);
        // 流星（低频，不抢眼）
        startShootingStars(container, 120000 + Math.random() * 60000);
    },
    stop: stopShootingStars
};
