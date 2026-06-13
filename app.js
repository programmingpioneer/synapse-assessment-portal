// ==========================================
// 1. DYNAMIC STATE MATRIX
// ==========================================
// Ab koi hardcoded array nahi. Sab kuch live internet se aayega.
const state = {
    assignmentCount: 1,   // Track karega kitne assignments de chuka hai
    currentQuestionIndex: 0,
    score: 0,
    timeLeft: 15,
    timerId: null,
    startTime: null,
    selectedAnswer: null,
    history: [],
    activeQuestions: []   // API ka live data yahan store hoga
};

// ==========================================
// 2. DOM CACHING (The Arms & Legs)
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
    chartPlaceholder: document.getElementById('chart-placeholder')
};

// ==========================================
// 3. UTILITY: HTML DECODER
// ==========================================
// APIs aksar symbols ko encode kar deti hain (jaise &quot; for "). Yeh unko clean karta hai.
function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

// ==========================================
// 4. PORTAL INITIALIZATION
// ==========================================
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
// 5. ASYNC API FETCH ENGINE (THE MAGIC)
// ==========================================
elements.startBtn.addEventListener('click', async () => {
    // Button ko loading state mein daalo taake user spam click na kare
    elements.startBtn.textContent = "Fetching Live Data...";
    elements.startBtn.disabled = true;

    try {
        // Open Trivia Database se 5 random Computer Science (Category 18) questions mangwao
        const response = await fetch('https://opentdb.com/api.php?amount=5&category=18&type=multiple');
        const data = await response.json();

        // Data ko apne pure frontend format mein map karo
        state.activeQuestions = data.results.map(q => {
            const options = [...q.incorrect_answers];
            // Sahi answer ko randomly kisi bhi index par ghusa do (0 se 3 ke beech)
            const correctIndex = Math.floor(Math.random() * 4);
            options.splice(correctIndex, 0, q.correct_answer);
            
            return {
                question: decodeHTML(q.question),
                options: options.map(decodeHTML),
                correctAnswer: correctIndex
            };
        });

        // Data aagaya, ab Engine start karo
        elements.startScreen.classList.add('hidden');
        elements.quizScreen.classList.remove('hidden');
        state.currentQuestionIndex = 0;
        state.score = 0;
        loadQuestion();

    } catch (error) {
        console.error("API Error:", error);
        elements.startBtn.textContent = "Network Error. Try Again ⚡";
        elements.startBtn.disabled = false;
    }
});

// ==========================================
// 6. CORE QUIZ ENGINE
// ==========================================
function loadQuestion() {
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
// 7. PRECISION DRIFT-FREE TIMER
// ==========================================
function startIntervalTimer() {
    if(state.timerId) clearInterval(state.timerId);
    
    state.timeLeft = 15;
    state.startTime = Date.now(); 
    
    elements.timeLeftDisplay.textContent = state.timeLeft;
    elements.timerProgress.style.width = "100%";

    state.timerId = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        state.timeLeft = 15 - elapsedSeconds;

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
    }, 200); 
}

function evaluateAndProgress() {
    if(state.timerId) clearInterval(state.timerId);

    const currentData = state.activeQuestions[state.currentQuestionIndex];
    if (state.selectedAnswer === currentData.correctAnswer) {
        state.score++;
    }
    
    state.currentQuestionIndex++;
    state.selectedAnswer = null;
    elements.nextBtn.classList.add('hidden');
    
    if (state.currentQuestionIndex < state.activeQuestions.length) {
        loadQuestion();
    } else {
        endQuiz();
    }
}

// ==========================================
// 8. RESULT & DYNAMIC ANALYTICS
// ==========================================
function endQuiz() {
    if(state.timerId) clearInterval(state.timerId);
    
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
    
    // Engine always unlocks the next assignment now! Infinite loop!
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
    
    const paddingLeft = 20;
    const paddingRight = 280;
    const chartHeight = 120;
    
    let pathData = "";
    elements.chartDots.innerHTML = "";
    
    state.history.forEach((attempt, index) => {
        const x = total === 1 ? 150 : paddingLeft + (index / (total - 1)) * (paddingRight - paddingLeft);
        const y = 135 - (attempt.scorePercentage / 100) * chartHeight;
        
        if (index === 0) pathData += `M ${x} ${y}`;
        else pathData += ` L ${x} ${y}`;
        
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", 5);
        circle.setAttribute("class", "chart-dot");
        
        elements.chartDots.appendChild(circle);
    });
    
    elements.chartPath.setAttribute("d", pathData);
}

// Next task router hook - Triggers infinite progression
elements.nextTaskBtn.addEventListener('click', () => {
    state.assignmentCount++; // Naya module number
    elements.resultScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');
    setupAssignmentMeta();
});

// Restart Tracking
elements.restartBtn.addEventListener('click', () => {
    elements.resultScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');
});

// Volatile Refresh Reset
window.addEventListener('DOMContentLoaded', () => {
    state.history = [];
    state.assignmentCount = 1;
    elements.authModal.classList.remove('hidden');
    updateAnalytics();
});