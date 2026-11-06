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
addGame("Lab Bio-Simulation", "lab_bio.png", "games/lab bio-simutation/index.html");
addGame("Midnight Route 13", "route13.png", "games/midnight route 13/index.html");
addGame("Molecular & Protein Lab", "molecular.png", "games/Molecular & Protein Lab/index.html");
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