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

        const gameStatus = game.status.type.state;
        const broadcasts = game.competitions[0].broadcasts;
        const tvChannel = broadcasts && broadcasts.length > 0 ? broadcasts[0].names[0] : "";

        const gameState = game.status.type.state; // "pre", "in", or "post"
        const period = game.status.period; // 1, 2, 3, 4, or 5 (OT)
        let displayStatus = "";

        if (gameState === "pre") {
            const utcTimeString = game.status.type.date || game.date;

            if (utcTimeString) {
                const gameDate = new Date(utcTimeString);

                // 2. Explicitly force the formatting engine to evaluate in Central Time
                displayStatus = gameDate.toLocaleTimeString('en-US', {
                    timeZone: 'America/Chicago', // Forces CST/CDT math
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }); // This will firmly output: "6:00 PM"

            } else {
                displayStatus = "TBD";
            }
        } else if (gameState === "in") {
            // Live game: Displays the active game clock directly (e.g., "5:21 - 3rd")
            displayStatus = game.status.type.detail;
        } else if (gameState === "post") {
            // Finished game
            displayStatus = "FINAL";
        }

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
        <div class="game-card-inner-wrapper row">
        <div class="team visitor col-md-5">
            <img src="${awayLogo}" alt="${awayName} logo" class="team-logo">
            <span class="team-name">${awayName}</span>
            <span class="team-score">${homeScore > 0 || awayScore > 0 ? awayScore : ''}</span>
        </div>
        
        <div class="vs-container col-md-1">
            <div class="vs">@</div>
            ${isCrunchTime ? `<div class="crunch-time-tag">Close Game!</div>` : ''}
        </div>
        
        <div class="team home col-md-5">
            <span class="team-score">${homeScore > 0 || awayScore > 0 ? homeScore : ''}</span>
            <span class="team-name">${homeName}</span>
            <img src="${homeLogo}" alt="${homeName} logo" class="team-logo">
        </div>
        
        <div class="game-info state-${gameState} col-md-1">${displayStatus}</div>
        </div>
        ${tvChannel ? `<div class="tv-tag">${tvChannel}</div>` : ''}
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
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Away</div>
                </div>
            </div>
            <div class="modal-record">${awayRecord}</div>
        </div>

        <div class="modal-team-row" id="row-${homeId}">
            <div class="modal-team-info">
                <img src="${homeLogo || ''}" style="width: 45px; height: 45px; object-fit: contain;">
                <div>
                    <div style="font-size: 1.2rem; font-weight:700;">${homeName || 'Home Team'}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Home</div>
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
    statsArea.innerHTML = `<div class="team-stats-pane" style="text-align:center; color:var(--text-muted)">Loading profile data sheets...</div>`;

    try {
        // Run both team detail and roster queries concurrently!
        const [teamResponse, rosterResponse] = await Promise.all([
            fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${teamId}`),
            fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${teamId}/roster`)
        ]);

        const teamData = await teamResponse.json();
        const rosterData = await rosterResponse.json();

        const team = teamData.team;
        const teamColor = team.color ? `#${team.color}` : 'var(--wnba-orange)';
        const recordItems = team.record?.items || [];

        let totalRecord = "0-0", homeSplit = "0-0", roadSplit = "0-0";
        recordItems.forEach(item => {
            if (item.type === "total") totalRecord = item.summary;
            if (item.type === "home") homeSplit = item.summary;
            if (item.type === "road") roadSplit = item.summary;
        });

        // 📋 THE FLATTENED ROSTER PARSING ENGINE
        // ESPN's rosterData has a top-level .athletes array with all players directly inside it!
        const playerList = rosterData.athletes || [];
        let rosterRowsHtml = "";

        playerList.forEach(player => {
            rosterRowsHtml += `
                <tr>
                    <td style="font-weight:600; color:white; padding: 6px 4px;">${player.displayName || 'Player'}</td>
                    <td style="color:var(--text-muted); padding: 6px 4px;">#${player.jersey || '--'}</td>
                    <td style="text-align:right; color:var(--text-muted); font-size:0.8rem; padding: 6px 4px;">${player.position?.abbreviation || 'G'}</td>
                </tr>
            `;
        });

        // Combine stats boxes layout with our fixed roster table!
        statsArea.innerHTML = `
            <div class="team-stats-pane">
                <h4 style="margin: 0 0 10px 0; color: ${teamColor}; font-size: 1.1rem; font-weight:800;">
                    ${team.displayName} Summary
                </h4>
                
                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-val">${homeSplit}</div><div class="stat-lbl">Home Rec</div></div>
                    <div class="stat-box"><div class="stat-val">${roadSplit}</div><div class="stat-lbl">Road Rec</div></div>
                    <div class="stat-box" style="grid-column: span 2"><div class="stat-val" style="color:${teamColor}">${totalRecord}</div><div class="stat-lbl">Overall Standings</div></div>
                </div>

                <div class="roster-container">
                    <div class="roster-title" style="color:${teamColor}">Active Roster</div>
                    <table class="sports-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Jersey</th>
                                <th style="text-align:right">POS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rosterRowsHtml || '<tr><td colspan="3" style="color:var(--text-muted)">No roster found.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error pulling complete team sheet details:", error);
        statsArea.innerHTML = `<div class="team-stats-pane" style="color:red">Failed to map complete profiles data.</div>`;
    }
}

async function loadLeagueStandings() {
    const tableZone = document.getElementById('standings-table-zone');
    try {
        const response = await fetch('https://site.api.espn.com/apis/v2/sports/basketball/wnba/standings');
        const data = await response.json();

        // 🔍 EXTRACT THE CONFERENCE ARRAYS SAFELY:
        // Checking both possible top-level array variations returned by ESPN
        const conferences = data.children || data.standings?.children || data.groups || [];

        let tableHtml = `
            <table class="sports-table">
                <thead>
                    <tr>
                        <th>Team</th>
                        <th style="text-align:center">W</th>
                        <th style="text-align:center">L</th>
                        <th style="text-align:right">GB</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (conferences.length === 0) {
            tableZone.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem;">Standings array structure mismatch.</p>`;
            return;
        }

        // Loop over each conference block (Eastern and Western)
        conferences.forEach(conf => {
            const conferenceName = conf.displayName || "Conference";

            // Extract the actual teams list array inside this conference
            const teamsList = conf.standings?.entries || conf.entries || [];

            // 1. Add a visually distinct header banner for the Conference Row
            tableHtml += `
                <tr>
                    <td colspan="4" style="background: rgba(255,255,255,0.02); color: var(--wnba-orange); font-size: 0.75rem; font-weight: 800; padding: 8px 6px; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid var(--card-border);">
                        ${conferenceName}
                    </td>
                </tr>
            `;

            // 2. Loop through every team entry inside this specific conference array
            teamsList.forEach(entry => {
                const teamName = entry.team?.displayName || "WNBA Team";
                const teamLogo = entry.team?.logos?.[0]?.href || "";
                const shortName = entry.team?.shortDisplayName || teamName;

                // Pull out statistics parameters accurately from the list arrays
                const stats = entry.stats || [];
                const wins = stats.find(s => s.name === "wins" || s.type === "wins")?.value || 0;
                const losses = stats.find(s => s.name === "losses" || s.type === "losses")?.value || 0;

                // Games Behind (GB) metric calculation
                const gb = stats.find(s => s.name === "gamesBehind" || s.type === "gamesbehind")?.displayValue || "0.0";

                tableHtml += `
                    <tr>
                        <td style="display:flex; align-items:center; gap:8px; font-weight:600; border-bottom: none;">
                            <img src="${teamLogo}" style="width:18px; height:18px; object-fit:contain;">
                            <span>${shortName}</span>
                        </td>
                        <td style="text-align:center; font-weight:700; color:white;">${wins}</td>
                        <td style="text-align:center; color:var(--text-muted);">${losses}</td>
                        <td style="text-align:right; font-size:0.75rem; color:var(--text-muted); font-weight:600;">${gb}</td>
                    </tr>
                `;
            });
        });

        tableHtml += `</tbody></table>`;
        tableZone.innerHTML = tableHtml;

    } catch (error) {
        console.error("Standings loading failure:", error);
        tableZone.innerHTML = `<p style="color:var(--text-muted); font-size:0.8rem;">Standings panel currently offline.</p>`;
    }
}
// Initial Kick-off on page load (Today's date)
loadLeagueStandings();
checkGames(0);