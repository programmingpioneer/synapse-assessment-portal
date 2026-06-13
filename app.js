// ==========================================
// 1. DYNAMIC STATE MATRIX
// ==========================================
const state = {
    assignmentCount: 1,
    currentQuestionIndex: 0,
    score: 0,
    timeLeft: 15,
    timerId: null,
    startTime: null,
    selectedAnswer: null,
    history: [],
    activeQuestions: []
};

// ==========================================
// 2. SYNTHETIC AUDIO ENGINE (No MP3s Allowed)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency, type, duration, volume = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

const AudioFX = {
    tick: () => playTone(800, 'sine', 0.1, 0.05),
    correct: () => {
        playTone(600, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(800, 'sine', 0.2, 0.15), 100);
    },
    wrong: () => playTone(200, 'sawtooth', 0.3, 0.1)
};

// ==========================================
// 3. TEXT-TO-SPEECH ENGINE
// ==========================================
function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 1.05;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

// ==========================================
// 4. DOM CACHING
// ==========================================
const elements = {
    authModal: document.getElementById('auth-modal'),
    startScreen: document.getElementById('start-screen'),
    quizScreen: document.getElementById('quiz-screen'),
    resultScreen: document.getElementById('result-screen'),
    profileSidebar: document.getElementById('profile-sidebar'),
    authForm: document.getElementById('auth-form'),
    userNameInput: document.getElementById('user-fullname'),
    userEmailInput: document.getElementById('user-email'),
    sidebarName: document.getElementById('sidebar-name'),
    sidebarEmail: document.getElementById('sidebar-email'),
    avatarInitials: document.getElementById('avatar-initials'),
    assignmentTitle: document.getElementById('assignment-title'),
    metaSubject: document.getElementById('meta-subject'),
    startBtn: document.getElementById('start-btn'),
    nextBtn: document.getElementById('next-btn'),
    nextTaskBtn: document.getElementById('next-task-btn'),
    restartBtn: document.getElementById('restart-btn'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    currentQuestionNum: document.getElementById('current-question-num'),
    timeLeftDisplay: document.getElementById('time-left'),
    timerProgress: document.getElementById('timer-progress'),
    finalScoreDisplay: document.getElementById('final-score'),
    finalPercentageDisplay: document.getElementById('final-percentage'),
    performanceFeedback: document.getElementById('performance-feedback'),
    statAttempts: document.getElementById('stat-attempts'),
    statHigh: document.getElementById('stat-high'),
    chartPath: document.getElementById('chart-path'),
    chartDots: document.getElementById('chart-dots'),
    chartPlaceholder: document.getElementById('chart-placeholder'),
    readAloudBtn: document.getElementById('read-aloud-btn')
};

// ==========================================
// 5. UTILITY & INIT
// ==========================================
function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

elements.authForm.addEventListener('submit', function() {
    const name = elements.userNameInput.value.trim();
    const email = elements.userEmailInput.value.trim();
    if(!name || !email) return;
    initPortal(name, email);
});

function initPortal(name, email) {
    elements.sidebarName.textContent = name;
    elements.sidebarEmail.textContent = email;
    const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2);
    elements.avatarInitials.textContent = initials;
    elements.authModal.classList.add('hidden');
    updateAnalytics();
    setupAssignmentMeta();
}

function setupAssignmentMeta() {
    elements.assignmentTitle.textContent = `Assignment Matrix: Module ${state.assignmentCount}`;
    elements.metaSubject.textContent = "Dynamic Computer Science API Generation";
    elements.startBtn.textContent = "Initialize Assessment Matrix";
    elements.startBtn.disabled = false;
}

