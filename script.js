// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================

const defaultState = {
    matchInfo: { title: "", toss: "" },
    teamA: { code: "BAN", logo: "" },
    teamB: { code: "IND", logo: "" },
    score: { runs: 0, wickets: 0, overs: 0.0, totalLegalBalls: 0, crr: 0.00 },
    batsmen: [
        { name: "Batter 1", runs: 0, balls: 0, active: true },
        { name: "Batter 2", runs: 0, balls: 0, active: false }
    ],
    bowler: { name: "Bowler", balls: [] }, // balls array stores "1", "W", "WD", etc.
    ballHistory: [] // Stores deep copy of state for Undo
};

let state = JSON.parse(JSON.stringify(defaultState));
let historyStack = []; // Array of JSON strings

window.onload = () => {
    loadState();
    setupEventListeners();
    render();
};

// ==========================================
// 2. CORE FUNCTIONS
// ==========================================

function manualUpdate() {
    pushHistory(); // Save before manual edit
    
    // Read all inputs into state
    state.matchInfo.title = document.getElementById('in-match-title').value;
    state.matchInfo.toss = document.getElementById('in-toss-result').value;

    state.teamA.code = document.getElementById('in-teamA-code').value;
    state.teamB.code = document.getElementById('in-teamB-code').value;

    state.score.runs = parseInt(document.getElementById('in-runs').value) || 0;
    state.score.wickets = parseInt(document.getElementById('in-wickets').value) || 0;
    
    // Manual over override (handle carefully)
    const oversInput = parseFloat(document.getElementById('in-overs').value) || 0;
    // We try to approximate legal balls from overs input if manually changed
    const ballsFromOvers = Math.floor(oversInput) * 6 + Math.round((oversInput % 1) * 10);
    // If the manual input drastically differs from tracking, update tracking (simplistic approach)
    // Ideally, we rely on ball-by-ball, but manual override is allowed.
    if(ballsFromOvers !== state.score.totalLegalBalls) {
        state.score.totalLegalBalls = ballsFromOvers;
    }
    state.score.overs = oversInput;

    // Batters
    const p1Active = document.querySelector('input[name="striker"][value="p1"]').checked;
    state.batsmen[0].name = document.getElementById('in-p1-name').value;
    state.batsmen[0].runs = parseInt(document.getElementById('in-p1-runs').value) || 0;
    state.batsmen[0].balls = parseInt(document.getElementById('in-p1-balls').value) || 0;
    state.batsmen[0].active = p1Active;

    state.batsmen[1].name = document.getElementById('in-p2-name').value;
    state.batsmen[1].runs = parseInt(document.getElementById('in-p2-runs').value) || 0;
    state.batsmen[1].balls = parseInt(document.getElementById('in-p2-balls').value) || 0;
    state.batsmen[1].active = !p1Active;

    state.bowler.name = document.getElementById('in-bowler-name').value;

    calculateDerivedStats();
    saveAndRender();
}

// Logic to add a ball (The Heart of the System)
function addBall(val) {
    pushHistory();

    val = val.toString().toUpperCase();
    let runsScored = 0;
    let isLegal = true;
    let isWicket = false;

    // Parse Input
    if (val === 'W') {
        isWicket = true;
        isLegal = true;
    } else if (val === 'WD') {
        runsScored = 1; // Standard Wide Rule
        isLegal = false;
    } else if (val === 'NB') {
        runsScored = 1; // Standard NB Rule
        isLegal = false; // Usually ball doesn't count towards over, but run counts
    } else if (!isNaN(val)) {
        runsScored = parseInt(val);
        isLegal = true;
    }

    // 1. Update Match Score
    state.score.runs += runsScored;
    if (isWicket) state.score.wickets += 1;
    if (isLegal) state.score.totalLegalBalls += 1;

    // 2. Update Batters (Striker)
    const striker = state.batsmen.find(b => b.active);
    if (striker) {
        if (val !== 'WD') { // Wides don't go to batter stats usually
            striker.balls += 1;
        }
        if (!isNaN(val)) {
            striker.runs += runsScored;
        }
    }

    // 3. Update Bowler & Over History
    state.bowler.balls.push(val);
    if (state.bowler.balls.length > 8) state.bowler.balls.shift(); // Keep last 8 balls visual

    // 4. Auto Rotate Strike (Optional but helpful logic)
    // Rotate on 1, 3 (and end of over - handled in calc)
    if (!isNaN(val)) {
        if (parseInt(val) % 2 !== 0) {
            rotateStrike();
        }
    }

    calculateDerivedStats();
    
    // Clear input box if focused
    document.getElementById('in-ball-val').value = '';
    
    saveAndRender();
}

