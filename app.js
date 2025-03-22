// 应用状态
let currentLecture = null;
let currentCardIndex = 0;
let isFlipped = false;
let knownCards = {}; // 存储已掌握的卡片

// DOM元素
const flashcardElement = document.querySelector('.flashcard');
const termElement = document.getElementById('term');
const posElement = document.getElementById('pos');
const phoneticElement = document.getElementById('phonetic');
const definitionElement = document.getElementById('definition');
const prevButton = document.getElementById('prev-btn');
const nextButton = document.getElementById('next-btn');
const markKnownButton = document.getElementById('mark-known-btn');
const resetButton = document.getElementById('reset-btn');
const currentCardElement = document.getElementById('current-card');
const totalCardsElement = document.getElementById('total-cards');
const remainingCountElement = document.getElementById('remaining-count');
const knownCountElement = document.getElementById('known-count');
const lectureButtons = document.querySelectorAll('.lecture-btn');

// 马卡龙色系列表
const macaronColors = [
    'macaron-pink',
    'macaron-blue',
    'macaron-green',
    'macaron-yellow',
    'macaron-purple',
    'macaron-orange'
];

// 初始化应用
function init() {
    prevButton.addEventListener('click', showPreviousCard);
    nextButton.addEventListener('click', showNextCard);
    markKnownButton.addEventListener('click', markCardAsKnown);
    resetButton.addEventListener('click', resetKnownCards);
    phoneticElement.addEventListener('click', pronounceWord);
    
    // 添加点击卡片翻转功能
    flashcardElement.addEventListener('click', function(e) {
        // 如果点击的是音标，不触发翻转
        if (e.target === phoneticElement || phoneticElement.contains(e.target)) {
            return;
        }
        flipCard();
    });
    
    // 从本地存储加载已掌握的卡片
    loadKnownCards();
    
    // 确保页面加载时卡片处于初始状态
    resetCardState();
}

// 加载已掌握的卡片
function loadKnownCards() {
    const savedKnownCards = localStorage.getItem('knownCards');
    if (savedKnownCards) {
        knownCards = JSON.parse(savedKnownCards);
    }
}

// 保存已掌握的卡片到本地存储
function saveKnownCards() {
    localStorage.setItem('knownCards', JSON.stringify(knownCards));
}

