const games = [];

// Funkcja do dodawania nowej gry jedną linijką: 
// addGame("Nazwa Gry", "nazwa_ikony.png", "sciezka/do/pliki/gry.html");
function addGame(name, iconFilename, gameUrl) {
    games.push({
        name: name,
        icon: `graphics/${iconFilename}`,
        url: gameUrl
    });
}

// === TUTAJ DODAJESZ NOWE GRY (KAŻDA W JEDNEJ LINIJCE) ===
addGame("Lab Bio-Simulation", "lab_bio.png", "games/open/lab_bio-simutation.html");
addGame("Midnight Route 13", "route13.png", "games/open/midnight_route_13.html");
addGame("Molecular & Protein Lab", "molecular.png", "games/open/Molecular_&_Protein_Lab.html");
addGame("Earth Clicker", "earthC.png", "games/open/game/Earth_Clicker.html");
addGame("DeltaCup", "deltacup.png", "games/open/deltacup/DeltaCup.html");
addGame("Cyber Defense", "cyber.png", "games/open/cyber_defense.html");
// ========================================================

// Automatyczne generowanie kafelków na stronie głównej
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("games-grid");
    if (!grid) return;

    games.forEach(game => {
        // Tworzymy element linku <a> zamiast zwykłego diva
        const link = document.createElement("a");
        link.href = game.url; // Przejście do podstrony w tej samej karcie (standardowy link HTML)
        link.className = "game-card";

        link.innerHTML = `
            <img class="game-icon" src="${game.icon}" alt="${game.name}" onerror="this.src='https://via.placeholder.com/100?text=Game'">
            <div class="game-title">${game.name}</div>
        `;

        grid.appendChild(link);
    });
});