function calculateDerivedStats() {
    // 1. Calculate Overs
    const totalBalls = state.score.totalLegalBalls;
    const completedOvers = Math.floor(totalBalls / 6);
    const ballsInOver = totalBalls % 6;
    state.score.overs = parseFloat(completedOvers + "." + ballsInOver);

    // 2. Calculate Run Rate
    if (totalBalls > 0) {
        // Runs per over
        // totalBalls / 6 = overs decimal (e.g. 3 balls = 0.5 overs mathematically for division)
        const mathOvers = totalBalls / 6;
        state.score.crr = state.score.runs / mathOvers;
    } else {
        state.score.crr = 0.00;
    }

    // Check for Over End (6 legal balls) -> Optional: could alert or swap strike
    // Implementing pure display logic mostly.
    if(ballsInOver === 0 && totalBalls > 0) {
         // End of Over - Strike Rotation logic is typically done here too
         rotateStrike(); 
    }
}

function rotateStrike() {
    state.batsmen[0].active = !state.batsmen[0].active;
    state.batsmen[1].active = !state.batsmen[1].active;
}

// ==========================================
// 3. RENDER & DOM
// ==========================================

function render() {
    // Teams
    document.getElementById('disp-teamA-code').innerText = state.teamA.code;
    document.getElementById('disp-teamB-code').innerText = state.teamB.code;
    
    setImg('disp-teamA-logo', state.teamA.logo);
    setImg('disp-teamB-logo', state.teamB.logo);

    // Score
    document.getElementById('disp-runs').innerText = state.score.runs;
    document.getElementById('disp-wickets').innerText = state.score.wickets;
    document.getElementById('disp-overs').innerText = state.score.overs.toFixed(1);
    document.getElementById('disp-crr').innerText = state.score.crr.toFixed(2);

    // Batters
    const b1 = state.batsmen[0];
    const b2 = state.batsmen[1];

    document.getElementById('disp-p1-name').innerText = b1.name;
    document.getElementById('disp-p1-runs').innerText = b1.runs;
    document.getElementById('disp-p1-balls').innerText = b1.balls;
    
    document.getElementById('disp-p2-name').innerText = b2.name;
    document.getElementById('disp-p2-runs').innerText = b2.runs;
    document.getElementById('disp-p2-balls').innerText = b2.balls;

    // Icons / Active State
    const icon1 = document.getElementById('p1-icon');
    const icon2 = document.getElementById('p2-icon');
    const row1 = document.getElementById('p1-row');
    const row2 = document.getElementById('p2-row');

    if(b1.active) {
        icon1.classList.remove('hidden'); icon2.classList.add('hidden');
        row1.style.color = "#fff"; row2.style.color = "#aaa";
    } else {
        icon1.classList.add('hidden'); icon2.classList.remove('hidden');
        row1.style.color = "#aaa"; row2.style.color = "#fff";
    }

    // Bowler
    document.getElementById('disp-bowler-name').innerText = state.bowler.name;
    
    // Balls Grid
    const grid = document.getElementById('disp-balls-container');
    grid.innerHTML = '';
    state.bowler.balls.forEach(ball => {
        let div = document.createElement('div');
        div.className = `ball ball-${ball}`;
        div.innerText = ball;
        grid.appendChild(div);
    });

    // Populate Inputs (Sync UI with State)
    syncInputs();
}