// ==========================================
// 6. ASYNC API FETCH ENGINE
// ==========================================
elements.startBtn.addEventListener('click', async () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    elements.startBtn.textContent = "Fetching Live Data...";
    elements.startBtn.disabled = true;

    try {
        const response = await fetch('https://opentdb.com/api.php?amount=5&category=18&type=multiple');
        const data = await response.json();

        state.activeQuestions = data.results.map(q => {
            const options = [...q.incorrect_answers];
            const correctIndex = Math.floor(Math.random() * 4);
            options.splice(correctIndex, 0, q.correct_answer);
            return {
                question: decodeHTML(q.question),
                options: options.map(decodeHTML),
                correctAnswer: correctIndex
            };
        });

        elements.startScreen.classList.add('hidden');
        elements.quizScreen.classList.remove('hidden');
        state.currentQuestionIndex = 0;
        state.score = 0;
        loadQuestion();

    } catch (error) {
        elements.startBtn.textContent = "Network Error. Try Again ⚡";
        elements.startBtn.disabled = false;
    }
});

// ==========================================
// 7. CORE QUIZ ENGINE
// ==========================================
function loadQuestion() {
    window.speechSynthesis.cancel();
    const currentData = state.activeQuestions[state.currentQuestionIndex];
    
    elements.currentQuestionNum.textContent = state.currentQuestionIndex + 1;
    elements.questionText.textContent = currentData.question;
    
    while (elements.optionsContainer.firstChild) {
        elements.optionsContainer.removeChild(elements.optionsContainer.firstChild);
    }
    
    currentData.options.forEach((optionText, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        
        const textSpan = document.createElement('span');
        textSpan.textContent = optionText;
        
        const indicator = document.createElement('span');
        indicator.classList.add('indicator');
        indicator.textContent = String.fromCharCode(65 + index);
        
        btn.appendChild(textSpan);
        btn.appendChild(indicator);
        
        btn.addEventListener('click', () => selectAnswer(index));
        elements.optionsContainer.appendChild(btn);
    });

    startIntervalTimer();
}

// Read Aloud Event Listener
elements.readAloudBtn.addEventListener('click', () => {
    const currentData = state.activeQuestions[state.currentQuestionIndex];
    const fullText = `${currentData.question}... Options are: A... ${currentData.options[0]}... B... ${currentData.options[1]}... C... ${currentData.options[2]}... D... ${currentData.options[3]}`;
    speakText(fullText);
});

function selectAnswer(selectedIndex) {
    const allOptions = elements.optionsContainer.children;
    for (let i = 0; i < allOptions.length; i++) {
        allOptions[i].classList.remove('selected');
    }
    allOptions[selectedIndex].classList.add('selected');
    state.selectedAnswer = selectedIndex;
    elements.nextBtn.classList.remove('hidden');
}

elements.nextBtn.addEventListener('click', () => {
    evaluateAndProgress();
});

// ==========================================
// 8. PRECISION DRIFT-FREE TIMER WITH AUDIO
// ==========================================
let lastTickSecond = 15;

function startIntervalTimer() {
    if(state.timerId) clearInterval(state.timerId);
    
    state.timeLeft = 15;
    lastTickSecond = 15;
    state.startTime = Date.now(); 
    
    elements.timeLeftDisplay.textContent = state.timeLeft;
    elements.timerProgress.style.width = "100%";

    state.timerId = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        state.timeLeft = 15 - elapsedSeconds;

        if (state.timeLeft <= 5 && state.timeLeft > 0 && state.timeLeft !== lastTickSecond) {
            AudioFX.tick();
            lastTickSecond = state.timeLeft;
        }

        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            elements.timeLeftDisplay.textContent = "0";
            elements.timerProgress.style.width = "0%";
            clearInterval(state.timerId);
            evaluateAndProgress();
        } else {
            elements.timeLeftDisplay.textContent = state.timeLeft;
            const percentageWidth = (state.timeLeft / 15) * 100;
            elements.timerProgress.style.width = `${percentageWidth}%`;
        }
    }, 100);
}

function evaluateAndProgress() {
    if(state.timerId) clearInterval(state.timerId);
    window.speechSynthesis.cancel();

    const currentData = state.activeQuestions[state.currentQuestionIndex];
    
    if (state.selectedAnswer === currentData.correctAnswer) {
        state.score++;
        AudioFX.correct();
    } else {
        AudioFX.wrong();
    }
    
    state.currentQuestionIndex++;
    state.selectedAnswer = null;
    elements.nextBtn.classList.add('hidden');
    
    if (state.currentQuestionIndex < state.activeQuestions.length) {
        setTimeout(loadQuestion, 400);
    } else {
        setTimeout(endQuiz, 400);
    }
}

