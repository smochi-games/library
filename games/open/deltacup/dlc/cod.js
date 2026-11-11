        const SoundFX = {
            ctx: null,
            init() {
                if (!this.ctx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioContext();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            },
            playTone(freq, type, duration, vol = 0.12, slideTo = null) {
                try {
                    this.init();
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    if (slideTo) {
                        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
                    }
                    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + duration);
                } catch (e) {
                    // Ignoruj błędy audio przed pierwszą interakcją
                }
            },
            select() { this.playTone(520, 'square', 0.06, 0.08); },
            confirm() { this.playTone(740, 'square', 0.09, 0.1, 980); },
            locked() { this.playTone(150, 'sawtooth', 0.1, 0.1, 110); },
            slash() { this.playTone(900, 'sawtooth', 0.18, 0.15, 140); },
            superSlash() { this.playTone(1150, 'sawtooth', 0.32, 0.2, 95); },
            heal() { this.playTone(440, 'triangle', 0.25, 0.14, 880); },
            hurt() { this.playTone(180, 'sawtooth', 0.22, 0.18, 65); },
            graze() { this.playTone(1250, 'sine', 0.05, 0.06); },
            mercy() { this.playTone(587, 'triangle', 0.35, 0.15, 1174); }
        };

        // nowe bossy //
const CUSTOM_BOSSES = {
    default_boss: { name: 'Djimmi The Great', hpMultiplier: 1.0, color: '#a855f7', image: 'graphics/boss1.png', attacks: [0, 3, 4, 6] },
    a: { name: 'Werner Werman', hpMultiplier: 1.2, color: '#38bdf8', image: 'graphics/boss2.png', attacks: [1, 3, 4, 7] },
    b: { name: 'Mr. Wheezy', hpMultiplier: 1.4, color: '#ef4444', image: 'graphics/boss3.png', attacks: [0, 1, 3, 4] },
    c: { name: 'Esther Winchester', hpMultiplier: 1.3, color: '#ef4444', image: 'graphics/boss4.png', attacks: [1, 5, 6, 7] },
    d: { name: 'Hilda Berg', hpMultiplier: 1.1, color: '#ef4444', image: 'graphics/boss5.png', attacks: [0, 2, 4, 6] },
    e: { name: 'Ribby and Croaks', hpMultiplier: 1.6, color: '#ef4444', image: 'graphics/boss6.png', attacks: [3, 4, 5, 7] },
    f: { name: 'Hopus Pocus', hpMultiplier: 1.2, color: '#ef4444', image: 'graphics/boss7.png', attacks: [1, 4, 5, 6] },
};

// --- LOGIKA LICZNIKA ZABITYCH BOSSÓW ---
function getTodayDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}

function checkAndResetDailyCounter() {
    const currentDate = getTodayDateString();
    const savedDate = localStorage.getItem('boss_kill_date');
    if (savedDate !== currentDate) {
        localStorage.setItem('boss_kills_today', '0');
        localStorage.setItem('boss_kill_date', currentDate);
    }
    updateHtmlCounter();
}

function incrementDailyBossKills() {
    checkAndResetDailyCounter();
    let kills = parseInt(localStorage.getItem('boss_kills_today') || '0', 10);
    kills++;
    localStorage.setItem('boss_kills_today', kills.toString());
    updateHtmlCounter();
}

function getDailyBossKills() {
    checkAndResetDailyCounter();
    return parseInt(localStorage.getItem('boss_kills_today') || '0', 10);
}

function getTodayDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}

function checkAndResetDailyCounter() {
    const currentDate = getTodayDateString();
    const savedDate = localStorage.getItem('boss_kill_date');
    if (savedDate !== currentDate) {
        localStorage.setItem('boss_kills_today', '0');
        localStorage.setItem('boss_kill_date', currentDate);
    }
    updateHtmlCounter();
}

function incrementDailyBossKills() {
    checkAndResetDailyCounter();
    let kills = parseInt(localStorage.getItem('boss_kills_today') || '0', 10);
    kills++;
    localStorage.setItem('boss_kills_today', kills.toString());
    updateHtmlCounter();
}

function updateHtmlCounter() {
    const counterEl = document.getElementById('daily-boss-counter');
    if (counterEl) {
        const kills = localStorage.getItem('boss_kills_today') || '0';
        counterEl.textContent = `POKONANI BOSSOWIE DZISIAJ: ${kills}`;
    }
}

// --- LOGIKA DZIENNEJ MISJI OD 8:00 ---
function getMissionDateString() {
    const now = new Date();
    // Jeśli jest przed 8:00 rano, misja przypisana jest jeszcze do dnia poprzedniego
    if (now.getHours() < 8) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    }
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function updateDailyMissionStatus() {
    const banner = document.getElementById('daily-mission-banner');
    if (!banner) return;

    const missionDate = getMissionDateString();
    const savedMissionDate = localStorage.getItem('daily_mission_date');
    const isCompleted = localStorage.getItem('daily_mission_completed') === 'true';

    // Jeśli nastała nowa doba misji (po 8:00 rano nowego dnia), generujemy nową misję
    if (savedMissionDate !== missionDate) {
        localStorage.setItem('daily_mission_date', missionDate);
        localStorage.setItem('daily_mission_completed', 'false');
        banner.classList.remove('completed');
        banner.textContent = "⚔️ MISJA: Pokonaj dowolnego bossa przez 'Losowy Boss'!";
    } else {
        if (isCompleted) {
            banner.classList.add('completed');
            banner.textContent = "✅ MISJA DNIA UKOŃCZONA! Gratki!";
        } else {
            banner.classList.remove('completed');
            banner.textContent = "⚔️ MISJA: Pokonaj dowolnego bossa przez 'Losowy Boss'!";
        }
    }
}

function checkMissionCompletionOnVictory() {
    const savedMissionDate = getMissionDateString();
    const isCompleted = localStorage.getItem('daily_mission_completed') === 'true';

    // Warunek ukończenia: Gracz wygrał i odpalił walkę za pomocą przycisku Losowy Boss
    if (state.wasRandomRoll && !isCompleted) {
        localStorage.setItem('daily_mission_completed', 'true');
        updateDailyMissionStatus();
    }
}

// Wywołaj sprawdzenie na starcie gry
checkAndResetDailyCounter();

        let selectedBossKey = 'default_boss';

        // Cache załadowanych obrazków bossów
        const bossImageCache = {};
        function preloadBossImages() {
            Object.keys(CUSTOM_BOSSES).forEach(key => {
                const boss = CUSTOM_BOSSES[key];
                if (boss.image && !bossImageCache[key]) {
                    const img = new Image();
                    img.src = boss.image;
                    bossImageCache[key] = img;
                }
            });
        }

        let partyImageCache = {};

