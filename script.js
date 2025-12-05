// ==========================================
// 1. INITIAL SETUP & STATE MANAGEMENT
// ==========================================

const defaultState = {
    teamA: { code: "BAN", logo: "" },
    teamB: { code: "IND", logo: "" },
    score: { runs: 0, wickets: 0, overs: 0.0, crr: 0.00 },
    batsmen: [
        { name: "Batter 1", runs: 0, balls: 0, active: true },
        { name: "Batter 2", runs: 0, balls: 0, active: false }
    ],
    bowler: { name: "Bowler", balls: [] } 
};

// Clone default state to current state
let state = JSON.parse(JSON.stringify(defaultState));
let historyStack = [];

window.onload = () => {
    // Load from LocalStorage if exists
    const stored = localStorage.getItem('cricketState');
    if(stored) state = JSON.parse(stored);
    
    // Initial Render
    populateInputs();
    render();
    setupEventListeners();
};

// ==========================================
// 2. MAIN LOGIC (UPDATE & RENDER)
// ==========================================

function updateScoreboard() {
    pushHistory(); // Save old state for Undo

    // 1. Teams
    state.teamA.code = document.getElementById('in-teamA-code').value;
    state.teamB.code = document.getElementById('in-teamB-code').value;
    
    // 2. Score
    state.score.runs = parseInt(document.getElementById('in-runs').value) || 0;
    state.score.wickets = parseInt(document.getElementById('in-wickets').value) || 0;
    state.score.overs = parseFloat(document.getElementById('in-overs').value) || 0;
    state.score.crr = parseFloat(document.getElementById('in-crr').value) || 0;

    // 3. Batters
    const p1Active = document.querySelector('input[name="striker"][value="p1"]').checked;
    
    state.batsmen[0].name = document.getElementById('in-p1-name').value;
    state.batsmen[0].runs = document.getElementById('in-p1-runs').value;
    state.batsmen[0].balls = document.getElementById('in-p1-balls').value;
    state.batsmen[0].active = p1Active;

    state.batsmen[1].name = document.getElementById('in-p2-name').value;
    state.batsmen[1].runs = document.getElementById('in-p2-runs').value;
    state.batsmen[1].balls = document.getElementById('in-p2-balls').value;
    state.batsmen[1].active = !p1Active;

    // 4. Bowler
    state.bowler.name = document.getElementById('in-bowler-name').value;

    saveAndRender();
}