// 加载指定讲义的卡片
function loadLecture(lectureNumber) {
    // 重置卡片状态
    resetCardState();
    
    // 更新当前讲义
    currentLecture = lectureNumber;
    currentCardIndex = 0;
    
    // 更新UI显示当前选中的讲义
    lectureButtons.forEach(btn => {
        if (parseInt(btn.textContent.split(' ')[1]) === lectureNumber) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 更新统计信息
    updateStats();
    
    // 显示当前卡片
    showCard();
    
    // 更新按钮状态
    updateButtonStates();
}

// 显示当前卡片
function showCard() {
    if (!currentLecture || getFilteredCards().length === 0) {
        termElement.textContent = '请选择一个讲义';
        posElement.textContent = '';
        phoneticElement.textContent = '';
        definitionElement.textContent = '所有卡片已标记为已掌握';
        updateRandomColor();
        return;
    }
    
    const filteredCards = getFilteredCards();
    if (currentCardIndex >= filteredCards.length) {
        currentCardIndex = 0;
    }
    
    const card = filteredCards[currentCardIndex];
    termElement.textContent = card.term;
    posElement.textContent = card.pos;
    phoneticElement.textContent = card.phonetic;
    definitionElement.textContent = card.definition;
    
    // 更新当前卡片计数
    currentCardElement.textContent = currentCardIndex + 1;
    totalCardsElement.textContent = filteredCards.length;
    
    // 应用随机马卡龙色
    updateRandomColor();
    
    // 确保卡片正面朝上
    if (isFlipped) {
        flipCard();
    }
}

// 更新随机马卡龙色
function updateRandomColor() {
    // 先移除所有颜色类
    macaronColors.forEach(color => {
        flashcardElement.querySelector('.flashcard-front').classList.remove(color);
        flashcardElement.querySelector('.flashcard-back').classList.remove(color);
        
        // 从控制按钮中移除颜色类
        prevButton.classList.remove(color);
        nextButton.classList.remove(color);
    });
    
    // 应用随机颜色
    const randomColor = macaronColors[Math.floor(Math.random() * macaronColors.length)];
    flashcardElement.querySelector('.flashcard-front').classList.add(randomColor);
    flashcardElement.querySelector('.flashcard-back').classList.add(randomColor);
    
    // 应用相同颜色到控制按钮
    prevButton.classList.add(randomColor);
    nextButton.classList.add(randomColor);
}

// 获取未标记为已掌握的卡片
function getFilteredCards() {
    if (!currentLecture) return [];
    
    return lectureData[currentLecture].filter(card => {
        const cardId = `${currentLecture}-${card.term}`;
        return !knownCards[cardId];
    });
}

// 翻转卡片
function flipCard() {
    if (!currentLecture) return;
    
    isFlipped = !isFlipped;
    flashcardElement.classList.toggle('flipped');
}

// 显示下一张卡片
function showNextCard() {
    if (!currentLecture) return;
    
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;
    
    currentCardIndex = (currentCardIndex + 1) % filteredCards.length;
    showCard();
    updateButtonStates();
}

// 显示上一张卡片
function showPreviousCard() {
    if (!currentLecture) return;
    
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;
    
    currentCardIndex = (currentCardIndex - 1 + filteredCards.length) % filteredCards.length;
    showCard();
    updateButtonStates();
}

// 标记当前卡片为已掌握
function markCardAsKnown() {
    if (!currentLecture) return;
    
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;
    
    const card = filteredCards[currentCardIndex];
    const cardId = `${currentLecture}-${card.term}`;
    knownCards[cardId] = true;
    saveKnownCards();
    
    // 更新统计信息
    updateStats();
    
    // 如果还有卡片，显示下一张，否则重新加载讲义
    if (getFilteredCards().length > 0) {
        if (currentCardIndex >= getFilteredCards().length) {
            currentCardIndex = 0;
        }
        showCard();
    } else {
        showCard(); // 显示"所有卡片已标记为已掌握"消息
    }
    
    updateButtonStates();
}

// 更新统计信息
function updateStats() {
    if (!currentLecture) {
        remainingCountElement.textContent = '0';
        knownCountElement.textContent = '0';
        return;
    }
    
    const totalCards = lectureData[currentLecture].length;
    const knownCount = lectureData[currentLecture].filter(card => {
        const cardId = `${currentLecture}-${card.term}`;
        return knownCards[cardId];
    }).length;
    
    remainingCountElement.textContent = totalCards - knownCount;
    knownCountElement.textContent = knownCount;
}

// 发音功能
function pronounceWord() {
    if (!currentLecture) return;
    
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;
    
    const card = filteredCards[currentCardIndex];
    const word = card.term;
    
    const speech = new SpeechSynthesisUtterance(word);
    speech.lang = 'en-US'; // 设置美式英语
    speech.rate = 0.8; // 调整语速
    
    window.speechSynthesis.speak(speech);
}

// 更新按钮状态
function updateButtonStates() {
    if (!currentLecture || getFilteredCards().length === 0) {
        prevButton.disabled = true;
        nextButton.disabled = true;
        markKnownButton.disabled = true;
        return;
    }
    
    const filteredCards = getFilteredCards();
    prevButton.disabled = filteredCards.length <= 1;
    nextButton.disabled = filteredCards.length <= 1;
    markKnownButton.disabled = false;
}

// 重置卡片状态
function resetCardState() {
    isFlipped = false;
    flashcardElement.classList.remove('flipped');
}

// 添加触摸手势支持
function setupTouchGestures() {
    const flashcardContainer = document.getElementById('flashcard-container');
    let startX = 0;
    let startY = 0;
    let distX = 0;
    let distY = 0;
    
    flashcardContainer.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, false);
    
    flashcardContainer.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        distX = e.touches[0].clientX - startX;
        distY = e.touches[0].clientY - startY;
        
        // 阻止页面滚动
        if (Math.abs(distX) > Math.abs(distY)) {
            e.preventDefault();
        }
    }, { passive: false });
    
    flashcardContainer.addEventListener('touchend', function(e) {
        if (Math.abs(distX) > 50) {
            if (distX > 0) {
                // 向右滑动，显示上一张
                showPreviousCard();
            } else {
                // 向左滑动，显示下一张
                showNextCard();
            }
        }
        // 轻触翻转由卡片的click事件处理
        
        // 重置
        startX = 0;
        startY = 0;
        distX = 0;
        distY = 0;
    }, false);
}

// 重置所有已掌握的卡片
function resetKnownCards() {
    if (!currentLecture) return;
    
    // 确认对话框
    if (confirm('确定要重置所有已掌握的单词吗？这将清除您的学习进度。')) {
        // 清空当前讲义的已掌握卡片
        const lectureCards = lectureData[currentLecture];
        lectureCards.forEach(card => {
            const cardId = `${currentLecture}-${card.term}`;
            delete knownCards[cardId];
        });
        
        // 保存更新后的状态
        saveKnownCards();
        
        // 更新统计信息
        updateStats();
        
        // 重新加载当前讲义
        currentCardIndex = 0;
        showCard();
        updateButtonStates();
        
        // 提示用户重置成功
        alert('重置成功，所有单词已恢复到未掌握状态！');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    init();
    setupTouchGestures();
}); 