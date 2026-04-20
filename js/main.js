// 数星 - 主JavaScript文件

document.addEventListener('DOMContentLoaded', function() {
    // 初始化应用
    initApp();
    
    // 绑定事件
    bindEvents();
    
    // 添加更多随机星星
    createStars();
});

// 初始化应用
function initApp() {
    console.log('数星应用初始化...');
    
    // 检查本地存储
    checkLocalStorage();
    
    // 显示欢迎消息
    showWelcomeMessage();
    
    // 检查人格模型设置
    checkPersonaSetup();
}

// 绑定事件
function bindEvents() {
    // 了解更多按钮
    const learnMoreBtn = document.getElementById('learnMore');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', toggleInstructions);
    }
    
    // 为所有按钮添加点击效果
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // 添加点击效果
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // 如果是开始按钮，记录点击时间
            if (this.classList.contains('btn-primary')) {
                recordStartTime();
            }
        });
    });
    
    // 为功能卡片添加悬停效果
    const features = document.querySelectorAll('.feature');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        feature.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// 切换使用说明显示
function toggleInstructions() {
    const instructions = document.getElementById('instructions');
    const learnMoreBtn = document.getElementById('learnMore');
    
    if (instructions.style.display === 'none' || instructions.style.display === '') {
        instructions.style.display = 'block';
        learnMoreBtn.innerHTML = '<i class="fas fa-times-circle"></i> 收起说明';
        learnMoreBtn.classList.remove('btn-secondary');
        learnMoreBtn.classList.add('btn-primary');
        
        // 滚动到说明区域
        instructions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        instructions.style.display = 'none';
        learnMoreBtn.innerHTML = '<i class="fas fa-info-circle"></i> 了解更多';
        learnMoreBtn.classList.remove('btn-primary');
        learnMoreBtn.classList.add('btn-secondary');
    }
}

// 检查本地存储
function checkLocalStorage() {
    const lastVisit = localStorage.getItem('lastVisit');
    const now = new Date().toISOString();
    
    if (!lastVisit) {
        // 第一次访问
        localStorage.setItem('firstVisit', now);
        console.log('欢迎第一次访问数星！');
    }
    
    localStorage.setItem('lastVisit', now);
}

// 显示欢迎消息
function showWelcomeMessage() {
    const firstVisit = localStorage.getItem('firstVisit');
    
    if (firstVisit) {
        const visitDate = new Date(firstVisit);
        const today = new Date();
        const diffTime = Math.abs(today - visitDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            console.log('欢迎回来！这是你使用数星的第二天。');
        } else if (diffDays > 1) {
            console.log(`欢迎回来！这是你使用数星的第${diffDays}天。`);
        }
    }
}

// 记录开始时间
function recordStartTime() {
    const startTime = new Date().toISOString();
    localStorage.setItem('lastStartTime', startTime);
    
    // 增加启动次数
    let startCount = parseInt(localStorage.getItem('startCount') || '0');
    startCount++;
    localStorage.setItem('startCount', startCount.toString());
    
    console.log(`第${startCount}次开始使用数星`);
}

// 创建随机星星
function createStars() {
    const starsContainer = document.querySelector('.stars');
    const stars2Container = document.querySelector('.stars2');
    const stars3Container = document.querySelector('.stars3');
    
    if (!starsContainer || !stars2Container || !stars3Container) return;
    
    // 为每个容器创建星星
    createStarsForContainer(starsContainer, 15);
    createStarsForContainer(stars2Container, 10);
    createStarsForContainer(stars3Container, 8);
}

function createStarsForContainer(container, count) {
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // 随机位置
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        
        // 随机大小
        const size = Math.random() * 3 + 1;
        
        // 随机透明度
        const opacity = Math.random() * 0.5 + 0.2;
        
        // 随机动画延迟
        const delay = Math.random() * 5;
        
        star.style.cssText = `
            position: absolute;
            left: ${left}%;
            top: ${top}%;
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #8a8dff, #6c9bcf);
            border-radius: 50%;
            opacity: ${opacity};
            animation: twinkle ${Math.random() * 3 + 2}s infinite;
            animation-delay: ${delay}s;
        `;
        
        container.appendChild(star);
    }
}

// 工具函数：格式化日期
function formatDate(date) {
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

// 工具函数：获取时间问候
function getTimeGreeting() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
        return '早上好';
    } else if (hour >= 12 && hour < 14) {
        return '中午好';
    } else if (hour >= 14 && hour < 18) {
        return '下午好';
    } else if (hour >= 18 && hour < 22) {
        return '晚上好';
    } else {
        return '夜深了';
    }
}

// 检查人格模型设置
function checkPersonaSetup() {
    const savedSettings = localStorage.getItem('shuxing_user_settings');
    const startChatBtn = document.getElementById('start-chat-btn');
    const setupStatus = document.getElementById('setup-status');
    const currentPersona = document.getElementById('current-persona');
    
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.zodiac && settings.mbti) {
                // 已设置人格模型
                if (startChatBtn) startChatBtn.style.display = 'inline-block';
                if (setupStatus) setupStatus.style.display = 'block';
                if (currentPersona) {
                    currentPersona.textContent = `${settings.zodiac}座 · ${settings.mbti}`;
                }
                console.log('人格模型已设置:', settings.zodiac, settings.mbti);
            }
        } catch (error) {
            console.error('解析人格设置失败:', error);
        }
    }
}

// 导出函数供其他页面使用
window.appUtils = {
    formatDate,
    getTimeGreeting,
    recordStartTime
};

// 添加CSS动画定义
const style = document.createElement('style');
style.textContent = `
    @keyframes twinkle {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.2); }
    }
    
    .star {
        pointer-events: none;
    }
`;
document.head.appendChild(style);

console.log('数星应用加载完成！');