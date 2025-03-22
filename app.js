// 应用状态
let currentLecture = null;
let currentCardIndex = 0;
let isFlipped = false;
let knownCards = {}; // 存储已掌握的卡片
let currentTabFilter = 'all'; // 当前标签过滤器：all, mastered, remaining

// 本地存储键名
const STORAGE_KNOWN_CARDS = 'flashcards_knownCards';
const STORAGE_CURRENT_LECTURE = 'flashcards_currentLecture';
const STORAGE_CURRENT_INDEX = 'flashcards_currentIndex';

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
const knownWordCountElement = document.getElementById('known-word-count');
const lectureButtons = document.querySelectorAll('.lecture-btn');
const progressFill = document.getElementById('progress-fill');
const progressBarContainer = document.getElementById('progress-bar-container');
const masteredCountElement = document.getElementById('mastered-count');
const totalWordCountElement = document.getElementById('total-word-count');
const allWordCountElement = document.getElementById('all-word-count');
const wordListModal = document.getElementById('word-list-modal');
const wordListContainer = document.getElementById('word-list');
const closeModalButton = document.querySelector('.close-modal');
const tabButtons = document.querySelectorAll('.tab-btn');
const cardPronounceBtn = document.getElementById('card-pronounce-btn');
const cardToggleBtn = document.getElementById('card-toggle-btn');
const confettiContainer = document.getElementById('confetti-container');

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
    
    // 添加卡片内部按钮的事件监听
    if (cardPronounceBtn) {
        cardPronounceBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡，避免触发卡片翻转
            pronounceWord();
        });
    }
    
    if (cardToggleBtn) {
        cardToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡，避免触发卡片翻转
            markCardAsKnown();
        });
    }
    
    // 添加点击卡片翻转功能
    flashcardElement.addEventListener('click', function(e) {
        // 如果点击的是音标或按钮，不触发翻转
        if (e.target === phoneticElement || phoneticElement.contains(e.target) ||
            e.target === cardPronounceBtn || cardPronounceBtn?.contains(e.target) ||
            e.target === cardToggleBtn || cardToggleBtn?.contains(e.target)) {
            return;
        }
        flipCard();
    });
    
    // 进度条点击事件
    progressBarContainer.addEventListener('click', openWordListModal);
    
    // 关闭弹窗按钮
    closeModalButton.addEventListener('click', closeWordListModal);
    
    // 标签切换事件
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            currentTabFilter = this.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderWordList();
        });
    });
    
    // 点击弹窗外部关闭弹窗
    window.addEventListener('click', function(e) {
        if (e.target === wordListModal) {
            closeWordListModal();
        }
    });
    
    // 从本地存储加载已掌握的卡片
    loadKnownCards();
    
    // 从本地存储加载上次的学习进度
    loadLastProgress();
}

// 从本地存储加载上次的学习进度
function loadLastProgress() {
    // 加载上次选中的讲义
    const lastLecture = localStorage.getItem(STORAGE_CURRENT_LECTURE);
    
    if (lastLecture && lectureData[lastLecture]) {
        // 加载上次查看的索引
        const lastIndex = parseInt(localStorage.getItem(STORAGE_CURRENT_INDEX) || '0');
        
        // 设置当前讲义
        loadLecture(lastLecture);
        
        // 设置当前索引（如果索引有效）
        if (!isNaN(lastIndex) && lastIndex >= 0) {
            const filteredCards = getFilteredCards();
            if (filteredCards.length > 0) {
                currentCardIndex = Math.min(lastIndex, filteredCards.length - 1);
                showCard();
            }
        }
    } else {
        // 如果没有保存状态或状态无效，默认选中Lecture 1
        loadLecture(1);
    }
}

// 保存当前学习进度到本地存储
function saveProgress() {
    if (currentLecture) {
        localStorage.setItem(STORAGE_CURRENT_LECTURE, currentLecture);
        localStorage.setItem(STORAGE_CURRENT_INDEX, currentCardIndex.toString());
    }
}