function render() {
    // Teams
    document.getElementById('disp-teamA-code').innerText = state.teamA.code;
    document.getElementById('disp-teamB-code').innerText = state.teamB.code;
    
    const imgA = document.getElementById('disp-teamA-logo');
    const imgB = document.getElementById('disp-teamB-logo');

    if(state.teamA.logo) { imgA.src = state.teamA.logo; imgA.classList.remove('hidden'); }
    else { imgA.classList.add('hidden'); }
    
    if(state.teamB.logo) { imgB.src = state.teamB.logo; imgB.classList.remove('hidden'); }
    else { imgB.classList.add('hidden'); }

    // Score
    document.getElementById('disp-runs').innerText = state.score.runs;
    document.getElementById('disp-wickets').innerText = state.score.wickets;
    document.getElementById('disp-overs').innerText = state.score.overs.toFixed(1);
    document.getElementById('disp-crr').innerText = state.score.crr.toFixed(2);

    // Batters
    document.getElementById('disp-p1-name').innerText = state.batsmen[0].name;
    document.getElementById('disp-p1-runs').innerText = state.batsmen[0].runs;
    document.getElementById('disp-p1-balls').innerText = state.batsmen[0].balls;
    
    document.getElementById('disp-p2-name').innerText = state.batsmen[1].name;
    document.getElementById('disp-p2-runs').innerText = state.batsmen[1].runs;
    document.getElementById('disp-p2-balls').innerText = state.batsmen[1].balls;

    // Striker Icon Logic
    const icon1 = document.getElementById('p1-icon');
    const icon2 = document.getElementById('p2-icon');
    
    if(state.batsmen[0].active) {
        icon1.classList.remove('hidden'); icon2.classList.add('hidden');
        document.getElementById('p1-row').style.color = "#fff"; 
        document.getElementById('p2-row').style.color = "#aaa";
    } else {
        icon1.classList.add('hidden'); icon2.classList.remove('hidden');
        document.getElementById('p1-row').style.color = "#aaa";
        document.getElementById('p2-row').style.color = "#fff";
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
}

function populateInputs() {
    document.getElementById('in-teamA-code').value = state.teamA.code;
    document.getElementById('in-teamB-code').value = state.teamB.code;
    document.getElementById('in-runs').value = state.score.runs;
    document.getElementById('in-wickets').value = state.score.wickets;
    document.getElementById('in-overs').value = state.score.overs;
    document.getElementById('in-crr').value = state.score.crr;

    document.getElementById('in-p1-name').value = state.batsmen[0].name;
    document.getElementById('in-p1-runs').value = state.batsmen[0].runs;
    document.getElementById('in-p1-balls').value = state.batsmen[0].balls;

    document.getElementById('in-p2-name').value = state.batsmen[1].name;
    document.getElementById('in-p2-runs').value = state.batsmen[1].runs;
    document.getElementById('in-p2-balls').value = state.batsmen[1].balls;
    
    const radios = document.getElementsByName('striker');
    if(state.batsmen[0].active) radios[0].checked = true;
    else radios[1].checked = true;

    document.getElementById('in-bowler-name').value = state.bowler.name;
}

// ==========================================
// 3. NEW FEATURES (RESET, VALIDATION, ENTER)
// ==========================================

function setupEventListeners() {
    // 1. File Uploads
    document.getElementById('in-teamA-logo').addEventListener('change', (e) => handleImage(e, 'teamA'));
    document.getElementById('in-teamB-logo').addEventListener('change', (e) => handleImage(e, 'teamB'));

    // 2. Enter Key Auto-Update for ALL inputs
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.target.id === 'in-ball-val') return; // Handled specially
                updateScoreboard();
                // Optional: visual feedback
                e.target.style.backgroundColor = '#333';
                setTimeout(() => e.target.style.backgroundColor = '#111', 100);
            }
        });
    });

    // 3. Number Validation (Prevent Text in Number Fields)
    document.querySelectorAll('.validate-num').forEach(input => {
        input.addEventListener('keydown', (e) => {
            // Allow: Backspace, Delete, Tab, Escape, Enter, Decimal Point (.)
            if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V
                (e.ctrlKey === true && (e.key === 'a' || e.key === 'c' || e.key === 'v')) ||
                // Allow: Arrow keys
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                    return;
            }
            // Ensure that it is a number. If not, stop the keypress.
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
                // alert("Only numbers allowed here!"); // Uncomment if you want an alert
            }
        });
    });
}

function resetMatch() {
    if(confirm("⚠️ Are you sure you want to RESET EVERYTHING? All scores will be lost.")) {
        state = JSON.parse(JSON.stringify(defaultState)); // Revert to default
        historyStack = []; // Clear history
        saveAndRender();
        populateInputs();
    }
}

// ==========================================
// 4. BALL & UTILITY FUNCTIONS
// ==========================================

function addBallFromInput() {
    const input = document.getElementById('in-ball-val');
    const val = input.value.trim();
    if(!val) return;

    pushHistory();
    state.bowler.balls.push(val);
    if(state.bowler.balls.length > 8) state.bowler.balls.shift();

    // Auto-Calcs
    if(!isNaN(val)) {
        const runs = parseInt(val);
        state.score.runs += runs;
        
        const striker = state.batsmen.find(b => b.active);
        if(striker) {
            striker.runs = parseInt(striker.runs) + runs;
            striker.balls = parseInt(striker.balls) + 1;
        }
    } else if (val.toUpperCase() === 'W') {
        state.score.wickets += 1;
        const striker = state.batsmen.find(b => b.active);
        if(striker) striker.balls = parseInt(striker.balls) + 1;
    }

    input.value = '';
    populateInputs(); 
    saveAndRender();
}

function quickUpdate(val) {
    document.getElementById('in-ball-val').value = val;
    addBallFromInput();
}

function handleEnter(e) {
    if(e.key === 'Enter') addBallFromInput();
}

function saveAndRender() {
    localStorage.setItem('cricketState', JSON.stringify(state));
    render();
}

function pushHistory() {
    historyStack.push(JSON.parse(JSON.stringify(state)));
    if(historyStack.length > 20) historyStack.shift();
}

function undo() {
    if(historyStack.length === 0) return;
    state = historyStack.pop();
    populateInputs();
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