function preloadPartyImages() {
    const PARTY_GRAPHICS_MAP = {
        0: 'graphics/kris.png',
        1: 'graphics/susie.png',
        2: 'graphics/helper.png'
    };

    Object.keys(PARTY_GRAPHICS_MAP).forEach(id => {
        const img = new Image();
        img.src = PARTY_GRAPHICS_MAP[id];
        partyImageCache[id] = img; // Teraz ta linijka zadziała bez błędu!
    });
}

        // Konfiguracja poziomów trudności (wraz ze skalowaniem HP bossa)
        const DIFFICULTY_CONFIG = {
            easy: {
                label: 'EASY',
                desc: 'Easy: wolne i małe pociski.',
                bossHp: 600,
                speedMult: 0.65,
                sizeMult: 1.0,
                spawnMult: 1.35
            },
            normal: {
                label: 'NORMAL',
                desc: 'Normal: szybsze ataki, małe pociski.',
                bossHp: 900,
                speedMult: 1.12,
                sizeMult: 1.0,
                spawnMult: 0.92
            },
            hard: {
                label: 'HARD',
                desc: 'Hard: prędkość jak Normal, ale ataki są o 150% większe!',
                bossHp: 1350,
                speedMult: 1.12,
                sizeMult: 2.5,
                spawnMult: 0.95
            }
        };

        // Nazwy 8 wzorów ataków przeciwnika w fazie unikania
        const ATTACK_PATTERNS = [
            { id: 0, name: 'Deszcz Odłamków' },
            { id: 1, name: 'Zacieśniający się Pierścień' },
            { id: 2, name: 'Celowane Snajperki' },
            { id: 3, name: 'Fala Sinusoidalna' },
            { id: 4, name: 'Siatka Laserów' },
            { id: 5, name: 'Rykoszetujące Romby' },
            { id: 6, name: 'Boczny Ostrzał' },
            { id: 7, name: 'Grad Odłamków' }
        ];

        const ACTION_KEYS = ['ATTACK', 'ACT', 'ITEM', 'DEFEND'];

        // Konfiguracja stanu gry
        const state = {
            phase: 'MENU', // MENU, PLAYER_SELECT, SUBMENU, ATTACK_MINIGAME, EXECUTING, BULLET_HELL, PRACTICE, VICTORY, GAMEOVER
            difficulty: 'normal',
            isPractice: false,
            practiceMode: 'random',
            practiceHits: 0,
            activeCharIndex: 0,
            navActionIdx: 0,
            navSubmenuIdx: 0,
            selectedActions: [null, null, null],
            tp: 0,
            turn: 1,
            lastPatternType: -1,
            bgOffset: 0,
            party: [
                { id: 0, shape: 'square', color: '#38bdf8', hp: 100, maxHp: 100, atk: 24, defending: false, mercyPower: 6 },
                { id: 1, shape: 'triangle', color: '#f472b6', hp: 120, maxHp: 120, atk: 32, defending: false, mercyPower: 6 },
                { id: 2, shape: 'circle', color: '#4ade80', hp: 90, maxHp: 90, atk: 18, defending: false, mercyPower: 6 }
            ],
            enemy: {
                hp: 900,
                maxHp: 900,
                mercy: 0,
                maxMercy: 100,
                hurtTimer: 0,
                floatPhase: 0
            },
            currentFightingKey: 'default_boss', 

            inventory: [
                { id: 'item1', name: 'Przedmiot +45 HP', heal: 45, count: 3 },
                { id: 'item2', name: 'Przedmiot +80 HP', heal: 80, count: 1 }
            ],
            // Stan równoczesnych pasków ataku (jak w Deltarune)
            attackGame: {
                active: false,
                bars: [], // { charIdx, cursorPos, speed, done, hitPos, cursorEl, trackEl }
                onComplete: null
            },
            // Stan fazy unikania (Bullet Hell)
            bulletHell: {
                timer: 0,
                duration: 6.5,
                box: { x: 0, y: 0, w: 195, h: 175 },
                soul: { x: 0, y: 0, r: 7, speed: 195, invuln: 0 },
                bullets: [],
                lasers: [],
                spawnTimer: 0,
                patternType: 0,
                patternName: '',
                wavePhase: 0
            },
            floatingTexts: []
        };

        // Referencje DOM
        const canvas = document.getElementById('battle-canvas');
        const ctx = canvas.getContext('2d');
        const partyBar = document.getElementById('party-bar');
        const dialogText = document.getElementById('dialog-text');
        const submenuArea = document.getElementById('submenu-area');
        const tpBarFill = document.getElementById('tp-bar-fill');
        const tpText = document.getElementById('tp-text');
        const attackOverlay = document.getElementById('attack-bar-overlay');
        const attackPrompt = document.getElementById('attack-prompt');
        const multiTracksContainer = document.getElementById('multi-tracks-container');
        const strikeBtn = document.getElementById('strike-btn');
        const mobileControls = document.getElementById('mobile-controls');
        const endScreen = document.getElementById('end-screen');
        const diffDesc = document.getElementById('diff-desc');

        // Obsługa klawiatury (ruch duszy + nawigacja strzałkami po menu i podmenu)
        const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

        window.addEventListener('keydown', (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = true;
            }

            // Nawigacja strzałkami po 5 przyciskach akcji danej postaci
            if (state.phase === 'PLAYER_SELECT') {
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                    e.preventDefault();
                    SoundFX.select();
                    state.navActionIdx = (state.navActionIdx - 1 + ACTION_KEYS.length) % ACTION_KEYS.length;
                    renderUI();
                    return;
                }
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    SoundFX.select();
                    state.navActionIdx = (state.navActionIdx + 1) % ACTION_KEYS.length;
                    renderUI();
                    return;
                }
                if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActionClick(state.activeCharIndex, ACTION_KEYS[state.navActionIdx]);
                    return;
                }
            }

            // Nawigacja strzałkami po opcjach w podmenu (ACT, ITEM, MERCY, wybór celu)
            if (state.phase === 'SUBMENU') {
                const items = Array.from(submenuArea.querySelectorAll('.submenu-item'));
                if (items.length > 0) {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'w' || e.key === 'A' || e.key === 'W') {
                        e.preventDefault();
                        SoundFX.select();
                        state.navSubmenuIdx = (state.navSubmenuIdx - 1 + items.length) % items.length;
                        updateSubmenuFocus(items);
                        return;
                    }
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'd' || e.key === 's' || e.key === 'D' || e.key === 'S') {
                        e.preventDefault();
                        SoundFX.select();
                        state.navSubmenuIdx = (state.navSubmenuIdx + 1) % items.length;
                        updateSubmenuFocus(items);
                        return;
                    }
                    if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        items[state.navSubmenuIdx]?.click();
                        return;
                    }
                }
                if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
                    e.preventDefault();
                    SoundFX.select();
                    startCharacterSelection(state.activeCharIndex);
                    return;
                }
            }

            // Zatwierdzenie paska ataku
            if ((e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === ' ') && state.phase === 'ATTACK_MINIGAME') {
                e.preventDefault();
                resolveNextAttackBar();
            }

            if (keys.hasOwnProperty(e.key) && (state.phase === 'BULLET_HELL' || state.phase === 'PRACTICE')) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (keys.hasOwnProperty(e.key)) {
                keys[e.key] = false;
            }
        });

function buildBossSelectorUI() {
    const container = document.getElementById('boss-selector');
    if (!container) return;
    container.innerHTML = '';

    // --- PRZYCISK LOSOWY BOSS ---
    const randomBtn = document.createElement('button');
    randomBtn.className = `boss-opt-btn ${selectedBossKey === 'random_roll' ? 'selected' : ''}`;
    
    const randomImgDiv = document.createElement('div');
    randomImgDiv.className = 'boss-opt-img';
    randomImgDiv.style.fontSize = '26px';
    randomImgDiv.textContent = '🎲';

    const randomNameDiv = document.createElement('div');
    randomNameDiv.className = 'boss-opt-name';
    randomNameDiv.textContent = 'Losowy Boss';

    randomBtn.appendChild(randomImgDiv);
    randomBtn.appendChild(randomNameDiv);

    randomBtn.addEventListener('click', () => {
        selectedBossKey = 'random_roll';
        SoundFX.select();
        document.querySelectorAll('.boss-opt-btn').forEach(b => b.classList.remove('selected'));
        randomBtn.classList.add('selected');
        updateDiffDescription();
    });
    container.appendChild(randomBtn);

    // --- STANDARDOWI BOSSOWIE Z TABELI CUSTOM_BOSSES ---
    Object.keys(CUSTOM_BOSSES).forEach(key => {
        const boss = CUSTOM_BOSSES[key];
        const btn = document.createElement('button');
        btn.className = `boss-opt-btn ${key === selectedBossKey ? 'selected' : ''}`;

        // 1. Grafika / wygląd bosa na górze
        const imgDiv = document.createElement('div');
        imgDiv.className = 'boss-opt-img';
        
        if (boss.image && bossImageCache[key]) {
            const img = bossImageCache[key].cloneNode(true);
            imgDiv.appendChild(img);
        } else if (boss.image) {
            const img = document.createElement('img');
            img.src = boss.image;
            imgDiv.appendChild(img);
        } else {
            imgDiv.style.backgroundColor = boss.color || '#a855f7';
            imgDiv.style.borderRadius = '50%';
        }

        // 2. Nazwa bosa na samym dole
        const nameDiv = document.createElement('div');
        nameDiv.className = 'boss-opt-name';
        nameDiv.textContent = boss.name;

        // Składamy w pionowy prostokąt
        btn.appendChild(imgDiv);
        btn.appendChild(nameDiv);

        btn.addEventListener('click', () => {
            selectedBossKey = key;
            SoundFX.select();
            document.querySelectorAll('.boss-opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            updateDiffDescription();
        });
        
        container.appendChild(btn);
    });
}

function updateDiffDescription() {
    const diffCfg = DIFFICULTY_CONFIG[state.difficulty];
    const boss = CUSTOM_BOSSES[selectedBossKey] || CUSTOM_BOSSES.default_boss;
    let baseHp = 900;
    if (state.difficulty === 'easy') baseHp = 600;
    if (state.difficulty === 'hard') baseHp = 1350;
    const finalHp = Math.round(baseHp * (boss.hpMultiplier || 1.0));

    diffDesc.textContent = `${diffCfg.desc} (Boss: ${boss.name} - ${finalHp} HP)`;
}

        function updateSubmenuFocus(items) {
            items.forEach((btn, idx) => {
                if (idx === state.navSubmenuIdx) {
                    btn.classList.add('nav-focused');
                    btn.focus();
                } else {
                    btn.classList.remove('nav-focused');
                }
            });
        }

        // Przyciski dotykowe dla urządzeń mobilnych
        document.querySelectorAll('.dpad-btn').forEach(btn => {
            const dir = btn.dataset.dir;
            const map = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
            const setDir = (val) => (e) => {
                e.preventDefault();
                keys[map[dir]] = val;
            };
            btn.addEventListener('touchstart', setDir(true), { passive: false });
            btn.addEventListener('touchend', setDir(false), { passive: false });
            btn.addEventListener('mousedown', setDir(true));
            btn.addEventListener('mouseup', setDir(false));
            btn.addEventListener('mouseleave', setDir(false));
        });

        // Dopasowanie rozdzielczości Canvas do kontenera
        function resizeCanvas() {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
        window.addEventListener('resize', resizeCanvas);

        /**
         * Wybór poziomu trudności
         */
        function selectDifficulty(diffKey) {
            if (!DIFFICULTY_CONFIG[diffKey]) return;
            state.difficulty = diffKey;
            SoundFX.select();
            document.querySelectorAll('.diff-btn').forEach(b => {
                b.classList.toggle('selected', b.dataset.diff === diffKey);
            });
            diffDesc.textContent = DIFFICULTY_CONFIG[diffKey].desc;
        }

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => selectDifficulty(btn.dataset.diff));
        });

        // Obsługa przycisków trybu Practice
        document.querySelectorAll('.prac-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pat = btn.dataset.pattern;
                startPracticeMode(pat === 'random' ? 'random' : parseInt(pat, 10));
            });
        });

        /**
         * Rysuje małą ikonę figury przypisanej do postaci (zamiast imienia)
         */
        function getShapeBadgeSVG(shape, color) {
            if (shape === 'square') {
                return `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
            }
            if (shape === 'triangle') {
                return `<svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,2 14,14 2,14" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
            }
            return `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`;
        }

        /**
         * Ikony przycisków akcji: Miecz (Atak), ACT, Sakiewka (Item), X (Mercy), Tarcza (Defend)
         */
        function getActionButtonContent(type) {
            switch (type) {
                case 'ATTACK':
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="Atak">
                        <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
                        <path d="M13 19l6-6"/>
                        <path d="M16 16l4 4"/>
                        <path d="M19 21l2-2"/>
                    </svg>`;
                case 'ACT':
                    return `<span>ACT</span>`;
                case 'ITEM':
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="Przedmiot">
                        <path d="M9 6L7 3h10l-2 3"/>
                        <path d="M9 6h6c3 2 5 5.5 5 9.5C20 19 17 21 12 21s-8-2-8-5.5C4 11.5 6 8 9 6z"/>
                        <line x1="9" y1="9" x2="15" y2="9"/>
                    </svg>`;
                case 'MERCY':
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-label="Litość">
                        <line x1="6" y1="6" x2="18" y2="18"/>
                        <line x1="18" y1="6" x2="6" y2="18"/>
                    </svg>`;
                case 'DEFEND':
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="Obrona">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>`;
                default:
                    return type;
            }
        }

        /**
         * Aktualizuje pasek postaci, HP, TP oraz 5 przycisków akcji
         */
        function renderUI() {
            const pctTP = Math.min(100, Math.floor(state.tp));
            tpBarFill.style.height = pctTP + '%';
            tpText.textContent = pctTP + '%';

            partyBar.innerHTML = '';
            state.party.forEach((member, idx) => {
                const isTurn = (state.phase === 'PLAYER_SELECT' || state.phase === 'SUBMENU') && state.activeCharIndex === idx;
                const isDown = member.hp <= 0;
                const hpPct = Math.max(0, (member.hp / member.maxHp) * 100);

                const panel = document.createElement('div');
                panel.className = `char-panel ${isTurn ? 'active-turn' : ''} ${isDown ? 'downed' : ''}`;

                const header = document.createElement('div');
                header.className = 'char-header';
                header.innerHTML = `
                    <div class="char-badge-wrap">
                        ${getShapeBadgeSVG(member.shape, member.color)}
                        <span class="char-num">#${idx + 1}</span>
                    </div>
                    <div class="hp-track">
                        <div class="hp-fill" style="width:${hpPct}%; background:${member.color};"></div>
                    </div>
                    <span class="hp-text">${member.hp}/${member.maxHp}</span>
                `;
                panel.appendChild(header);

                const btnRow = document.createElement('div');
                btnRow.className = 'action-row';
                const actions = [
                    { key: 'ATTACK', title: 'Atak' },
                    { key: 'ACT', title: 'Umiejętności (ACT)' },
                    { key: 'ITEM', title: 'Przedmioty' },
                    { key: 'DEFEND', title: 'Obrona' }
                ];


                actions.forEach((act, actIdx) => {
                    const btn = document.createElement('button');
                    btn.className = 'act-btn';
                    btn.title = act.title;
                    btn.setAttribute('aria-label', act.title);
                    btn.innerHTML = getActionButtonContent(act.key);
                    btn.disabled = !isTurn || isDown;

                    const isNavFocused = isTurn && state.phase === 'PLAYER_SELECT' && state.navActionIdx === actIdx;
                    if (isNavFocused || (state.selectedActions[idx] && state.selectedActions[idx].type === act.key && state.phase === 'PLAYER_SELECT')) {
                        btn.classList.add('selected');
                    }

                    btn.addEventListener('mouseenter', () => {
                        if (isTurn && state.phase === 'PLAYER_SELECT' && state.navActionIdx !== actIdx) {
                            state.navActionIdx = actIdx;
                            renderUI();
                        }
                    });

                    btn.addEventListener('click', () => {
                        state.navActionIdx = actIdx;
                        handleActionClick(idx, act.key);
                    });

                    btnRow.appendChild(btn);
                });

                panel.appendChild(btnRow);
                partyBar.appendChild(panel);
            });
        }

        function setDialog(text, showSubmenu = false) {
            dialogText.textContent = text;
            if (!showSubmenu) {
                submenuArea.innerHTML = '';
            }
        }

        function addTP(amount) {
            state.tp = Math.max(0, Math.min(100, state.tp + amount));
            renderUI();
        }

        function spendTP(amount) {
            state.tp = Math.max(0, state.tp - amount);
            renderUI();
        }

        function addFloatingText(x, y, text, color = '#ffffff') {
            state.floatingTexts.push({ x, y, text, color, life: 1.1 });
        }