// 从本地存储加载已掌握的卡片
function loadKnownCards() {
    const savedData = localStorage.getItem(STORAGE_KNOWN_CARDS);
    if (savedData) {
        try {
            knownCards = JSON.parse(savedData);
        } catch (e) {
            console.error('Error parsing known cards data:', e);
            knownCards = {};
        }
    }
}

// 保存已掌握的卡片到本地存储
function saveKnownCards() {
    localStorage.setItem(STORAGE_KNOWN_CARDS, JSON.stringify(knownCards));
    
    // 更新界面统计信息
    updateStats();
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
    
    // 保存当前进度
    saveProgress();
}

// 显示当前卡片
function showCard() {
    if (!currentLecture || getFilteredCards().length === 0) {
        termElement.textContent = 'Please select a lecture';
        posElement.textContent = '';
        phoneticElement.textContent = '';
        definitionElement.innerHTML = 'All cards have been marked as mastered';
        updateRandomColor();
        
        // 重置卡片内切换按钮
        if (cardToggleBtn) {
            cardToggleBtn.classList.remove('mastered');
            cardToggleBtn.setAttribute('aria-label', 'Mark as Mastered');
            cardToggleBtn.setAttribute('title', 'Mark as Mastered');
            cardToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"></path></svg>';
        }
        
        // 重置主按钮文本
        markKnownButton.textContent = 'Mark as Mastered';
        
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
    
    // 分割定义文本，分别应用不同样式
    const definitionText = card.definition;
    const dashIndex = definitionText.indexOf('-');
    
    if (dashIndex !== -1) {
        const termPart = definitionText.substring(0, dashIndex).trim();
        const definitionPart = definitionText.substring(dashIndex).trim();
        definitionElement.innerHTML = `<span class="term-part">${termPart}</span>${definitionPart}`;
    } else {
        definitionElement.innerHTML = definitionText;
    }
    
    // 更新当前卡片计数
    currentCardElement.textContent = currentCardIndex + 1;
    totalCardsElement.textContent = filteredCards.length;
    
    // 应用随机马卡龙色
    updateRandomColor();
    
    // 确保卡片正面朝上
    if (isFlipped) {
        flipCard();
    }
    
    // 检查并更新收藏状态
    const cardId = `${currentLecture}-${card.term}`;
    if (knownCards[cardId]) {
        // 更新卡片内切换按钮状态
        if (cardToggleBtn) {
            cardToggleBtn.classList.add('mastered');
            cardToggleBtn.setAttribute('aria-label', 'Mark as Learning');
            cardToggleBtn.setAttribute('title', 'Mark as Learning');
            cardToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
        }
        
        // 更新主按钮文本
        markKnownButton.textContent = 'Mark as Learning';
    } else {
        // 更新卡片内切换按钮状态
        if (cardToggleBtn) {
            cardToggleBtn.classList.remove('mastered');
            cardToggleBtn.setAttribute('aria-label', 'Mark as Mastered');
            cardToggleBtn.setAttribute('title', 'Mark as Mastered');
            cardToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"></path></svg>';
        }
        
        // 更新主按钮文本
        markKnownButton.textContent = 'Mark as Mastered';
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
    
    // 保存当前进度
    saveProgress();
}

// 显示上一张卡片
function showPreviousCard() {
    if (!currentLecture) return;
    
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;
    
    currentCardIndex = (currentCardIndex - 1 + filteredCards.length) % filteredCards.length;
    showCard();
    updateButtonStates();
    
    // 保存当前进度
    saveProgress();
}

// 标记当前卡片为已掌握
function markCardAsKnown() {
    if (!currentLecture || getFilteredCards().length === 0) return;
    
    const filteredCards = getFilteredCards();
    const card = filteredCards[currentCardIndex];
    const cardId = `${currentLecture}-${card.term}`;
    
    // 切换卡片状态
    if (knownCards[cardId]) {
        delete knownCards[cardId];
        
        // 更新卡片内的切换按钮状态
        if (cardToggleBtn) {
            cardToggleBtn.classList.remove('mastered');
            cardToggleBtn.setAttribute('aria-label', 'Mark as Mastered');
            cardToggleBtn.setAttribute('title', 'Mark as Mastered');
            cardToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"></path></svg>';
        }
        
        // 更新主要按钮的文本
        markKnownButton.textContent = 'Mark as Mastered';
    } else {
        knownCards[cardId] = true;
        
        // 更新卡片内的切换按钮状态
        if (cardToggleBtn) {
            cardToggleBtn.classList.add('mastered');
            cardToggleBtn.setAttribute('aria-label', 'Mark as Learning');
            cardToggleBtn.setAttribute('title', 'Mark as Learning');
            cardToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
            
            // 获取星星按钮位置
            const rect = cardToggleBtn.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            // 产生撒花效果
            createConfetti(x, y);
        }
        
        // 更新主要按钮的文本
        markKnownButton.textContent = 'Mark as Learning';
    }
    
    // 保存已掌握的卡片到本地存储
    saveKnownCards();
    
    // 0.5秒后自动使用滑动动画切换到下一个单词
    setTimeout(function() {
        showNextCard();
    }, 500);
}

// 更新统计信息
function updateStats() {
    if (!currentLecture) {
        remainingCountElement.textContent = '0';
        knownCountElement.textContent = '0';
        progressFill.style.width = '0%';
        masteredCountElement.textContent = '0';
        totalWordCountElement.textContent = '0';
        return;
    }
    
    const totalCards = lectureData[currentLecture].length;
    const knownCount = lectureData[currentLecture].filter(card => {
        const cardId = `${currentLecture}-${card.term}`;
        return knownCards[cardId];
    }).length;
    
    remainingCountElement.textContent = totalCards - knownCount;
    knownCountElement.textContent = knownCount;
    
    // 更新进度条
    const progressPercentage = totalCards > 0 ? (knownCount / totalCards) * 100 : 0;
    progressFill.style.width = progressPercentage + '%';
    
    // 更新进度数字
    masteredCountElement.textContent = knownCount;
    totalWordCountElement.textContent = totalCards;
}

// 朗读指定单词
function pronounceSpecificWord(word) {
    if (!word) return;
    
    const speech = new SpeechSynthesisUtterance(word);
    speech.lang = 'en-US'; // 设置美式英语
    speech.rate = 0.8; // 调整语速
    
    window.speechSynthesis.speak(speech);
}

// 朗读当前卡片上的单词
function pronounceWord() {
    if (!currentLecture) return;
    
    const filteredCards = getFilteredCards();
    if (filteredCards.length === 0) return;
    
    const card = filteredCards[currentCardIndex];
    pronounceSpecificWord(card.term);
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
    if (confirm('Are you sure you want to reset all mastered words? This will clear your learning progress.')) {
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
        alert('Reset successful! All words have been restored to unmastered state.');
    }
}

// 打开单词列表弹窗
function openWordListModal() {
    if (!currentLecture) return;
    
    renderWordList();
    wordListModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

// 关闭单词列表弹窗
function closeWordListModal() {
    wordListModal.style.display = 'none';
    document.body.style.overflow = '';
}

// 渲染单词列表
function renderWordList() {
    if (!currentLecture) return;
    
    wordListContainer.innerHTML = '';
    
    const words = lectureData[currentLecture];
    let filteredWords = words;
    
    // 根据当前标签过滤单词
    if (currentTabFilter === 'mastered') {
        filteredWords = words.filter(word => {
            const cardId = `${currentLecture}-${word.term}`;
            return knownCards[cardId];
        });
    } else if (currentTabFilter === 'remaining') {
        filteredWords = words.filter(word => {
            const cardId = `${currentLecture}-${word.term}`;
            return !knownCards[cardId];
        });
    }
    
    // 如果没有单词显示提示信息
    if (filteredWords.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="48" width="48" viewBox="0 0 24 24" fill="var(--grey-400)">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm4-4h-8v-2h8v2zm0-4h-8v-2h8v2z"></path>
            </svg>
            <p>No ${currentTabFilter === 'mastered' ? 'mastered' : currentTabFilter === 'remaining' ? 'learning' : ''} words to display.</p>
        `;
        wordListContainer.appendChild(emptyMessage);
        return;
    }
    
    // 创建单词列表
    filteredWords.forEach(word => {
        const cardId = `${currentLecture}-${word.term}`;
        const isMastered = knownCards[cardId];
        
        const wordItem = document.createElement('div');
        wordItem.className = `word-item ${isMastered ? 'mastered' : ''}`;
        wordItem.dataset.id = cardId;
        
        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';
        
        const wordTerm = document.createElement('div');
        wordTerm.className = 'word-term';
        
        // 添加主要术语
        const termText = document.createElement('span');
        termText.textContent = word.term;
        wordTerm.appendChild(termText);
        
        // 添加音标到单词后面
        if (word.phonetic) {
            const wordPhonetic = document.createElement('span');
            wordPhonetic.className = 'word-phonetic';
            wordPhonetic.textContent = word.phonetic;
            wordTerm.appendChild(wordPhonetic);
        }
        
        const wordDetails = document.createElement('div');
        wordDetails.className = 'word-details';
        
        // 添加词性作为芯片样式
        const posChip = document.createElement('span');
        posChip.className = 'pos-chip';
        posChip.textContent = word.pos;
        wordDetails.appendChild(posChip);
        
        // 添加定义文本
        const defText = document.createElement('span');
        defText.className = 'def-text';
        defText.textContent = word.definition.substring(0, 60) + (word.definition.length > 60 ? '...' : '');
        wordDetails.appendChild(defText);
        
        wordInfo.appendChild(wordTerm);
        wordInfo.appendChild(wordDetails);
        
        wordItem.appendChild(wordInfo);
        
        // 添加操作按钮容器
        const wordAction = document.createElement('div');
        wordAction.className = 'word-action';
        
        // 添加朗读按钮（只有图标）
        const pronounceButton = document.createElement('button');
        pronounceButton.className = 'pronounce-btn action-btn';
        pronounceButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>';
        pronounceButton.setAttribute('aria-label', 'Pronounce');
        pronounceButton.setAttribute('title', 'Pronounce');
        pronounceButton.addEventListener('click', function(e) {
            e.stopPropagation();
            pronounceSpecificWord(word.term);
        });
        
        wordAction.appendChild(pronounceButton);
        
        // 添加收藏/取消收藏的图标按钮
        const toggleButton = document.createElement('button');
        toggleButton.className = isMastered ? 'toggle-btn action-btn mastered' : 'toggle-btn action-btn';
        toggleButton.innerHTML = isMastered 
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>' 
            : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"></path></svg>';
        toggleButton.setAttribute('aria-label', isMastered ? 'Mark as Learning' : 'Mark as Mastered');
        toggleButton.setAttribute('title', isMastered ? 'Mark as Learning' : 'Mark as Mastered');
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleWordStatus(cardId);
        });
        
        wordAction.appendChild(toggleButton);
        wordItem.appendChild(wordAction);
        
        // 添加点击事件 - 点击单词项目可以打开闪卡但不关闭单词列表
        wordItem.addEventListener('click', function() {
            // 找到当前词在完整数组中的索引
            const wordIndex = lectureData[currentLecture].findIndex(w => w.term === word.term);
            if (wordIndex !== -1) {
                // 打开相应的闪卡但不关闭单词列表
                currentCardIndex = wordIndex;
                showCard();
                updateButtonStates();
            }
        });
        
        wordListContainer.appendChild(wordItem);
    });
}

// 切换单词的已掌握状态
function toggleWordStatus(cardId) {
    const wasKnown = knownCards[cardId];
    const toggleButton = document.querySelector(`.word-item[data-id="${cardId}"] .toggle-btn`);
    
    if (wasKnown) {
        delete knownCards[cardId]; // 如果已掌握，则取消掌握状态
        
        // 更新按钮样式
        if (toggleButton) {
            toggleButton.classList.remove('mastered');
            toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"></path></svg>';
            toggleButton.setAttribute('aria-label', 'Mark as Mastered');
            toggleButton.setAttribute('title', 'Mark as Mastered');
        }
    } else {
        knownCards[cardId] = true; // 如果未掌握，则标记为已掌握
        
        // 更新按钮样式
        if (toggleButton) {
            toggleButton.classList.add('mastered');
            toggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
            toggleButton.setAttribute('aria-label', 'Mark as Learning');
            toggleButton.setAttribute('title', 'Mark as Learning');
            
            // 获取按钮位置
            const rect = toggleButton.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            // 产生撒花效果
            createConfetti(x, y);
        }
    }
    
    saveKnownCards();
    updateStats();
    renderWordList();
}

// 创建爆炸式撒花效果
function createConfetti(x, y) {
    // 清除之前的撒花
    confettiContainer.innerHTML = '';
    
    // 创建多个撒花元素 - 使用马卡龙配色
    const colors = [
        '#f8bbd0', // 粉色
        '#bbdefb', // 蓝色
        '#c8e6c9', // 绿色
        '#fff9c4', // 黄色
        '#e1bee7', // 紫色
        '#ffe0b2'  // 橙色
    ];
    
    // 高亮颜色 - 与马卡龙颜色对应的更鲜艳版本
    const brightColors = [
        '#ec407a', // 亮粉色
        '#42a5f5', // 亮蓝色
        '#66bb6a', // 亮绿色
        '#ffee58', // 亮黄色
        '#ab47bc', // 亮紫色
        '#ffa726'  // 亮橙色
    ];
    
    const shapes = ['square', 'circle', 'triangle', 'star'];
    
    // 创建50-80个撒花元素 (增加数量)
    const particleCount = Math.floor(Math.random() * 30) + 50;
    
    for (let i = 0; i < particleCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = `confetti ${shapes[Math.floor(Math.random() * shapes.length)]}`;
        
        // 随机大小 (5px - 14px，更大范围的尺寸)
        const size = Math.floor(Math.random() * 9) + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        // 随机使用柔和颜色或鲜艳颜色
        const colorSet = Math.random() > 0.4 ? colors : brightColors; // 增加鲜艳颜色的比例
        confetti.style.backgroundColor = colorSet[Math.floor(Math.random() * colorSet.length)];
        
        // 随机起始位置（以点击位置为中心）
        confetti.style.left = `${x}px`;
        confetti.style.top = `${y}px`;
        
        // 使用极坐标方式随机生成方向和距离，实现360度全方位扩散
        const angle = Math.random() * Math.PI * 2; // 0-2π的随机角度
        const distance = 50 + Math.random() * 250; // 50-300px的随机距离
        
        // 将极坐标转换为笛卡尔坐标
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        // 随机旋转角度 (-360到720度，更大范围的旋转)
        const rotate = Math.random() * 1080 - 360;
        
        // 设置CSS变量以供动画使用
        confetti.style.setProperty('--tx', `${tx}px`);
        confetti.style.setProperty('--ty', `${ty}px`);
        confetti.style.setProperty('--rotate', `${rotate}deg`);
        
        // 随机延迟启动 (延长延迟时间，创造更连续的效果)
        confetti.style.animationDelay = `${Math.random() * 0.4}s`;
        
        // 随机动画持续时间 (1.2-2.2秒)
        confetti.style.animationDuration = `${1.2 + Math.random()}s`;
        
        // 添加到容器
        confettiContainer.appendChild(confetti);
    }
    
    // 2.5秒后移除所有撒花元素 (延长显示时间)
    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 2500);
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    init();
    setupTouchGestures();
}); 