function syncInputs() {
    document.getElementById('in-match-title').value = state.matchInfo.title;
    document.getElementById('in-toss-result').value = state.matchInfo.toss;
    
    document.getElementById('in-teamA-code').value = state.teamA.code;
    document.getElementById('in-teamB-code').value = state.teamB.code;
    
    document.getElementById('in-runs').value = state.score.runs;
    document.getElementById('in-wickets').value = state.score.wickets;
    document.getElementById('in-overs').value = state.score.overs;
    document.getElementById('in-crr').value = state.score.crr.toFixed(2);
    document.getElementById('in-total-balls').value = state.score.totalLegalBalls;

    document.getElementById('in-p1-name').value = state.batsmen[0].name;
    document.getElementById('in-p1-runs').value = state.batsmen[0].runs;
    document.getElementById('in-p1-balls').value = state.batsmen[0].balls;

    document.getElementById('in-p2-name').value = state.batsmen[1].name;
    document.getElementById('in-p2-runs').value = state.batsmen[1].runs;
    document.getElementById('in-p2-balls').value = state.batsmen[1].balls;
    
    const radios = document.getElementsByName('striker');
    radios[0].checked = state.batsmen[0].active;
    radios[1].checked = state.batsmen[1].active;

    document.getElementById('in-bowler-name').value = state.bowler.name;
}

function setImg(id, src) {
    const img = document.getElementById(id);
    if(src) { img.src = src; img.classList.remove('hidden'); }
    else { img.classList.add('hidden'); }
}

// ==========================================
// 4. STORAGE & HISTORY (UNDO/RESET)
// ==========================================

function saveAndRender() {
    localStorage.setItem('scb_state', JSON.stringify(state));
    render();
}

function loadState() {
    const stored = localStorage.getItem('scb_state');
    if(stored) state = JSON.parse(stored);
}

function pushHistory() {
    // Deep clone state into history
    historyStack.push(JSON.stringify(state));
    if(historyStack.length > 50) historyStack.shift(); // Limit history
}

function undo() {
    if(historyStack.length > 0) {
        const prev = historyStack.pop();
        state = JSON.parse(prev);
        saveAndRender();
    } else {
        alert("No more history to undo!");
    }
}

function resetMatch() {
    if(confirm("⚠️ RESET SCOREBOARD? This cannot be undone.")) {
        state = JSON.parse(JSON.stringify(defaultState));
        historyStack = [];
        saveAndRender();
    }
}

// ==========================================
// 5. EVENT LISTENERS & SHORTCUTS
// ==========================================

function setupEventListeners() {
    // File Inputs
    document.getElementById('in-teamA-logo').addEventListener('change', (e) => handleImage(e, 'teamA'));
    document.getElementById('in-teamB-logo').addEventListener('change', (e) => handleImage(e, 'teamB'));

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input (except for Enter inside inputs)
        const isInput = e.target.tagName === 'INPUT';
        
        // 1. Enter Key (Update)
        if(e.key === 'Enter') {
            if(e.target.id === 'in-ball-val') return; // Handled separately
            manualUpdate();
            // Flash effect
            document.body.style.backgroundColor = '#444';
            setTimeout(() => document.body.style.backgroundColor = '#333', 100);
            return;
        }

        // 2. Control Keys
        if(e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            undo();
        }
        if(e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            resetMatch();
        }

        // 3. Focus Shortcuts (Only if not already typing in text box)
        if(!isInput && !e.ctrlKey) {
            const key = e.key.toLowerCase();
            const target = document.querySelector(`.input-focus-target[data-key="${key}"]`);
            if(target) {
                e.preventDefault();
                target.focus();
            }
        }
    });
}

function handleBallInputEnter(e) {
    if(e.key === 'Enter') {
        processBallInput();
    }
}

function processBallInput() {
    const input = document.getElementById('in-ball-val');
    const val = input.value.trim();
    if(val) {
        addBall(val);
    }
}

function swapTeams() {
    pushHistory();
    // Swap Batting/Bowling logic essentially swaps Team A and Team B metadata
    const tempCode = state.teamA.code;
    const tempLogo = state.teamA.logo;
    
    state.teamA.code = state.teamB.code;
    state.teamA.logo = state.teamB.logo;
    
    state.teamB.code = tempCode;
    state.teamB.logo = tempLogo;
    
    // Also likely reset score for new innings? 
    // For now, prompt instruction implies swapping names/order, but if it's innings break, user should use Reset or manually set score to 0.
    // We will just swap names/logos here.
    
    saveAndRender();
}

function handleImage(e, team) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            state[team].logo = evt.target.result;
            saveAndRender();
        }
        reader.readAsDataURL(file);
    }
}