function startBattle() {
    SoundFX.confirm();

    // 1. Logika losowania bosa
    let actualPlayingBossKey = selectedBossKey;
    if (selectedBossKey === 'random_roll') {
        const keys = Object.keys(CUSTOM_BOSSES);
        actualPlayingBossKey = keys[Math.floor(Math.random() * keys.length)];
        state.wasRandomRoll = true; 
    } else {
        state.wasRandomRoll = false;
    }
    
    // Zapisanie walczącego bosa do pamięci rysowania
    state.currentFightingKey = actualPlayingBossKey; 

    state.isPractice = false;

    // --- TUTAJ BYŁ BŁĄD (Poprawione resetowanie HP drużyny) ---
    state.party.forEach((m, i) => {
        m.hp = [100, 120, 90][i]; // Przywrócono prawidłowe przypisanie HP!
        m.defending = false;
    });

    let baseHp = 900;
    if (state.difficulty === 'easy') baseHp = 600;
    if (state.difficulty === 'normal') baseHp = 900;
    if (state.difficulty === 'hard') baseHp = 1350;

    // Pobranie danych wylosowanego wroga
    const boss = CUSTOM_BOSSES[state.currentFightingKey] || CUSTOM_BOSSES.default_boss;
    const finalHp = Math.round(baseHp * (boss.hpMultiplier || 1.0));

    state.enemy.maxHp = finalHp;
    state.enemy.hp = finalHp;
    state.enemy.mercy = 0;
    state.tp = 0;
    state.turn = 1;
    state.lastPatternType = -1;
    state.selectedActions = [null, null, null];
    state.floatingTexts = [];
    endScreen.style.display = 'none';
    mobileControls.classList.remove('active');
    startNewTurn();
}
        /**
         * Uruchamia tryb Practice do testowania samych ataków
         */
        function startPracticeMode(mode) {
            SoundFX.confirm();
            state.isPractice = true;
            state.practiceMode = mode;
            state.practiceHits = 0;
            state.tp = 0;
            state.lastPatternType = -1;
            state.floatingTexts = [];
            endScreen.style.display = 'none';
            renderUI();
            launchPracticeRound();
        }

        /**
         * Uruchamia kolejną rundę uniku w trybie Practice
         */
        function launchPracticeRound() {
            state.phase = 'PRACTICE';
            const bh = state.bulletHell;
            bh.timer = 0;
            bh.duration = 6.5;
            bh.bullets = [];
            bh.lasers = [];
            bh.spawnTimer = 0.1;
            bh.wavePhase = 0;

            if (state.practiceMode === 'random') {
                bh.patternType = pickRandomAttackPattern();
            } else {
                bh.patternType = state.practiceMode;
            }
            bh.patternName = ATTACK_PATTERNS[bh.patternType].name;

            bh.box.w = 195;
            bh.box.h = 175;
            bh.box.x = (canvas.width - bh.box.w) / 2;
            bh.box.y = (canvas.height - bh.box.h) / 2 + 12;

            bh.soul.x = bh.box.x + bh.box.w / 2;
            bh.soul.y = bh.box.y + bh.box.h / 2;
            bh.soul.invuln = 0;

            mobileControls.classList.add('active');
            updatePracticeDialog();
        }

        function updatePracticeDialog() {
            const diffLabel = DIFFICULTY_CONFIG[state.difficulty].label;
            const modeLabel = state.practiceMode === 'random' ? 'LOSOWY' : 'WYBRANY';
            setDialog(`* [PRACTICE - ${diffLabel} | ${modeLabel}] Atak: ${state.bulletHell.patternName} | Trafienia: ${state.practiceHits}`, true);
            submenuArea.innerHTML = `
                <div class="prac-controls-row">
                    <button id="prac-next-btn" class="prac-ctrl-btn prac-ctrl-next">
                        ↻ Następny Atak
                    </button>
                    <button id="prac-exit-btn" class="prac-ctrl-btn prac-ctrl-exit">
                        ✕ Zmień Atak / Menu
                    </button>
                </div>
            `;
            document.getElementById('prac-next-btn').addEventListener('click', () => {
                SoundFX.select();
                launchPracticeRound();
            });
            document.getElementById('prac-exit-btn').addEventListener('click', () => {
                SoundFX.select();
                state.phase = 'MENU';
                mobileControls.classList.remove('active');
                const titleEl = document.getElementById('end-title');
                titleEl.textContent = 'SYSTEM WALKI';
                titleEl.className = '';
                document.getElementById('end-subtitle').textContent = 'Wybierz poziom trudności lub przetestuj ataki w trybie Practice.';
                endScreen.style.display = 'flex';
            });
        }

        function startNewTurn() {
            state.selectedActions = [null, null, null];
            state.party.forEach(m => m.defending = false);
            const firstAlive = state.party.findIndex(m => m.hp > 0);
            if (firstAlive === -1) {
                triggerGameOver();
                return;
            }
            startCharacterSelection(firstAlive);
        }

        function startCharacterSelection(charIdx) {
            state.phase = 'PLAYER_SELECT';
            state.activeCharIndex = charIdx;
            state.navActionIdx = 0;
            const diffLabel = DIFFICULTY_CONFIG[state.difficulty].label;
            setDialog(`* Tura ${state.turn} [${diffLabel}] — Postać #${charIdx + 1}: wybierz akcję (◄ ► + Z / klik).`);
            renderUI();
        }

        /**
         * Obsługa wyboru jednej z 5 opcji: ATTACK, ACT, ITEM, MERCY, DEFEND
         */
        function handleActionClick(charIdx, actionType) {
            if (state.phase !== 'PLAYER_SELECT' && state.phase !== 'SUBMENU') return;
            if (charIdx !== state.activeCharIndex) return;

            SoundFX.select();

            if (actionType === 'ATTACK') {
                state.selectedActions[charIdx] = { type: 'ATTACK' };
                advanceCharacterTurn();
            } else if (actionType === 'DEFEND') {
                state.selectedActions[charIdx] = { type: 'DEFEND' };
                state.party[charIdx].defending = true;
                addTP(16);
                advanceCharacterTurn();
            } else if (actionType === 'ACT') {
                openActSubmenu(charIdx);
            } else if (actionType === 'ITEM') {
                openItemSubmenu(charIdx);
            } else if (actionType === 'MERCY') {
                openMercySubmenu(charIdx);
            }
        }

        /**
         * Podmenu ACT:
         * - Postać #1: ACT (+6% Litości) oraz Wspólny ACT (+18% Litości, pomija #2 i #3).
         * - Postać #2: ACT (+6% Litości) oraz Super Atak (60% TP).
         * - Postać #3: ACT (+6% Litości), Ulecz 1 Postać +60 HP (30% TP) oraz Ulecz Drużynę +20 HP (30% TP).
         */
                function openActSubmenu(charIdx) {
            state.phase = 'SUBMENU';
            state.navSubmenuIdx = 0;

            let options = [];

            if (charIdx === 0) {
                const canAfford = state.tp >= 12;
                options.push({
                    label: `Mocne Uderzenie (25 DMG) [12% TP]`,
                    costTP: 12,
                    disabled: !canAfford,
                    action: { type: 'ACT', sub: 'POWER_STRIKE', costTP: 12, fixedDmg: 25 }
                });
            } else if (charIdx === 1) {
                const canAffordPower = state.tp >= 48;
                options.push({
                    label: `Mocne Uderzenie (45 DMG) [48% TP]`,
                    costTP: 48,
                    disabled: !canAffordPower,
                    action: { type: 'ACT', sub: 'POWER_STRIKE', costTP: 48, fixedDmg: 45 }
                });
                const canAffordSuper = state.tp >= 60;
                options.push({
                    label: `Super Atak [60% TP]`,
                    costTP: 60,
                    disabled: !canAffordSuper,
                    action: { type: 'ACT', sub: 'SUPER_ATTACK', costTP: 60 }
                });
            } else if (charIdx === 2) {
                const canAffordPower = state.tp >= 25;
                options.push({
                    label: `Mocne Uderzenie (20 DMG) [25% TP]`,
                    costTP: 25,
                    disabled: !canAffordPower,
                    action: { type: 'ACT', sub: 'POWER_STRIKE', costTP: 25, fixedDmg: 20 }
                });
                const canAffordHeal = state.tp >= 30;
                options.push({
                    label: `Ulecz 1 Postać +60 HP [30% TP]`,
                    costTP: 30,
                    disabled: !canAffordHeal,
                    action: { type: 'ACT', sub: 'HEAL_SINGLE_SELECT', costTP: 30 }
                });
                options.push({
                    label: `Ulecz Drużynę +20 HP [30% TP]`,
                    costTP: 30,
                    disabled: !canAffordHeal,
                    action: { type: 'ACT', sub: 'HEAL_TEAM', costTP: 30 }
                });
            }

            setDialog(`* Postać #${charIdx + 1} — Wybierz umiejętność:`, true);
            submenuArea.innerHTML = `<div class="submenu-grid"></div>`;
            const grid = submenuArea.querySelector('.submenu-grid');

            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = `submenu-item ${opt.disabled ? 'disabled-skill' : ''}`;
                btn.innerHTML = `${getHeartSVG()} <span>${opt.label}</span>`;
                btn.addEventListener('click', () => {
                    if (opt.disabled) {
                        SoundFX.locked();
                        setDialog(`* Za mało punktów TP! Wymagane: ${opt.costTP}% TP (masz ${Math.floor(state.tp)}%).`, true);
                        return;
                    }
                    SoundFX.confirm();
                    if (opt.action.sub === 'HEAL_SINGLE_SELECT') {
                        openHealTargetSubmenu(charIdx, opt.action.costTP);
                        return;
                    }
                    state.selectedActions[charIdx] = opt.action;
                    advanceCharacterTurn();
                });
                grid.appendChild(btn);
            });

            addBackButton(grid, charIdx);
            updateSubmenuFocus(Array.from(grid.querySelectorAll('.submenu-item')));
        }


        /**
         * Podmenu wyboru celu dla leczenia 1 wybranej postaci (+60 HP) przez Postać #3
         */
        function openHealTargetSubmenu(charIdx, costTP) {
            state.navSubmenuIdx = 0;
            setDialog(`* Wybierz sojusznika do uleczenia (+60 HP):`, true);
            submenuArea.innerHTML = `<div class="submenu-grid"></div>`;
            const grid = submenuArea.querySelector('.submenu-grid');

            state.party.forEach((target, tIdx) => {
                const btn = document.createElement('button');
                btn.className = 'submenu-item';
                btn.innerHTML = `${getHeartSVG()} <span>Postać #${tIdx + 1} (${target.hp}/${target.maxHp} HP)</span>`;
                btn.addEventListener('click', () => {
                    SoundFX.confirm();
                    state.selectedActions[charIdx] = {
                        type: 'ACT',
                        sub: 'HEAL_SINGLE',
                        targetIdx: tIdx,
                        costTP
                    };
                    advanceCharacterTurn();
                });
                grid.appendChild(btn);
            });

            const backBtn = document.createElement('button');
            backBtn.className = 'submenu-item text-muted';
            backBtn.innerHTML = `<span>← Wróć do ACT</span>`;
            backBtn.addEventListener('click', () => {
                SoundFX.select();
                openActSubmenu(charIdx);
            });
            grid.appendChild(backBtn);
            updateSubmenuFocus(Array.from(grid.querySelectorAll('.submenu-item')));
        }

        function openItemSubmenu(charIdx) {
            const available = state.inventory.filter(i => i.count > 0);
            if (available.length === 0) {
                SoundFX.locked();
                setDialog('* Brak przedmiotów w ekwipunku!');
                return;
            }
            state.phase = 'SUBMENU';
            state.navSubmenuIdx = 0;
            setDialog('* Wybierz przedmiot do użycia:', true);
            submenuArea.innerHTML = `<div class="submenu-grid"></div>`;
            const grid = submenuArea.querySelector('.submenu-grid');

            available.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'submenu-item';
                btn.innerHTML = `${getHeartSVG()} <span>${item.name} (x${item.count})</span>`;
                btn.addEventListener('click', () => {
                    SoundFX.confirm();
                    openTargetSubmenu(charIdx, item);
                });
                grid.appendChild(btn);
            });

            addBackButton(grid, charIdx);
            updateSubmenuFocus(Array.from(grid.querySelectorAll('.submenu-item')));
        }

        function openTargetSubmenu(charIdx, item) {
            state.navSubmenuIdx = 0;
            setDialog(`* Na kim użyć: ${item.name}?`, true);
            submenuArea.innerHTML = `<div class="submenu-grid"></div>`;
            const grid = submenuArea.querySelector('.submenu-grid');

            state.party.forEach((target, tIdx) => {
                const btn = document.createElement('button');
                btn.className = 'submenu-item';
                btn.innerHTML = `${getHeartSVG()} <span>Postać #${tIdx + 1} (${target.hp}/${target.maxHp} HP)</span>`;
                btn.addEventListener('click', () => {
                    SoundFX.confirm();
                    state.selectedActions[charIdx] = { type: 'ITEM', item, targetIdx: tIdx };
                    advanceCharacterTurn();
                });
                grid.appendChild(btn);
            });

            addBackButton(grid, charIdx);
            updateSubmenuFocus(Array.from(grid.querySelectorAll('.submenu-item')));
        }

        function openMercySubmenu(charIdx) {
            state.phase = 'SUBMENU';
            state.navSubmenuIdx = 0;
            const canSpare = state.enemy.mercy >= 100;
            setDialog(`* Litość przeciwnika: ${state.enemy.mercy}% (wymagane 100%):`, true);
            submenuArea.innerHTML = `<div class="submenu-grid"></div>`;
            const grid = submenuArea.querySelector('.submenu-grid');

            const spareBtn = document.createElement('button');
            spareBtn.className = `submenu-item ${canSpare ? 'text-yellow' : 'text-muted'}`;
            spareBtn.innerHTML = `${getHeartSVG()} <span>Oszczędź (${state.enemy.mercy}%)</span>`;
            spareBtn.addEventListener('click', () => {
                SoundFX.confirm();
                state.selectedActions[charIdx] = { type: 'MERCY' };
                advanceCharacterTurn();
            });
            grid.appendChild(spareBtn);

            addBackButton(grid, charIdx);
            updateSubmenuFocus(Array.from(grid.querySelectorAll('.submenu-item')));
        }

        function addBackButton(container, charIdx) {
            const backBtn = document.createElement('button');
            backBtn.className = 'submenu-item text-muted';
            backBtn.innerHTML = `<span>← Powrót</span>`;
            backBtn.addEventListener('click', () => {
                SoundFX.select();
                startCharacterSelection(charIdx);
            });
            container.appendChild(backBtn);
        }

        function getHeartSVG() {
            return `<svg class="heart-cursor" viewBox="0 0 16 16" shape-rendering="crispEdges">
                <path fill="#ffff00" d="M2 2h4v1h1v1h2V3h1V2h4v1h1v5h-1v2h-2v2h-2v2H9v1H7v-1H6v-2H4v-2H2V8H1V3h1V2z"/>
            </svg>`;
        }

        /**
         * Przechodzi do wyboru akcji dla kolejnej żywej postaci lub rozpoczyna turę
         */
        function advanceCharacterTurn() {
            let nextIdx = state.activeCharIndex + 1;
            while (nextIdx < state.party.length && state.party[nextIdx].hp <= 0) {
                nextIdx++;
            }

            if (nextIdx < state.party.length) {
                startCharacterSelection(nextIdx);
            } else {
                executePlayerTurnSequence();
            }
        }

        /**
         * Wykonuje akcje drużyny: najpierw równoczesne paski ATTACK (jak w Deltarune), potem reszta akcji
         */
        async function executePlayerTurnSequence() {
            state.phase = 'EXECUTING';
            renderUI();

            // 1. Zbierz wszystkie postacie, które w tej turze wybrały ATTACK
            const attackers = [];
            for (let i = 0; i < state.party.length; i++) {
                if (state.party[i].hp > 0 && state.selectedActions[i]?.type === 'ATTACK') {
                    attackers.push(i);
                }
            }

            // Jeśli ktokolwiek atakuje, uruchom równoczesne paski ataku dla wszystkich atakujących
            if (attackers.length > 0) {
                const results = await runSimultaneousAttackMinigame(attackers);
                let totalDmg = 0;
                results.forEach(res => {
                    const member = state.party[res.charIdx];
                    const dist = Math.abs(res.hitPos - 0.05);
                    let mult = 0.5;
                    if (dist < 0.05) mult = 2.0;
                    else if (dist < 0.14) mult = 1.45;
                    else if (dist < 0.28) mult = 1.05;
                    else mult = 0.7;

                    const dmg = Math.floor(member.atk * mult);
                    totalDmg += dmg;
                    addTP(10);
                    addFloatingText(
                        canvas.width * 0.72 + (res.charIdx - 1) * 26,
                        canvas.height * (0.30 + res.charIdx * 0.06),
                        dmg > 0 ? `-#${res.charIdx + 1}: ${dmg}` : 'PUDŁO',
                        member.color
                    );
                });

                state.enemy.hp = Math.max(0, state.enemy.hp - totalDmg);
                state.enemy.hurtTimer = 0.4;
                SoundFX.slash();
                setDialog(`* Drużyna zadaje łącznie ${totalDmg} obrażeń!`);
                await wait(850);

                if (state.enemy.hp <= 0) {
                    triggerVictory('Przeciwnik został pokonany!');
                    return;
                }
            }

            // 2. Wykonaj pozostałe akcje (ACT, ITEM, MERCY, DEFEND)
            for (let i = 0; i < state.party.length; i++) {
                const member = state.party[i];
                const act = state.selectedActions[i];
                if (member.hp <= 0 || !act || act.type === 'ATTACK' || act.type === 'SKIPPED_BY_GROUP_ACT') continue;

                if (act.type === 'DEFEND') {
                    setDialog(`* Postać #${i + 1} przyjmuje pozycję obronną (+16% TP).`);
                    await wait(650);
                                } else if (act.type === 'ACT') {
                    if (act.sub === 'POWER_STRIKE') {
                        if (state.tp >= act.costTP) {
                            spendTP(act.costTP);
                            const dmg = act.fixedDmg;
                            state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
                            state.enemy.hurtTimer = 0.35;
                            SoundFX.slash();
                            addFloatingText(canvas.width * 0.72, canvas.height * 0.35, `MOCNY CIOS -${dmg}`, '#fb923c');
                            setDialog(`* Postać #${i + 1} wykonuje MOCNE UDERZENIE za ${dmg} obrażeń!`);
                            await wait(900);
                            if (state.enemy.hp <= 0) {
                                triggerVictory('Przeciwnik został pokonany!');
                                return;
                            }
                        } else {
                            setDialog(`* Postać #${i + 1} nie miała wystarczająco TP!`);
                            await wait(750);
                        }
                    } else if (act.sub === 'SUPER_ATTACK') {
                        if (state.tp >= act.costTP) {
                            spendTP(act.costTP);
                            const dmg = Math.floor(member.atk * 4.5);
                            state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
                            state.enemy.hurtTimer = 0.45;
                            SoundFX.superSlash();
                            addFloatingText(canvas.width * 0.72, canvas.height * 0.35, `SUPER -${dmg}`, '#f472b6');
                            setDialog(`* Postać #${i + 1} używa SUPER ATAKU za ${dmg} obrażeń!`);
                            await wait(1000);
                            if (state.enemy.hp <= 0) {
                                triggerVictory('Przeciwnik został pokonany!');
                                return;
                            }
                        } else {
                            setDialog(`* Postać #${i + 1} nie miała wystarczająco TP na Super Atak!`);
                            await wait(750);
                        }
                    } else if (act.sub === 'HEAL_SINGLE') {
                        if (state.tp >= act.costTP) {
                            spendTP(act.costTP);
                            const target = state.party[act.targetIdx];
                            const healAmt = 60;
                            target.hp = Math.min(target.maxHp, target.hp + healAmt);
                            SoundFX.heal();
                            renderUI();
                            addFloatingText(canvas.width * 0.22, canvas.height * (0.28 + act.targetIdx * 0.2), `+${healAmt} HP`, '#4ade80');
                            setDialog(`* Postać #${i + 1} leczy Postać #${act.targetIdx + 1} o +${healAmt} HP!`);
                            await wait(950);
                        } else {
                            setDialog(`* Postać #${i + 1} nie miała wystarczająco TP na leczenie!`);
                            await wait(750);
                        }
                                        } else if (act.sub === 'HEAL_TEAM') {
                        if (state.tp >= act.costTP) {
                            spendTP(act.costTP);
                            SoundFX.heal();
                            state.party.forEach((ally, allyIdx) => {
                                if (ally.hp > 0) {
                                    ally.hp = Math.min(ally.maxHp, ally.hp + 20);
                                    addFloatingText(canvas.width * 0.22, canvas.height * (0.28 + allyIdx * 0.2), `+20 HP`, '#4ade80');
                                }
                            });
                            renderUI();
                            setDialog(`* Postać #${i + 1} rzuca grupowe leczenie (+20 HP dla całej drużyny)!`);
                            await wait(950);
                        } else {
                            setDialog(`* Postać #${i + 1} nie miała wystarczająco TP na leczenie!`);
                            await wait(750);
                        }
                    }
                } else if (act.type === 'ITEM') {
                    if (act.item.count > 0) {
                        act.item.count--;
                        const target = state.party[act.targetIdx];
                        target.hp = Math.min(target.maxHp, target.hp + act.item.heal);
                        SoundFX.heal();
                        renderUI();
                        addFloatingText(canvas.width * 0.22, canvas.height * (0.28 + act.targetIdx * 0.2), `+${act.item.heal} HP`, '#4ade80');
                        setDialog(`* Postać #${i + 1} używa ${act.item.name} na Postaci #${act.targetIdx + 1}!`);
                        await wait(850);
                    }
                }
            }

            startBulletHellPhase();
        }


        /**
         * Równoczesna mini-gra pasków ataku (jak w Deltarune) — losowa kolejność i przesunięcie startowe pasków
         */
        function runSimultaneousAttackMinigame(attackerIndices) {
            return new Promise((resolve) => {
                state.phase = 'ATTACK_MINIGAME';
                state.attackGame.active = true;
                state.attackGame.bars = [];
                multiTracksContainer.innerHTML = '';

                // Losowe przetasowanie kolejności wyświetlania pasków postaci (algorytm Fisher-Yates)
                const shuffledAttackers = [...attackerIndices];
                for (let i = shuffledAttackers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledAttackers[i], shuffledAttackers[j]] = [shuffledAttackers[j], shuffledAttackers[i]];
                }

                // Losowe przesunięcia startowe (0.00 - 0.34), aby każdy pasek dobiegał do celu w innym momencie
                const randomOffsets = shuffledAttackers
                    .map(() => Math.random() * 0.34)
                    .sort((a, b) => a - b);

                // Przypisz wylosowane przesunięcia w losowej kolejności do pasków
                for (let i = randomOffsets.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [randomOffsets[i], randomOffsets[j]] = [randomOffsets[j], randomOffsets[i]];
                }

                shuffledAttackers.forEach((charIdx, idx) => {
                    const member = state.party[charIdx];
                    const row = document.createElement('div');
                    row.className = 'timing-row';

                    const tag = document.createElement('div');
                    tag.className = 'timing-char-tag';
                    tag.style.color = member.color;
                    tag.textContent = `#${charIdx + 1}`;

                    const track = document.createElement('div');
                    track.className = 'timing-track';
                    track.style.borderColor = member.color;

                    const target = document.createElement('div');
                    target.className = 'timing-target';

                    const lockedZone = document.createElement('div');
                    lockedZone.className = 'timing-locked-zone';

                    const cursor = document.createElement('div');
                    cursor.className = 'timing-cursor';

                    track.appendChild(target);
                    track.appendChild(lockedZone);
                    track.appendChild(cursor);
                    row.appendChild(tag);
                    row.appendChild(track);
                    multiTracksContainer.appendChild(row);

                    state.attackGame.bars.push({
                        charIdx,
                        cursorPos: 1.0 + randomOffsets[idx],
                        speed: 0.42,
                        done: false,
                        hitPos: 0.5,
                        cursorEl: cursor,
                        trackEl: track
                    });
                });

                attackOverlay.style.display = 'flex';
                updateSimultaneousAttackPrompt();

                state.attackGame.onComplete = (bars) => {
                    attackOverlay.style.display = 'none';
                    state.attackGame.active = false;
                    state.phase = 'EXECUTING';
                    resolve(bars.map(b => ({ charIdx: b.charIdx, hitPos: b.hitPos })));
                };
            });
        }

        function updateSimultaneousAttackPrompt() {
            const activeBars = state.attackGame.bars.filter(b => !b.done);
            const anyReady = activeBars.some(b => b.cursorPos <= 0.5);

            if (anyReady) {
                attackPrompt.textContent = `TERAZ! NACIŚNIJ [Z / SPACJA / UDERZ]! (Pozostało: ${activeBars.length})`;
                attackPrompt.style.color = '#fde047';
                strikeBtn.textContent = 'UDERZ!';
                strikeBtn.className = 'strike-ready';
            } else {
                attackPrompt.textContent = `POCZEKAJ NA POŁOWĘ PASKA (50%)! (Pozostało: ${activeBars.length})`;
                attackPrompt.style.color = '#f87171';
                strikeBtn.textContent = 'ZABLOKOWANE (< 50%)';
                strikeBtn.className = 'strike-locked';
            }
        }

        function resolveNextAttackBar() {
            if (!state.attackGame.active) return;
            const activeBars = state.attackGame.bars.filter(b => !b.done);
            if (activeBars.length === 0) return;

            // Znajdź aktywny pasek najbliższy celowi, który przekroczył już 50% (cursorPos <= 0.5)
            const readyBars = activeBars
                .filter(b => b.cursorPos <= 0.5)
                .sort((a, b) => a.cursorPos - b.cursorPos);

            if (readyBars.length === 0) {
                SoundFX.locked();
                return;
            }

            const targetBar = readyBars[0];
            targetBar.done = true;
            targetBar.hitPos = Math.max(0, targetBar.cursorPos);
            targetBar.trackEl.classList.add('done');
            SoundFX.slash();

            if (state.attackGame.bars.every(b => b.done)) {
                const cb = state.attackGame.onComplete;
                state.attackGame.onComplete = null;
                if (cb) cb(state.attackGame.bars);
            } else {
                updateSimultaneousAttackPrompt();
            }
        }

        strikeBtn.addEventListener('click', resolveNextAttackBar);

  function pickRandomAttackPattern() {
    const bossDef = CUSTOM_BOSSES[selectedBossKey] || CUSTOM_BOSSES.default_boss;
    
    // Jeśli boss ma zdefiniowane własne ataki i tablica nie jest pusta, losuj tylko spośród nich
    let allowedAttacks = (bossDef.attacks && bossDef.attacks.length > 0) 
        ? bossDef.attacks 
        : ATTACK_PATTERNS.map(p => p.id);

    let candidate;
    if (allowedAttacks.length === 1) {
        candidate = allowedAttacks[0];
    } else {
        do {
            candidate = allowedAttacks[Math.floor(Math.random() * allowedAttacks.length)];
        } while (candidate === state.lastPatternType && allowedAttacks.length > 1);
    }

    state.lastPatternType = candidate;
    return candidate;
}

        /**
         * Faza unikania ataków przeciwnika (Bullet Hell w pudełku)
         */
        function startBulletHellPhase() {
            state.phase = 'BULLET_HELL';
            const bh = state.bulletHell;
            bh.timer = 0;
            bh.duration = 6.5;
            bh.bullets = [];
            bh.lasers = [];
            bh.spawnTimer = 0.15;
            bh.wavePhase = 0;

            bh.patternType = pickRandomAttackPattern();
            bh.patternName = ATTACK_PATTERNS[bh.patternType].name;

            bh.box.w = 195;
            bh.box.h = 175;
            bh.box.x = (canvas.width - bh.box.w) / 2;
            bh.box.y = (canvas.height - bh.box.h) / 2 + 12;

            bh.soul.x = bh.box.x + bh.box.w / 2;
            bh.soul.y = bh.box.y + bh.box.h / 2;
            bh.soul.invuln = 0;

            const diffLabel = DIFFICULTY_CONFIG[state.difficulty].label;
            setDialog(`* [${diffLabel}] Przeciwnik używa: ${bh.patternName}! Unikaj żółtym sercem!`);
            mobileControls.classList.add('active');
        }

        function spawnBulletPattern() {
            const bh = state.bulletHell;
            const diff = DIFFICULTY_CONFIG[state.difficulty];
            const spd = diff.speedMult;
            const sz = diff.sizeMult;
            const spw = diff.spawnMult;

            if (bh.patternType === 0) {
                // Wzór 1: Deszcz Odłamków (spadanie z góry + okazjonalny ostrzał z boku)
                bh.spawnTimer = 0.24 * spw;
                bh.bullets.push({
                    x: bh.box.x + 12 + Math.random() * (bh.box.w - 24),
                    y: bh.box.y - 25,
                    vx: (Math.random() - 0.5) * 42 * spd,
                    vy: (125 + Math.random() * 45) * spd,
                    r: 4.5 * sz,
                    shape: 'circle',
                    bounces: 0,
                    grazed: false
                });
                if (Math.random() < 0.25) {
                    const left = Math.random() > 0.5;
                    bh.bullets.push({
                        x: left ? bh.box.x - 25 : bh.box.x + bh.box.w + 25,
                        y: bh.box.y + 15 + Math.random() * (bh.box.h - 30),
                        vx: (left ? 130 : -130) * spd,
                        vy: (Math.random() - 0.5) * 28 * spd,
                        r: 4 * sz,
                        shape: 'circle',
                        bounces: 0,
                        grazed: false
                    });
                }
            } else if (bh.patternType === 1) {
                // Wzór 2: Zacieśniający się Pierścień
                bh.spawnTimer = 0.95 * spw;
                const cx = bh.box.x + bh.box.w / 2;
                const cy = bh.box.y + bh.box.h / 2;
                const count = 7;
                const gapIdx = Math.floor(Math.random() * count);
                const offsetAngle = Math.random() * Math.PI * 2;
                for (let k = 0; k < count; k++) {
                    if (k === gapIdx) continue;
                    const angle = offsetAngle + (Math.PI * 2 * k) / count;
                    const dist = 135;
                    bh.bullets.push({
                        x: cx + Math.cos(angle) * dist,
                        y: cy + Math.sin(angle) * dist,
                        vx: -Math.cos(angle) * 98 * spd,
                        vy: -Math.sin(angle) * 98 * spd,
                        r: 4.5 * sz,
                        shape: 'diamond',
                        bounces: 0,
                        grazed: false
                    });
                }
            } else if (bh.patternType === 2) {
                // Wzór 3: Celowane Snajperki
                bh.spawnTimer = 0.36 * spw;
                const side = Math.floor(Math.random() * 4);
                let bx, by;
                if (side === 0) { bx = bh.box.x + Math.random() * bh.box.w; by = bh.box.y - 25; }
                else if (side === 1) { bx = bh.box.x + Math.random() * bh.box.w; by = bh.box.y + bh.box.h + 25; }
                else if (side === 2) { bx = bh.box.x - 25; by = bh.box.y + Math.random() * bh.box.h; }
                else { bx = bh.box.x + bh.box.w + 25; by = bh.box.y + Math.random() * bh.box.h; }

                const angle = Math.atan2(bh.soul.y - by, bh.soul.x - bx);
                const speed = 152 * spd;
                bh.bullets.push({
                    x: bx,
                    y: by,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    r: 4.5 * sz,
                    shape: 'diamond',
                    bounces: 0,
                    grazed: false
                });
            } else if (bh.patternType === 3) {
                // Wzór 4: Fala Sinusoidalna (ściana z luką)
                bh.spawnTimer = 0.85 * spw;
                bh.wavePhase += 0.9;
                const gapCenter = bh.box.y + bh.box.h * 0.5 + Math.sin(bh.wavePhase) * (bh.box.h * 0.3);
                const gapHalf = Math.max(24, 22 + 6 * sz);
                for (let py = bh.box.y + 8; py <= bh.box.y + bh.box.h - 8; py += 16) {
                    if (Math.abs(py - gapCenter) < gapHalf) continue;
                    bh.bullets.push({
                        x: bh.box.x + bh.box.w + 20,
                        y: py,
                        vx: -125 * spd,
                        vy: 0,
                        r: 4 * sz,
                        shape: 'circle',
                        bounces: 0,
                        grazed: false
                    });
                }
            } else if (bh.patternType === 4) {
                // Wzór 5: Siatka Laserów (linia ostrzegawcza -> wiązka tnąca pole)
                bh.spawnTimer = 0.85 * spw;
                const horizontal = Math.random() > 0.5;
                if (horizontal) {
                    const ly = bh.box.y + 20 + Math.random() * (bh.box.h - 40);
                    bh.lasers.push({
                        horizontal: true,
                        pos: ly,
                        warnTime: 0.65 / Math.max(0.75, spd * 0.85),
                        fireTime: 0.25,
                        thickness: 6 * sz,
                        grazed: false
                    });
                } else {
                    const lx = bh.box.x + 20 + Math.random() * (bh.box.w - 40);
                    bh.lasers.push({
                        horizontal: false,
                        pos: lx,
                        warnTime: 0.65 / Math.max(0.75, spd * 0.85),
                        fireTime: 0.25,
                        thickness: 6 * sz,
                        grazed: false
                    });
                }
            } else if (bh.patternType === 5) {
                // Wzór 6: Rykoszetujące Romby
                bh.spawnTimer = 0.95 * spw;
                const cornerX = Math.random() > 0.5 ? bh.box.x + 16 : bh.box.x + bh.box.w - 16;
                const cornerY = bh.box.y + 16;
                const dirX = cornerX < bh.box.x + bh.box.w / 2 ? 1 : -1;
                bh.bullets.push({
                    x: cornerX,
                    y: cornerY,
                    vx: dirX * (95 + Math.random() * 35) * spd,
                    vy: (95 + Math.random() * 35) * spd,
                    r: 4.5 * sz,
                    shape: 'diamond',
                    bounces: 3,
                    grazed: false
                });
            } else if (bh.patternType === 6) {
                // Wzór 7: Boczny Ostrzał (poziome pociski z lewej i prawej krawędzi)
                bh.spawnTimer = 0.24 * spw;
                const left = Math.random() > 0.5;
                bh.bullets.push({
                    x: left ? bh.box.x - 25 : bh.box.x + bh.box.w + 25,
                    y: bh.box.y + 14 + Math.random() * (bh.box.h - 28),
                    vx: (left ? 142 : -142) * spd,
                    vy: (Math.random() - 0.5) * 24 * spd,
                    r: 4.5 * sz,
                    shape: 'circle',
                    bounces: 0,
                    grazed: false
                });
            } else {
                // Wzór 8: Grad Odłamków (tylko pionowe spadanie z góry)
                bh.spawnTimer = 0.20 * spw;
                bh.bullets.push({
                    x: bh.box.x + 12 + Math.random() * (bh.box.w - 24),
                    y: bh.box.y - 25,
                    vx: (Math.random() - 0.5) * 25 * spd,
                    vy: (140 + Math.random() * 45) * spd,
                    r: 4.5 * sz,
                    shape: 'circle',
                    bounces: 0,
                    grazed: false
                });
            }
        }

        function damageRandomPartyMember(dmg) {
            if (state.isPractice) {
                state.practiceHits++;
                SoundFX.hurt();
                addFloatingText(state.bulletHell.soul.x, state.bulletHell.soul.y - 16, `TRAFIENIE #${state.practiceHits}`, '#ff5555');
                updatePracticeDialog();
                return;
            }

            const alive = state.party.filter(m => m.hp > 0);
            if (alive.length === 0) return;
            const victim = alive[Math.floor(Math.random() * alive.length)];
            const finalDmg = victim.defending ? Math.max(1, Math.floor(dmg * 0.5)) : dmg;
            victim.hp = Math.max(0, victim.hp - finalDmg);
            SoundFX.hurt();
            renderUI();

            const idx = state.party.indexOf(victim);
            addFloatingText(canvas.width * 0.22, canvas.height * (0.28 + idx * 0.2), `-${finalDmg}`, '#ff4444');

            if (state.party.every(m => m.hp <= 0)) {
                mobileControls.classList.remove('active');
                triggerGameOver();
            }
        }

 function triggerVictory(msg) {
    state.phase = 'VICTORY';
    if (mobileControls) mobileControls.classList.remove('active');
    
    // WYWOŁANIE LICZNIKA I MISJI
    incrementDailyBossKills();
    checkMissionCompletionOnVictory();
    if (typeof checkMissionCompletionOnVictory === "function") {
        checkMissionCompletionOnVictory();
    }

    const titleEl = document.getElementById('end-title');
    if (titleEl) {
        titleEl.textContent = 'WYGRANA!';
        titleEl.className = '';
    }
    const subtitleEl = document.getElementById('end-subtitle');
    if (subtitleEl) subtitleEl.textContent = msg;
    
    if (endScreen) endScreen.style.display = 'flex';
}

        function triggerGameOver() {
            state.phase = 'GAMEOVER';
            mobileControls.classList.remove('active');
            const titleEl = document.getElementById('end-title');
            titleEl.textContent = 'KONIEC GRY';
            titleEl.className = 'gameover';
            document.getElementById('end-subtitle').textContent = 'Wszyscy członkowie drużyny stracili HP.';
            document.getElementById('restart-btn').textContent = 'SPRÓBUJ PONOWNIE';
            endScreen.style.display = 'flex';
        }

        function wait(ms) {
            return new Promise(r => setTimeout(r, ms));
        }

        /**
         * Główna pętla aktualizacji logiki (60 FPS)
         */
        let lastTime = performance.now();

        function update(dt) {
            state.enemy.floatPhase += dt * 3;
            state.bgOffset = (state.bgOffset + dt * 26) % 44;

            if (state.enemy.hurtTimer > 0) {
                state.enemy.hurtTimer = Math.max(0, state.enemy.hurtTimer - dt);
            }

            state.floatingTexts.forEach(ft => {
                ft.y -= 28 * dt;
                ft.life -= dt;
            });
            state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

            // Aktualizacja wszystkich równoczesnych pasków ataku
            if (state.phase === 'ATTACK_MINIGAME' && state.attackGame.active) {
                let stateChanged = false;
                state.attackGame.bars.forEach(bar => {
                    if (bar.done) return;
                    bar.cursorPos -= bar.speed * dt;

                    if (bar.cursorPos <= 0.5 && !bar.cursorEl.classList.contains('ready')) {
                        bar.cursorEl.classList.add('ready');
                        stateChanged = true;
                    }

                    if (bar.cursorPos <= 0) {
                        bar.cursorPos = 0;
                        bar.hitPos = 0;
                        bar.done = true;
                        bar.trackEl.classList.add('done');
                        stateChanged = true;
                    }

                    const clamped = Math.max(0, Math.min(1, bar.cursorPos));
                    bar.cursorEl.style.left = (clamped * 96) + '%';
                });

                if (state.attackGame.bars.every(b => b.done)) {
                    const cb = state.attackGame.onComplete;
                    state.attackGame.onComplete = null;
                    if (cb) cb(state.attackGame.bars);
                } else if (stateChanged) {
                    updateSimultaneousAttackPrompt();
                }
            }

            if (state.phase === 'BULLET_HELL' || state.phase === 'PRACTICE') {
                const bh = state.bulletHell;
                bh.timer += dt;

                let dx = 0, dy = 0;
                if (keys.ArrowLeft || keys.a) dx -= 1;
                if (keys.ArrowRight || keys.d) dx += 1;
                if (keys.ArrowUp || keys.w) dy -= 1;
                if (keys.ArrowDown || keys.s) dy += 1;

                if (dx !== 0 && dy !== 0) {
                    const inv = 1 / Math.SQRT2;
                    dx *= inv;
                    dy *= inv;
                }

                bh.soul.x += dx * bh.soul.speed * dt;
                bh.soul.y += dy * bh.soul.speed * dt;

                const pad = bh.soul.r + 3;
                bh.soul.x = Math.max(bh.box.x + pad, Math.min(bh.box.x + bh.box.w - pad, bh.soul.x));
                bh.soul.y = Math.max(bh.box.y + pad, Math.min(bh.box.y + bh.box.h - pad, bh.soul.y));

                if (bh.soul.invuln > 0) {
                    bh.soul.invuln = Math.max(0, bh.soul.invuln - dt);
                }

                bh.spawnTimer -= dt;
                if (bh.spawnTimer <= 0 && bh.timer < bh.duration - 0.6) {
                    spawnBulletPattern();
                }

                // Aktualizacja zwykłych pocisków
                for (let i = bh.bullets.length - 1; i >= 0; i--) {
                    const b = bh.bullets[i];
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;

                    if (b.bounces > 0) {
                        if (b.x - b.r < bh.box.x && b.vx < 0) {
                            b.x = bh.box.x + b.r;
                            b.vx = -b.vx;
                            b.bounces--;
                        } else if (b.x + b.r > bh.box.x + bh.box.w && b.vx > 0) {
                            b.x = bh.box.x + bh.box.w - b.r;
                            b.vx = -b.vx;
                            b.bounces--;
                        }
                        if (b.y - b.r < bh.box.y && b.vy < 0) {
                            b.y = bh.box.y + b.r;
                            b.vy = -b.vy;
                            b.bounces--;
                        } else if (b.y + b.r > bh.box.y + bh.box.h && b.vy > 0) {
                            b.y = bh.box.y + bh.box.h - b.r;
                            b.vy = -b.vy;
                            b.bounces--;
                        }
                    }

                    const dist = Math.hypot(b.x - bh.soul.x, b.y - bh.soul.y);

                    if (!b.grazed && dist < b.r + bh.soul.r + 14 && dist >= b.r + bh.soul.r) {
                        b.grazed = true;
                        addTP(2);
                        SoundFX.graze();
                    }

                    if (dist < b.r + bh.soul.r - 1.5 && bh.soul.invuln <= 0) {
                        bh.soul.invuln = 0.85;
                        damageRandomPartyMember(22);
                    }

                    if (b.x < bh.box.x - 160 || b.x > bh.box.x + bh.box.w + 160 ||
                        b.y < bh.box.y - 160 || b.y > bh.box.y + bh.box.h + 160) {
                        bh.bullets.splice(i, 1);
                    }
                }

                // Aktualizacja Siatki Laserów
                for (let i = bh.lasers.length - 1; i >= 0; i--) {
                    const l = bh.lasers[i];
                    if (l.warnTime > 0) {
                        l.warnTime -= dt;
                    } else {
                        l.fireTime -= dt;
                        const distToBeam = l.horizontal
                            ? Math.abs(bh.soul.y - l.pos)
                            : Math.abs(bh.soul.x - l.pos);

                        if (!l.grazed && distToBeam < l.thickness * 0.5 + bh.soul.r + 12 && distToBeam >= l.thickness * 0.5 + bh.soul.r) {
                            l.grazed = true;
                            addTP(3);
                            SoundFX.graze();
                        }

                        if (distToBeam < l.thickness * 0.5 + bh.soul.r - 1 && bh.soul.invuln <= 0) {
                            bh.soul.invuln = 0.85;
                            damageRandomPartyMember(22);
                        }

                        if (l.fireTime <= 0) {
                            bh.lasers.splice(i, 1);
                        }
                    }
                }

                // Koniec rundy unikania
                if (bh.timer >= bh.duration) {
                    if (state.isPractice) {
                        launchPracticeRound();
                    } else {
                        mobileControls.classList.remove('active');
                        state.turn++;
                        startNewTurn();
                    }
                }
            }
        }

        /**
         * Rysuje zapętloną, przesuwającą się fioletowo-granatową siatkę w tle
         */
        function drawBackgroundGrid() {
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            const gridSize = 44;
            const offset = state.bgOffset;

            ctx.save();
            ctx.strokeStyle = 'rgba(76, 29, 149, 0.35)';
            ctx.lineWidth = 1.5;

            for (let x = -gridSize + offset; x < w + gridSize; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }

            for (let y = -gridSize + offset; y < h + gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * Rysuje ostre, pikselowe żółte serce (matryca 16x15) na środku pozycji (cx, cy)
         */
        function drawPixelSoul(cx, cy) {
            const heartRows = [
                '0011110000111100',
                '0111111001111110',
                '1111111111111111',
                '1111111111111111',
                '1111111111111111',
                '1111111111111111',
                '1111111111111111',
                '0111111111111110',
                '0111111111111110',
                '0011111111111100',
                '0001111111111000',
                '0000111111110000',
                '0000011111100000',
                '0000001111000000',
                '0000000110000000'
            ];
            const pxSize = 1;
            const startX = Math.round(cx - 8 * pxSize);
            const startY = Math.round(cy - 7 * pxSize);

            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#ffff00';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 6;

            for (let r = 0; r < heartRows.length; r++) {
                const row = heartRows[r];
                for (let c = 0; c < row.length; c++) {
                    if (row[c] === '1') {
                        ctx.fillRect(startX + c * pxSize, startY + r * pxSize, pxSize, pxSize);
                    }
                }
            }
            ctx.restore();
        }

        /**
         * Rysowanie wszystkich elementów na Canvasie
         */
function draw() {
    drawBackgroundGrid();

    const w = canvas.width;
    const h = canvas.height;

    if (state.phase !== 'PRACTICE') {
        // --- RYSOWANIE POSTACI DRUŻYNY ---
         state.party.forEach((member, idx) => {
            const px = w * 0.22;
            const py = h * (0.28 + idx * 0.22);
            const isActive = (state.phase === 'PLAYER_SELECT' || state.phase === 'SUBMENU') && state.activeCharIndex === idx;

            ctx.save();
            ctx.translate(px, py);
            if (member.hp <= 0) ctx.globalAlpha = 0.28;

            // Żółte kółko zaznaczenia aktywnej tury wokół postaci
            if (isActive) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.beginPath(); 
                ctx.arc(0, 0, 36, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Wymuszenie retro pixelozy dla sprajtów postaci
            ctx.imageSmoothingEnabled = false;

            // Pobranie załadowanego obrazka z cache
            const charImg = partyImageCache[idx];
            
            // CAŁKOWICIE USUNĘLIŚMY BLOK WARUNKOWY ELSE Z FIGURAMI GEOMETRYCZNYMI
            if (charImg) {
                const imgWidth = 64;  
                const imgHeight = 64; 
                ctx.drawImage(charImg, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
            }

            // Tarcza obrony
            if (member.defending && member.hp > 0) {
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3;
                ctx.beginPath(); 
                ctx.arc(0, 0, 40, -Math.PI * 0.4, Math.PI * 0.4); 
                ctx.stroke();
            }
            ctx.restore();
        });

        // --- DALSZA CZĘŚĆ RYSOWANIA BOSSA (pozostaje bez zmian w Twoim kodzie) ---
        const bossScale = 2.0;
        const ex = w * 0.75 + (state.enemy.hurtTimer > 0 ? (Math.random() - 0.5) * 14 : 0);
        const ey = h * 0.46 + Math.sin(state.enemy.floatPhase) * 6;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.imageSmoothingEnabled = false;

        const barOffset = 35; // Optymalna wysokość nad bossem
        const barW = 90;
        const barH = 8;

        // Zostaje tylko pasek HP bossa:
        ctx.fillStyle = '#3a0000';
        ctx.fillRect(-barW / 2, -62 - barOffset, barW, barH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-barW / 2, -62 - barOffset, barW * (state.enemy.hp / state.enemy.maxHp), barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, -62 - barOffset, barW, barH);

        ctx.fillStyle = '#292500';
        ctx.fillRect(-barW / 2, -50 - barOffset, barW, 6);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-barW / 2, -50 - barOffset, barW * (state.enemy.mercy / 100), 6);
        ctx.strokeRect(-barW / 2, -50 - barOffset, barW, 6);

        const currentBossDef = CUSTOM_BOSSES[state.currentFightingKey] || CUSTOM_BOSSES.default_boss;
        const bossImg = bossImageCache[state.currentFightingKey];

        if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
            const finalSize = 72 * bossScale;
            ctx.drawImage(bossImg, -finalSize / 2, -finalSize / 2, finalSize, finalSize);
        } else {
            ctx.fillStyle = state.enemy.hurtTimer > 0 ? '#ff4444' : currentBossDef.color;
            ctx.strokeStyle = state.enemy.mercy >= 100 ? '#ffff00' : '#ffffff';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(0, -34 * bossScale); ctx.lineTo(30 * bossScale, 0);
            ctx.lineTo(0, 34 * bossScale); ctx.lineTo(-30 * bossScale, 0);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.beginPath(); ctx.arc(0, 0, 8 * bossScale, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    if (state.phase === 'BULLET_HELL' || state.phase === 'PRACTICE') {
        drawBulletHell();
    }

    state.floatingTexts.forEach(ft => {
        ctx.save();
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.min(1, ft.life);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });
}

        function drawBulletHell() {
            const bh = state.bulletHell;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Etykieta nazwy aktualnego ataku nad pudełkiem bitwy
            ctx.save();
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillStyle = '#ffff00';
            ctx.textAlign = 'center';
            ctx.fillText(bh.patternName.toUpperCase(), bh.box.x + bh.box.w / 2, bh.box.y - 12);
            ctx.restore();

            // Pudełko bitwy (czarne tło, biała gruba ramka)
            ctx.fillStyle = '#000000';
            ctx.fillRect(bh.box.x, bh.box.y, bh.box.w, bh.box.h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(bh.box.x, bh.box.y, bh.box.w, bh.box.h);

            // Pociski (przycięte do obszaru wokół pudełka)
            ctx.save();
            ctx.beginPath();
            ctx.rect(bh.box.x - 16, bh.box.y - 16, bh.box.w + 32, bh.box.h + 32);
            ctx.clip();

            // Rysowanie Siatki Laserów
            bh.lasers.forEach(l => {
                if (l.warnTime > 0) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 6]);
                    ctx.beginPath();
                    if (l.horizontal) {
                        ctx.moveTo(bh.box.x, l.pos);
                        ctx.lineTo(bh.box.x + bh.box.w, l.pos);
                    } else {
                        ctx.moveTo(l.pos, bh.box.y);
                        ctx.lineTo(l.pos, bh.box.y + bh.box.h);
                    }
                    ctx.stroke();
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 10;
                    if (l.horizontal) {
                        ctx.fillRect(bh.box.x, l.pos - l.thickness * 0.5, bh.box.w, l.thickness);
                    } else {
                        ctx.fillRect(l.pos - l.thickness * 0.5, bh.box.y, l.thickness, bh.box.h);
                    }
                    ctx.restore();
                }
            });

            // Rysowanie zwykłych pocisków
            bh.bullets.forEach(b => {
                ctx.fillStyle = '#ffffff';
                if (b.shape === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(b.x, b.y - b.r - 2);
                    ctx.lineTo(b.x + b.r + 2, b.y);
                    ctx.lineTo(b.x, b.y + b.r + 2);
                    ctx.lineTo(b.x - b.r - 2, b.y);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.restore();

            // Pikselowe żółte serce gracza (Dusza)
            const s = bh.soul;
            if (s.invuln <= 0 || Math.floor(s.invuln * 18) % 2 === 0) {
                drawPixelSoul(s.x, s.y);
            }
        }

        function gameLoop(now) {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            update(dt);
            draw();
            requestAnimationFrame(gameLoop);
        }

        document.getElementById('restart-btn').addEventListener('click', startBattle);

// ========================================================
// SYSTEM DZIENNEJ MISJI OD 8:00 I SERII DNI (STREAK 🔥)
// ========================================================

function formatDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

// Pobiera "logiczny dzień" misji (cykl resetuje się o godzinie 8:00 rano)
function getMissionDateString() {
    const now = new Date();
    if (now.getHours() < 8) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return formatDate(yesterday);
    }
    return formatDate(now);
}

// Pobiera "logiczny dzień wczorajszy" względem cyklu misji
function getYesterdayMissionDateString() {
    const currentMissionDate = new Date(getMissionDateString());
    currentMissionDate.setDate(currentMissionDate.getDate() - 1);
    return formatDate(currentMissionDate);
}

function updateDailyMissionStatus() {
    const banner = document.getElementById('daily-mission-banner');
    const streakEl = document.getElementById('daily-streak-counter');
    if (!banner) return;

    const currentMissionDate = getMissionDateString();
    const savedMissionDate = localStorage.getItem('daily_mission_date');
    const isCompleted = localStorage.getItem('daily_mission_completed') === 'true';

    // Inicjalizacja serii jeśli gracz uruchamia ją po raz pierwszy
    if (localStorage.getItem('daily_streak') === null) {
        localStorage.setItem('daily_streak', '0');
    }

    // Wykrycie nadejścia nowego dnia misji (po godzinie 8:00 rano)
    if (savedMissionDate !== currentMissionDate) {
        const yesterdayDate = getYesterdayMissionDateString();
        const wasYesterdayCompleted = localStorage.getItem('daily_mission_completed') === 'true';

        // Jeśli nastał nowy dzień, a wczorajsza misja NIE była skończona -> RESET serii ognia do 0
        if (savedMissionDate === yesterdayDate && !wasYesterdayCompleted) {
            localStorage.setItem('daily_streak', '0');
        } else if (savedMissionDate !== yesterdayDate && savedMissionDate !== currentMissionDate) {
            // Jeśli gracz opuścił więcej niż jeden dzień gry -> RESET serii ognia do 0
            localStorage.setItem('daily_streak', '0');
        }

        // Aktywacja czystej karty misji na nowy dzień
        localStorage.setItem('daily_mission_date', currentMissionDate);
        localStorage.setItem('daily_mission_completed', 'false');
        
        banner.classList.remove('completed');
        banner.textContent = "⚔️ MISJA: Pokonaj dowolnego bossa przez 'Losowy Boss'!";
    } else {
        // Kontynuacja tego samego dnia: odśwież widok z pamięci przeglądarki
        if (isCompleted) {
            banner.classList.add('completed');
            banner.textContent = "✅ MISJA DNIA UKOŃCZONA! Gratki!";
        } else {
            banner.classList.remove('completed');
            banner.textContent = "⚔️ MISJA: Pokonaj dowolnego bossa przez 'Losowy Boss'!";
        }
    }

    // Aktualizacja tekstu z płomieniem na ekranie
    if (streakEl) {
        const currentStreak = localStorage.getItem('daily_streak') || '0';
        streakEl.textContent = `SERIA MISJI: 🔥 ${currentStreak} dni`;
    }
}

function checkMissionCompletionOnVictory() {
    const isCompleted = localStorage.getItem('daily_mission_completed') === 'true';

    // Jeśli wygrana nastąpiła z przycisku Losowy Boss i misja nie była dziś zrobiona
    if (state.wasRandomRoll && !isCompleted) {
        localStorage.setItem('daily_mission_completed', 'true');
        
        // Zwiększamy serię ognia o +1 dzień
        let currentStreak = parseInt(localStorage.getItem('daily_streak') || '0', 10);
        currentStreak++;
        localStorage.setItem('daily_streak', currentStreak.toString());

        // Odświeżamy napisy na ekranie
        updateDailyMissionStatus();
    }
}

window.onload = function () {
    checkAndResetDailyCounter(); 
    updateDailyMissionStatus(); 
    preloadBossImages();
    preloadPartyImages(); 
    buildBossSelectorUI();
    selectDifficulty('normal');
    resizeCanvas();
    renderUI();
    requestAnimationFrame(gameLoop);
};