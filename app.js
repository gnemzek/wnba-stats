const GAMES_LIST = document.getElementById('games-list');
const STATUS_BANNER = document.getElementById('status-banner');
const DATE_DISPLAY = document.getElementById('current-date');


// 1. Keep 'today' exactly as it is for your frontend display text
const today = new Date();
DATE_DISPLAY.innerText = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
});

// 2. Create a new date object specifically shifted 1 day forward for the API
const apiDate = new Date();
apiDate.setDate(today.getDate());

// 3. Format the shifted date safely for the API request
const year = apiDate.getFullYear();
const month = String(apiDate.getMonth()).padStart(2, '0');
const day = String(apiDate.getDate()).padStart(2, '0');

const formattedDate = `${year}-${month}-${day}`;
console.log("Successfully adjusted API target date to:", formattedDate);


async function checkGames() {
    try {
        // Fetching directly from ESPN's live scoreboard
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard');
        const data = await response.json();

        // ESPN stores the day's text and the events array here
        DATE_DISPLAY.innerText = data.day.date;
        const games = data.events;

        if (games && games.length > 0) {
            displayGames(games);
        } else {
            displayNoGames();
        }
    } catch (error) {
        console.error("Error fetching ESPN data:", error);
        STATUS_BANNER.innerText = "Couldn't load live schedule.";
    }
}

function displayGames(games) {
    STATUS_BANNER.innerText = "YES!";
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
    STATUS_BANNER.innerText = "NOPE.";
    STATUS_BANNER.style.color = "#777";
    GAMES_LIST.innerHTML = `<p class="no-games-msg">No games scheduled for tonight. Check back tomorrow!</p>`;
    GAMES_LIST.classList.remove('hidden');
}

// Kick off the script
checkGames();