// ==========================================
// 9. RESULT & DYNAMIC ANALYTICS
// ==========================================
function endQuiz() {
    elements.quizScreen.classList.add('hidden');
    elements.resultScreen.classList.remove('hidden');
    
    const totalQ = state.activeQuestions.length;
    const pct = Math.round((state.score / totalQ) * 100);
    
    elements.finalScoreDisplay.textContent = state.score + " / " + totalQ;
    elements.finalPercentageDisplay.textContent = pct + "%";
    
    if(pct >= 80) elements.performanceFeedback.textContent = "Excellent verification output. Matrix optimal.";
    else if(pct >= 60) elements.performanceFeedback.textContent = "Acceptable benchmark. Try pushing harder.";
    else elements.performanceFeedback.textContent = "Evaluation threshold unmet. Re-study operational guidelines.";
    
    state.history.push({ scorePercentage: pct });
    updateAnalytics();
    
    elements.nextTaskBtn.classList.remove('hidden');
}

function updateAnalytics() {
    const total = state.history.length;
    elements.statAttempts.textContent = total;
    if (total === 0) {
        elements.statHigh.textContent = "0%";
        elements.chartPlaceholder.classList.remove('hidden');
        return;
    }
    const highest = Math.max(...state.history.map(item => item.scorePercentage));
    elements.statHigh.textContent = highest + "%";
    elements.chartPlaceholder.classList.add('hidden');
    
    const paddingLeft = 20, paddingRight = 280, chartHeight = 120;
    let pathData = "";
    elements.chartDots.innerHTML = "";
    
    state.history.forEach((attempt, index) => {
        const x = total === 1 ? 150 : paddingLeft + (index / (total - 1)) * (paddingRight - paddingLeft);
        const y = 135 - (attempt.scorePercentage / 100) * chartHeight;
        if (index === 0) pathData += `M ${x} ${y}`;
        else pathData += ` L ${x} ${y}`;
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x); circle.setAttribute("cy", y); circle.setAttribute("r", 5);
        circle.setAttribute("class", "chart-dot");
        elements.chartDots.appendChild(circle);
    });
    elements.chartPath.setAttribute("d", pathData);
}

elements.nextTaskBtn.addEventListener('click', () => {
    state.assignmentCount++;
    elements.resultScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');
    setupAssignmentMeta();
});

elements.restartBtn.addEventListener('click', () => {
    elements.resultScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');
});

// ==========================================
// 10. ABOUT & DOCUMENTATION MODAL TOGGLES
// ==========================================
const aboutLink = document.getElementById('about-link');
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');

const docLink = document.getElementById('documentation-link');
const docModal = document.getElementById('documentation-modal');
const closeDoc = document.getElementById('close-doc');

function openModal(modal) {
    modal.classList.remove('hidden');
}
function closeModal(modal) {
    modal.classList.add('hidden');
}

aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(aboutModal);
});
docLink.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(docModal);
});

closeAbout.addEventListener('click', () => closeModal(aboutModal));
closeDoc.addEventListener('click', () => closeModal(docModal));

// Close modals when clicking outside the content
window.addEventListener('click', (e) => {
    if (e.target === aboutModal) closeModal(aboutModal);
    if (e.target === docModal) closeModal(docModal);
});

// ==========================================
// 11. DARK/LIGHT MODE TOGGLE
// ==========================================
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

function setTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
    localStorage.setItem('synapse-theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙';
    localStorage.setItem('synapse-theme', 'light');
  }
}

const savedTheme = localStorage.getItem('synapse-theme');
if (savedTheme === 'dark') {
  setTheme(true);
} else if (savedTheme === 'light') {
  setTheme(false);
} else {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark);
}

themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  setTheme(!isDark);
});

window.addEventListener('DOMContentLoaded', () => {
    state.history = [];
    state.assignmentCount = 1;
    elements.authModal.classList.remove('hidden');
    updateAnalytics();
});