const GAMES_LIST = document.getElementById('games-list');
const STATUS_BANNER = document.getElementById('status-banner');
const DATE_DISPLAY = document.getElementById('current-date');
const TAB_BUTTONS = document.querySelectorAll('.tab-btn');


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
    GAMES_LIST.classList.remove('hidden');
    GAMES_LIST.innerHTML = '';

    games.forEach(game => {
        // Accessing ESPN's competitors array
        const homeTeamData = game.competitions[0].competitors[0];
        const awayTeamData = game.competitions[0].competitors[1];

        // Extracting useful rich data points
        const homeName = homeTeamData.team.displayName;
        const homeLogo = homeTeamData.team.logo;
        const homeScore = homeTeamData.score;

        const awayName = awayTeamData.team.displayName;
        const awayLogo = awayTeamData.team.logo;
        const awayScore = awayTeamData.score;

        // Get live game info (e.g., "7:00 PM ET", "Halftime", or "Final")
        const gameStatus = game.status.type.detail;

        // Bonus: Grab the TV Channel if available (like "ESPN2" or "ION")
        const broadcasts = game.competitions[0].broadcasts;
        const tvChannel = broadcasts && broadcasts.length > 0 ? broadcasts[0].names[0] : "";

        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.innerHTML = `
            <div class="team visitor">
                <img src="${awayLogo}" alt="${awayName} logo" class="team-logo">
                <span class="team-name">${awayName}</span>
                <span class="team-score">${homeScore > 0 || awayScore > 0 ? awayScore : ''}</span>
            </div>
            
            <div class="vs-container">
                <div class="vs">@</div>
                ${tvChannel ? `<div class="tv-tag">${tvChannel}</div>` : ''}
            </div>
            
            <div class="team home">
                <span class="team-score">${homeScore > 0 || awayScore > 0 ? homeScore : ''}</span>
                <span class="team-name">${homeName}</span>
                <img src="${homeLogo}" alt="${homeName} logo" class="team-logo">
            </div>
            
            <div class="game-info">${gameStatus}</div>
        `;
        GAMES_LIST.appendChild(gameCard);
    });
}

function displayNoGames() {
    STATUS_BANNER.innerText = "";
    STATUS_BANNER.style.color = "#777";
    GAMES_LIST.innerHTML = `<p class="no-games-msg">No games scheduled for tonight. Check back tomorrow!</p>`;
    GAMES_LIST.classList.remove('hidden');
}

// Initial Kick-off on page load (Today's date)
checkGames(0);