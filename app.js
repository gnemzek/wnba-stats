const GAMES_LIST = document.getElementById('games-list');
const STATUS_BANNER = document.getElementById('status-banner');
const DATE_DISPLAY = document.getElementById('current-date');
const TAB_BUTTONS = document.querySelectorAll('.tab-btn');
const MODAL = document.getElementById('team-modal');
const MODAL_BODY = document.getElementById('modal-body');
const CLOSE_MODAL_BTN = document.getElementById('close-modal');

// Close modal handlers
CLOSE_MODAL_BTN.addEventListener('click', closeModal);
MODAL.addEventListener('click', (e) => { if (e.target === MODAL) closeModal(); });

function closeModal() {
    MODAL.classList.remove('active');
    MODAL.classList.add('hidden'); // Ensure it display-none blocks again
}

// Helper function to format any date into ESPN's YYYYMMDD string format
function getEspnDateString(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset); // Shifts day backward or forward

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
}

// Global variable to keep track of which day we are actively viewing
let currentOffset = 0;


async function checkGames(offset = 0) {
    try {
        // Show loading state while switching tabs
        GAMES_LIST.classList.add('hidden');
        STATUS_BANNER.innerText = "Loading games...";
        STATUS_BANNER.className = "loading";

        const dateStr = getEspnDateString(offset);
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${dateStr}`);
        const data = await response.json();

        // SAFE DATE DISPLAY FIX:
        // If ESPN doesn't return data.day.date, we generate the label locally
        if (data.day && data.day.date) {
            DATE_DISPLAY.innerText = data.day.date;
        } else {
            const labelDate = new Date();
            labelDate.setDate(labelDate.getDate() + offset);
            DATE_DISPLAY.innerText = labelDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        }

        const games = data.events;

        if (games && games.length > 0) {
            displayGames(games);
        } else {
            displayNoGames();
        }
    } catch (error) {
        console.error("Error fetching ESPN data:", error);
        STATUS_BANNER.innerText = "Error loading matchups.";
        STATUS_BANNER.className = "no-status";
    }
}

// Set up Event Listeners for the Navigation Buttons
document.getElementById('btn-yesterday').addEventListener('click', (e) => switchTab(e, -1));
document.getElementById('btn-today').addEventListener('click', (e) => switchTab(e, 0));
document.getElementById('btn-tomorrow').addEventListener('click', (e) => switchTab(e, 1));

function switchTab(event, offset) {
    // 1. Remove active class from all buttons
    TAB_BUTTONS.forEach(btn => btn.classList.remove('active'));

    // 2. Add active class to the button that was just clicked
    event.target.classList.add('active');

    // 3. Fetch the new data
    checkGames(offset);
}

function displayGames(games) {
    STATUS_BANNER.innerText = "";
    STATUS_BANNER.className = "yes-status";

    // 1. Prepare the layout grid (un-hide it while it's still at opacity 0)
    GAMES_LIST.classList.remove('hidden');
    GAMES_LIST.classList.remove('fade-in-active');
    GAMES_LIST.innerHTML = '';

    games.forEach(game => {
        const homeTeamData = game.competitions[0].competitors[0];
        const awayTeamData = game.competitions[0].competitors[1];

        const homeName = homeTeamData.team.displayName;
        const homeLogo = homeTeamData.team.logo;
        const homeScore = parseInt(homeTeamData.score) || 0;

        const awayName = awayTeamData.team.displayName;
        const awayLogo = awayTeamData.team.logo;
        const awayScore = parseInt(awayTeamData.score) || 0;

        const homeId = homeTeamData.team.id;
        const awayId = awayTeamData.team.id;

        const gameStatus = game.status.type.detail;
        const broadcasts = game.competitions[0].broadcasts;
        const tvChannel = broadcasts && broadcasts.length > 0 ? broadcasts[0].names[0] : "";

        // --- NEW: CRUNCH TIME ALERT LOGIC ---
        const gameState = game.status.type.state; // "pre", "in", or "post"
        const period = game.status.period; // 1, 2, 3, 4, or 5 (OT)

        // Calculate point differential
        const scoreDifference = Math.abs(homeScore - awayScore);

        // Condition: Game is live ("in"), it's the 4th quarter or Overtime (period >= 4), 
        // and the score deficit is 5 points or less.
        let isCrunchTime = false;
        if (gameState === "in" && period >= 3 && scoreDifference <= 6) {
            isCrunchTime = true;
        }

        // -------------------------------------



        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';

        // If crunch time is true, we will inject our animated badge underneath the VS layout
        gameCard.innerHTML = `
        <div class="team visitor">
            <img src="${awayLogo}" alt="${awayName} logo" class="team-logo">
            <span class="team-name">${awayName}</span>
            <span class="team-score">${homeScore > 0 || awayScore > 0 ? awayScore : ''}</span>
        </div>
        
        <div class="vs-container">
            <div class="vs">@</div>
            ${tvChannel ? `<div class="tv-tag">${tvChannel}</div>` : ''}
            ${isCrunchTime ? `<div class="crunch-time-tag">Close Game!</div>` : ''}
        </div>
        
        <div class="team home">
            <span class="team-score">${homeScore > 0 || awayScore > 0 ? homeScore : ''}</span>
            <span class="team-name">${homeName}</span>
            <img src="${homeLogo}" alt="${homeName} logo" class="team-logo">
        </div>
        
        <div class="game-info">${gameStatus}</div>
        `;


        // Capture data points specifically for the modal sheet lookup
        const homeRecord = homeTeamData.records && homeTeamData.records.length > 0 ? homeTeamData.records[0].summary : "0-0";
        const awayRecord = awayTeamData.records && awayTeamData.records.length > 0 ? awayTeamData.records[0].summary : "0-0";

        // ATTACH THE CLICK EVENT INTERCEPTOR TO THE CARD
        gameCard.addEventListener('click', () => {
            let homeRecord = "0-0";
            if (homeTeamData.records && homeTeamData.records.length > 0) homeRecord = homeTeamData.records[0].summary;

            let awayRecord = "0-0";
            if (awayTeamData.records && awayTeamData.records.length > 0) awayRecord = awayTeamData.records[0].summary;

            MODAL_BODY.innerHTML = `
        <h3 style="color: var(--text-muted); margin-bottom: 5px; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Matchup Details</h3>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 20px;">Click a team to inspect seasonal stats</p>
        
        <div class="modal-team-row" id="row-${awayId}">
            <div class="modal-team-info">
                <img src="${awayLogo || ''}" style="width: 45px; height: 45px; object-fit: contain;">
                <div>
                    <div style="font-size: 1.2rem; font-weight:700;">${awayName || 'Away Team'}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Away Competitor</div>
                </div>
            </div>
            <div class="modal-record">${awayRecord}</div>
        </div>

        <div class="modal-team-row" id="row-${homeId}">
            <div class="modal-team-info">
                <img src="${homeLogo || ''}" style="width: 45px; height: 45px; object-fit: contain;">
                <div>
                    <div style="font-size: 1.2rem; font-weight:700;">${homeName || 'Home Team'}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Home Competitor</div>
                </div>
            </div>
            <div class="modal-record">${homeRecord}</div>
        </div>
        
        <div id="stats-area"></div>
        
        <div style="margin-top: 20px; font-size: 0.9rem; color: var(--text-muted); text-align: center;">
            Broadcasted Live on: <strong style="color: white">${tvChannel || "Check local listings"}</strong>
        </div>
    `;

            // ATTACH CLICK INTERCEPTORS TO THE MODAL ROWS
            document.getElementById(`row-${awayId}`).addEventListener('click', () => fetchTeamStats(awayId));
            document.getElementById(`row-${homeId}`).addEventListener('click', () => fetchTeamStats(homeId));

            MODAL.classList.remove('hidden');
            MODAL.classList.add('active');
        });

        GAMES_LIST.appendChild(gameCard);
    });

    // 2. Trigger the CSS transition with a microscopic timeout 
    // This allows the browser to register the layout rendering before animating
    setTimeout(() => {
        GAMES_LIST.classList.add('fade-in-active');
    }, 150);
}

function displayNoGames() {
    STATUS_BANNER.innerText = "";
    STATUS_BANNER.className = "no-status";

    GAMES_LIST.classList.remove('hidden');
    GAMES_LIST.classList.remove('fade-in-active');
    GAMES_LIST.innerHTML = `<p class="no-games-msg">No games scheduled. Check back soon!</p>`;

    setTimeout(() => {
        GAMES_LIST.classList.add('fade-in-active');
    }, 150);
}

async function fetchTeamStats(teamId) {
    const statsArea = document.getElementById('stats-area');
    statsArea.innerHTML = `<div class="team-stats-pane" style="text-align:center; color:var(--text-muted)">Loading team stats...</div>`;

    try {
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${teamId}`);
        const data = await response.json();
        const team = data.team;

        // Grab team color accents from ESPN's configuration, fallback to orange
        const teamColor = team.color ? `#${team.color}` : 'var(--wnba-orange)';

        // Safely extract the record types list
        const recordItems = team.record?.items || [];

        // Initialize placeholders
        let totalRecord = "0-0";
        let homeSplit = "0-0";
        let roadSplit = "0-0";

        // ESPN organizes splits as list objects inside items. Let's find them by name:
        recordItems.forEach(item => {
            if (item.type === "total") totalRecord = item.summary;
            if (item.type === "home") homeSplit = item.summary;
            if (item.type === "road") roadSplit = item.summary;
        });

        statsArea.innerHTML = `
            <div class="team-stats-pane">
                <h4 style="margin: 0 0 10px 0; color: ${teamColor}; font-size: 1.1rem; font-weight:800;">
                    ${team.displayName} Seasonal Summary
                </h4>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-val">${homeSplit}</div>
                        <div class="stat-lbl">Home Record</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-val">${roadSplit}</div>
                        <div class="stat-lbl">Road Record</div>
                    </div>
                    <div class="stat-box" style="grid-column: span 2">
                        <div class="stat-val" style="color: ${teamColor}">${totalRecord}</div>
                        <div class="stat-lbl">Overall Standings Split</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error pulling team detail sheet:", error);
        statsArea.innerHTML = `<div class="team-stats-pane" style="color:red">Failed to pull stats records.</div>`;
    }
}

// Initial Kick-off on page load (Today's date)
checkGames(0);