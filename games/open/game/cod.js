// Stan gry i waluty
const state = {
    clickPoint: 0n,
    resourcePoint: 0,
    researchPoint: 0,
    coinPoint: 0.0,
    baseClickPower: 1n,
    basePassiveGain: 0n,
    techProgress: 0,
    techLevel: 1,
    workers: 1,
    
    rebirthCount: 0, 
    globalCostMultiplier: 1.0,
    activeBoosters: [], 
    wheelCooldownSeconds: 0,

    eventResourceChanceTime: 0,
    eventPassiveMultTime: 0,
    eventClickMultTime: 0,
    eventDiscountTime: 0,
    eventFallingActiveTime: 0,

    dailyStreak: 0,
    lastDailyClaimTime: 0, // Timestamp w milisekundach
    dailyRewardAvailable: false,
};

const inventory = {};
const upgrades = [];
const researchGeneratorsList = [];

// Rejestr własnych ulepszeń przycisków (minimalne mnożniki)
const buttonUpgrades = [
    { id: 'btn_mult_1', name: 'Mnożnik Startowy', desc: 'Zwiększa minimalny globalny mnożnik przycisków', baseCost: 10000000, costMult: 2.2, level: 0, maxLevel: 75, bonusPerLevel: 0.01 },
    { id: 'btn_crit_1', name: 'Krytyczne Kliknięcie', desc: 'Zwiększa szansę na wywołanie potężnego, krytycznego kliknięcia globalnego', baseCost: 2500000000000, costMult: 2.5, level: 0, maxLevel: 25, bonusPerLevel: 0.04 },
    { id: 'btn_auto_1', name: 'Impuls Automatyczny', desc: 'Generuje automatyczne kliknięcia na sekundę dla wszystkich przycisków', baseCost: 500000000000, costMult: 3.0, level: 0, maxLevel: 50, bonusPerLevel: 0.02 },
    { id: 'btn_combo_1', name: 'Efekt Domina', desc: 'Zwiększa bonus do mnożnika za każde kolejne kliknięcie bez przerwy', baseCost: 15000000000000, costMult: 2.8, level: 0, maxLevel: 40, bonusPerLevel: 0.03 },
    { id: 'btn_discount_1', name: 'Optymalizacja Kosztów', desc: 'Obniża koszt zakupu i ulepszania wszystkich pozostałych przycisków', baseCost: 50000000000000000, costMult: 3.5, level: 0, maxLevel: 15, bonusPerLevel: 0.10 },
    { id: 'btn_frenzy_1', name: 'Szał Klikania', desc: 'Wydłuża czas trwania losowych okresów podwojonej produkcji przycisków', baseCost: 1000000000000000, costMult: 4.0, level: 0, maxLevel: 20, bonusPerLevel: 0.05 }
];

// Pojedyncza opcja rekrutacji workerów z przełącznikiem ilości (1x, 10x, Max)
let recruitOption = {
    rp: 10,
    cp: 2500,
    time: 60,
    workersGain: 2,
    active: false,
    progress: 0,
    workersGainedTotal: 0
};
let recruitBatchMode = 1; // 1, 10 lub 'max'

// Formaty liczb
const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Un", "Du", "Td", "Qt", "Qd", "Sd", "St", "Od", "Nd", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP"];

function formatNumber(num) {
    let value = BigInt(num);
    if (value < 0n) return "0";
    if (value < 1000n) return value.toString();
    
    let index = 0;
    let remainder = 0n;
    while (value >= 1000n && index < suffixes.length - 1) {
        remainder = value % 1000n;
        value = value / 1000n;
        index++;
    }
    let dec = (Number(remainder) / 100).toFixed(0);
    return value.toString() + (dec > 0 ? "." + dec : "") + suffixes[index];
}

function showNotification(message) {
    let toast = document.getElementById('notification-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'notification-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

function getTotalBoosterMultiplier() {
    if (state.activeBoosters.length === 0) return 1.0;
    return state.activeBoosters.reduce((acc, b) => acc * b.mult, 1.0);
}

function getRebirthMultiplier() {
    if (state.rebirthCount === 0) return 1.0;
    return state.rebirthCount * 1.5;
}

function getButtonMultiplierBonus() {
    let totalBonus = 1.0;
    buttonUpgrades.forEach(bu => {
        if (bu.level > 0) {
            totalBonus += bu.level * bu.bonusPerLevel;
        }
    });
    return totalBonus;
}

function getEffectiveClickPower() {
    let earthMult = Math.pow(1.5, state.techLevel - 1);
    let eventMult = state.eventClickMultTime > 0 ? 5.0 : 1.0;
    return BigInt(Math.floor(Number(state.baseClickPower) * earthMult * getTotalBoosterMultiplier() * getRebirthMultiplier() * getButtonMultiplierBonus() * eventMult));
}

function getEffectivePassiveGain() {
    let earthMult = Math.pow(1.5, state.techLevel - 1);
    let eventMult = state.eventPassiveMultTime > 0 ? 5.0 : 1.0;
    return BigInt(Math.floor(Number(state.basePassiveGain) * earthMult * getTotalBoosterMultiplier() * getRebirthMultiplier() * getButtonMultiplierBonus() * eventMult));
}

function addBooster(multiplier, durationMinutes) {
    let seconds = durationMinutes * 60;
    let existing = state.activeBoosters.find(b => b.mult === multiplier);
    
    if (existing) {
        existing.timeSeconds += seconds;
        showNotification(`Przedłużono Booster ${multiplier}x o kolejne ${durationMinutes} min!`);
    } else {
        state.activeBoosters.push({ mult: multiplier, timeSeconds: seconds });
        showNotification(`Aktywano nowy Booster ${multiplier}x na ${durationMinutes} min!`);
    }
    updateUI();
}

// Obsługa Rebirth
function getRebirthCost() {
    return 100000 * Math.pow(8, state.rebirthCount);
}

function triggerRebirth() {
    let cost = BigInt(getRebirthCost());
    if (state.clickPoint < cost) {
        showNotification("Za mało Click Points na wykonanie Rebirth!");
        return;
    }

    if (!confirm("Czy na pewno chcesz wykonać Rebirth? Cały Twój aktualny postęp zostanie zresetowany w zamian za stały bonus x1.5!")) {
        return;
    }

    state.rebirthCount += 1;
    state.clickPoint = 0n;
    state.resourcePoint = 0;
    state.researchPoint = 0;
    state.coinPoint = 0.0;
    state.baseClickPower = 1n;
    state.basePassiveGain = 0n;
    state.techProgress = 0;
    state.techLevel = 1;
    state.workers = 1;
    state.activeBoosters = [];
    state.wheelCooldownSeconds = 0;

    Object.keys(masteryLevels).forEach(key => delete masteryLevels[key]);
    Object.keys(inventory).forEach(key => delete inventory[key]);
    upgrades.forEach(u => { u.level = 0; });
    researchGeneratorsList.forEach(gen => {
        gen.currentClickCost = gen.baseClickCost;
        gen.active = false;
        gen.progress = 0;
    });
    recruitOption.active = false;
    recruitOption.progress = 0;

    showNotification(`Rebirth wykonany! Poziom prestiżu: ${state.rebirthCount}`);
    
    renderUpgrades();
    renderResearchGenerators();
    renderInventory();
    updateUI();
    saveGame();
}

// Obsługa podzakładek w Zakładce 2
function switchSubTab(subTabName) {
    document.getElementById('subtab-standard').style.display = 'none';
    document.getElementById('subtab-buttons').style.display = 'none';
    document.getElementById('subtab-mastery').style.display = 'none';
    
    document.getElementById('subtab-upgrades-btn').classList.remove('active');
    document.getElementById('subtab-buttons-btn').classList.remove('active');
    document.getElementById('subtab-mastery-btn').classList.remove('active');

    if (subTabName === 'standard') {
        document.getElementById('subtab-standard').style.display = 'block';
        document.getElementById('subtab-upgrades-btn').classList.add('active');
    } else if (subTabName === 'buttons') {
        document.getElementById('subtab-buttons').style.display = 'block';
        document.getElementById('subtab-buttons-btn').classList.add('active');
        renderButtonUpgrades();
    } else if (subTabName === 'mastery') {
        document.getElementById('subtab-mastery').style.display = 'block';
        document.getElementById('subtab-mastery-btn').classList.add('active');
        renderMasteryUpgrades();
    }
}

function getButtonUpgradeCost(bu) {
    return Math.floor(bu.baseCost * Math.pow(bu.costMult, bu.level));
}

function buyButtonUpgrade(id) {
    let bu = buttonUpgrades.find(b => b.id === id);
    if (!bu || bu.level >= bu.maxLevel) return;

    let cost = getButtonUpgradeCost(bu);
    if (state.clickPoint >= BigInt(cost)) {
        state.clickPoint -= BigInt(cost);
        bu.level += 1;
        showNotification(`Ulepszono ${bu.name} do poziomu ${bu.level}!`);
        renderButtonUpgrades();
        updateUI();
    } else {
        showNotification("Za mało Click Points!");
    }
}

function renderButtonUpgrades() {
    let container = document.getElementById('button-upgrades-container');
    if (!container) return;
    container.innerHTML = '';

    buttonUpgrades.forEach(bu => {
        let card = document.createElement('div');
        card.className = 'upgrade-card';
        let cost = getButtonUpgradeCost(bu);
        let currencyIcon = '<img src="graphic/click_point.png" class="currency-inline-icon">';
        let btnText = bu.level >= bu.maxLevel ? 'Max Poziom' : `Kup (Poz. ${bu.level}/${bu.maxLevel})`;

        card.innerHTML = `
            <div class="bar-top">
                <h4>${bu.name} (Poz. ${bu.level})</h4>
            </div>
            <div class="bar-middle">
                <p>${bu.desc} (+${(bu.bonusPerLevel * 100).toFixed(0)}% do mnożnika)</p>
                <small>Koszt: ${formatNumber(cost)} ${currencyIcon}</small>
            </div>
            <div class="bar-down">
                <button class="upgrade-btn" id="btn-bu-${bu.id}" onclick="buyButtonUpgrade('${bu.id}')" ${bu.level >= bu.maxLevel ? 'disabled' : ''}>${btnText}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Tablica przechowująca poziomy mistrzostwa (id_ulepszenia: poziom)
const masteryLevels = {};
const masteryMultipliers = [1, 1.5, 2, 4]; // Indeksy odpowiadają poziomom 0, 1, 2, 3

function getMasteryMultiplier(upgId) {
    let lvl = masteryLevels[upgId] || 0;
    return masteryMultipliers[lvl];
}

function getMasteryCost(upg) {
    let currentLvl = masteryLevels[upg.id] || 0;
    if (currentLvl >= 3) return Infinity;
    let costMultiplier = Math.pow(10, currentLvl + 1) * 5; 
    return Number(upg.baseCost) * costMultiplier;
}

function buyMasteryUpgrade(upgId) {
    const upg = upgrades.find(u => u.id === upgId);
    if (!upg) return;
    
    let currentLvl = masteryLevels[upgId] || 0;
    if (currentLvl >= 3) return;

    let cost = getMasteryCost(upg);
    if (state.clickPoint >= BigInt(cost)) {
        state.clickPoint -= BigInt(cost);
        masteryLevels[upgId] = currentLvl + 1;
        showNotification(`Ulepszono Mistrzostwo dla ${upg.name} do Poz. ${currentLvl + 1}!`);
        
        recalculateBaseGains(); 
        renderMasteryUpgrades();
        updateUI();
    } else {
        showNotification("Za mało Click Points!");
    }
}

function renderMasteryUpgrades() {
    let container = document.getElementById('mastery-upgrades-container');
    if (!container) return;
    container.innerHTML = '';

    let validUpgs = upgrades.filter(u => u.category === 'click' || u.category === 'passive');

    validUpgs.forEach(upg => {
        let currentLvl = masteryLevels[upg.id] || 0;
        let cost = getMasteryCost(upg);
        let nextMult = currentLvl < 3 ? masteryMultipliers[currentLvl + 1] : 4;
        
        let card = document.createElement('div');
        card.className = 'upgrade-card';
        let currencyIcon = '<img src="graphic/click_point.png" class="currency-inline-icon">';
        let btnText = currentLvl >= 3 ? 'Max Mistrzostwo' : `Kup (Poz. ${currentLvl}/3)`;

        card.innerHTML = `
            <div class="bar-top">
                <h4>Mistrzostwo: ${upg.name} (Poz. ${currentLvl}/3)</h4>
            </div>
            <div class="bar-middle">
                <p>Aktualny mnożnik: <strong>x${masteryMultipliers[currentLvl]}</strong> ${currentLvl < 3 ? `➔ Następny: <strong style="color: #000000;">x${nextMult}</strong>` : ''}</p>
                <small>Koszt: ${currentLvl >= 3 ? 'MAX' : formatNumber(cost)} ${currentLvl >= 3 ? '' : currencyIcon}</small>
            </div>
            <div class="bar-down">
                <button class="upgrade-btn" id="btn-mastery-${upg.id}" onclick="buyMasteryUpgrade('${upg.id}')" ${currentLvl >= 3 ? 'disabled' : ''}>${btnText}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Sklep i Koło Fortuny
function openShopModal() { document.getElementById('shop-modal').style.display = 'flex'; }
function closeShopModal() { document.getElementById('shop-modal').style.display = 'none'; }

function addTimeSpeed(minutes) {
    let seconds = minutes * 60;
    let gainedCP = BigInt(Math.floor(Number(getEffectivePassiveGain()) * seconds));
    let gainedRP = Math.floor(seconds / 60);
    state.clickPoint += gainedCP;
    state.resourcePoint += gainedRP;
    showNotification(`Time Speed (${minutes} min): Dodano +${formatNumber(gainedCP)} CP i +${gainedRP} RP!`);
    updateUI();
}

function checkDailyRewardStatus() {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const twoDaysMs = 48 * 60 * 60 * 1000;

    if (state.lastDailyClaimTime === 0) {
        state.dailyRewardAvailable = true;
    } else {
        const timePassed = now - state.lastDailyClaimTime;
        if (timePassed >= oneDayMs && timePassed < twoDaysMs) {
            state.dailyRewardAvailable = true;
        } else if (timePassed >= twoDaysMs) {
            state.dailyStreak = 0;
            state.dailyRewardAvailable = true;
        } else {
            state.dailyRewardAvailable = false;
        }
    }
    updateDailyRewardUI();
}

function claimDailyReward() {
    if (!state.dailyRewardAvailable) {
        showNotification("Twoja codzienna nagroda nie jest jeszcze gotowa!");
        return;
    }

    const rewards = [
        { type: 'coinPoint', value: 10, label: '10 Coin Points' },
        { type: 'timeSpeed', value: 20, label: '20 minut Time Speed' },
        { type: 'booster', value: 20, label: 'Booster 3x na 20 min' },
        { type: 'workers', value: 0, label: '' },
        { type: 'resourcePoint', value: 0, label: '' }
    ];

    let result = rewards[Math.floor(Math.random() * rewards.length)];

    if (result.type === 'workers') {
        const amount = Math.floor(Math.random() * (3 - 2 + 1)) + 2;
        result.value = amount;
        result.label = `${amount} Pracowników`;
    } else if (result.type === 'resourcePoint') {
        const options =[500, 1000, 2000];
        const amount = options[Math.floor(Math.random() * options.length)];
        result.value = amount;
        result.label = `${amount === 1000 ? '1K' : amount === 2000 ? '2K' : amount} Resource Points`;
    }

    if (result.type === 'coinPoint') state.coinPoint += result.value;
    else if (result.type === 'timeSpeed') addTimeSpeed(result.value);
    else if (result.type === 'booster') addBooster(3, result.value);
    else if (result.type === 'workers') state.workers += result.value;
    else if (result.type === 'resourcePoint') state.resourcePoint += result.value;

    state.dailyStreak += 1;
    state.lastDailyClaimTime = Date.now();
    state.dailyRewardAvailable = false;

    showNotification(`Odebrano nagrodę za dzień ${state.dailyStreak}: ${result.label}!`);
    updateUI();
    checkDailyRewardStatus();
}

function updateDailyRewardUI() {
    const streakDisplay = document.getElementById('daily-streak-display');
    const claimBtn = document.getElementById('daily-claim-btn');
    if (streakDisplay) streakDisplay.innerText = state.dailyStreak;
    if (claimBtn) {
        if (state.dailyRewardAvailable) {
            claimBtn.disabled = false;
            claimBtn.innerText = "Odbierz darmową nagrodę!";
            claimBtn.style.backgroundColor = "#2ecc71";
        } else {
            claimBtn.disabled = true;
            claimBtn.innerText = "Nagroda odebrana (Wróć jutro)";
            claimBtn.style.backgroundColor = "#555555";
        }
    }
}

function spinWheel() {
    if (state.wheelCooldownSeconds > 0) {
        showNotification("Koło fortuny jest jeszcze w cooldownie!");
        return;
    }

    const rewards = [
        { type: 'booster', mult: 2, time: 2, label: 'Booster 2x (2 min)' },
        { type: 'booster', mult: 2, time: 5, label: 'Booster 2x (5 min)' },
        { type: 'booster', mult: 2, time: 10, label: 'Booster 2x (10 min)' },
        { type: 'timespeed', time: 1, label: 'Time Speed 1 min' },
        { type: 'timespeed', time: 2, label: 'Time Speed 2 min' },
        { type: 'timespeed', time: 5, label: 'Time Speed 5 min' },
        { type: 'timespeed', time: 10, label: 'Time Speed 10 min' },
        { type: 'currency', cp: 500n, rp: 5, label: `+500 <img src="graphic/click_point.png" class="currency-inline-icon"> & +5 <img src="graphic/resources_point.png" class="currency-inline-icon">` },
        { type: 'cop', min: 4.50, max: 9.50, label: 'Rzadkie Coin Points!' }
    ];

    let result = rewards[Math.floor(Math.random() * rewards.length)];
    let wheelBox = document.getElementById('wheel-display');

    if (result.type === 'booster') {
        addBooster(result.mult, result.time);
        wheelBox.innerText = `Wygrana: ${result.label}!`;
    } else if (result.type === 'timespeed') {
        addTimeSpeed(result.time);
        wheelBox.innerText = `Wygrana: ${result.label}!`;
    } else if (result.type === 'currency') {
        state.clickPoint += result.cp;
        state.resourcePoint += result.rp;
        wheelBox.innerHTML = `Wygrana: ${result.label}!`;
    } else if (result.type === 'cop') {
        let winCoP = parseFloat((Math.random() * (result.max - result.min) + result.min).toFixed(2));
        state.coinPoint += winCoP;
        wheelBox.innerHTML = `Super Wygrana: +${winCoP} <img src="graphic/coin_point.png" class="currency-inline-icon">`;
    }

    state.wheelCooldownSeconds = 600;
    updateUI();
}

function buyShopItem(itemType) {
    if (itemType === 'booster_17.5') {
        if (state.coinPoint >= 25) {
            state.coinPoint -= 25;
            addBooster(2, 17.5);
        } else showNotification("Za mało Coin Points (25 CoP)!");
    } else if (itemType === 'timespeed_15') {
        if (state.coinPoint >= 35) {
            state.coinPoint -= 35;
            addTimeSpeed(15);
        } else showNotification("Za mało Coin Points (35 CoP)!");
    } else if (itemType === 'trade_rp_cp') {
        if (state.resourcePoint >= 1) {
            state.resourcePoint -= 1;
            state.clickPoint += 150n;
            showNotification("Zamieniono 1 RP na 150 CP!");
        } else showNotification("Za mało Resource Point (1 RP)!");
    }
    updateUI();
}

function buyChest(chestType) {
    if (state.coinPoint < 75) {
        showNotification("Wymagane 75 Coin Points!");
        return;
    }
    state.coinPoint -= 75;

    if (chestType === 'booster') {
        let mult = parseFloat((Math.random() * (4.0 - 1.5) + 1.5).toFixed(1));
        let time = Math.floor(Math.random() * (15 - 2 + 1)) + 2;
        addBooster(mult, time);
    } else if (chestType === 'point') {
        let cpWin = BigInt(Math.floor(Math.random() * (100000 - 100 + 1)) + 100);
        state.clickPoint += cpWin;
        showNotification(`Skrzynka Point: +${formatNumber(cpWin)} CP!`);
    } else if (chestType === 'time_speed') {
        let minutes = parseFloat((Math.random() * (25.0 - 1.5) + 1.5).toFixed(1));
        addTimeSpeed(minutes);
    }
    updateUI();
}

function addUpgrade(id, name, desc, category, baseCost, currency, effect) {
    upgrades.push({ id, name, desc, category, baseCost, currency, effect, level: 0, maxLevel: 101 });
}

function addResearchGenerator(id, name, rpAmount, timeSeconds, workerCost, baseClickCost) {
    researchGeneratorsList.push({ 
        id, name, rpAmount, timeSeconds, workerCost, baseClickCost, 
        currentClickCost: baseClickCost, active: false, progress: 0 
    });
}

// Ekwipunek i Crafting
const itemValues = {
    // Surowce podstawowe (Base Items)
    'adamant_nuggets': 0.12,
    'big_leaves': 0.02,
    'big_log': 0.10,
    'bluberries': 0.03,
    'blue_mushrom': 0.07,
    'bone': 0.05,
    'bronz_nuggets': 0.12,
    'button_mushroom': 0.05,
    'clover': 0.05,
    'coal': 0.09,
    'copper_nuggets': 0.12,
    'dark_leaves': 0.02,
    'fish': 0.16,
    'gold_nuggets': 0.12,
    'leather': 0.05,
    'log': 0.32,
    'mushrom': 0.02,
    'normal_leaves': 0.02,
    'perl': 0.02,
    'purple_flower': 0.02,
    'rice': 0.04,
    'root': 0.03,
    'scales': 0.03,
    'seashells': 0.02,
    'small_flower': 0.02,
    'sticks': 0.06,
    'white_root': 0.03,
    'wood': 0.09,

    // Produkty rzemiosła (Crafted Items)
    'adamant_ingot': 0.27,
    'big_leaves_powder': 0.08,
    'big_log_planks': 0.04,
    'blueberry_jam': 0.20,
    'blue_mushrom_powder': 0.05,
    'bronz_ingot': 0.27,
    'copper_ingot': 0.27,
    'dark_leaves_powder': 0.08,
    'fish_bones': 0.03,
    'fish_flesh': 0.03,
    'gold_ingot': 0.27,
    'normal_leaves_powder': 0.08,
    'purple_flower_powder': 0.08,
    'rice_bowl': 0.18,
    'root_powder': 0.08,
    'small_flower_powder': 0.08,
    'white_root_powder': 0.08
};

const baseItemsList = [
    'adamant_nuggets', 'big_leaves', 'big_log', 'bluberries', 'blue_mushrom', 
    'bone', 'bronz_nuggets', 'button_mushroom', 'clover', 'coal', 
    'copper_nuggets', 'dark_leaves', 'fish', 'gold_nuggets', 'leather', 
    'log', 'mushrom', 'normal_leaves', 'perl', 'purple_flower', 
    'rice', 'root', 'scales', 'seashells', 'small_flower', 
    'sticks', 'white_root', 'wood'
];

const recipes = [
    { name: '3x Normalne Liście -> Pył', input: { 'normal_leaves': 3 }, output: { 'normal_leaves_powder': 1 } },
    { name: '3x Ciemne Liście -> Pył', input: { 'dark_leaves': 3 }, output: { 'dark_leaves_powder': 1 } },
    { name: '3x Duże Liście -> Pył', input: { 'big_leaves': 3 }, output: { 'big_leaves_powder': 1 } },
    { name: '3x Mały Kwiat -> Pył', input: { 'small_flower': 3 }, output: { 'small_flower_powder': 1 } },
    { name: '3x Fioletowy Kwiat -> Pył', input: { 'purple_flower': 3 }, output: { 'purple_flower_powder': 1 } },
    { name: '3x Drewno -> 1x Kłoda', input: { 'wood': 3 }, output: { 'log': 1 } },
    { name: '2x Samorodek Adamantu -> Sztabka Adamantu', input: { 'adamant_nuggets': 2 }, output: { 'adamant_ingot': 1 } },
    { name: '1x Duża Kłoda -> 3x Deski z Dużej Kłody', input: { 'big_log': 1 }, output: { 'big_log_planks': 3 } },
    { name: '5x Jagody -> Dżem Jagodowy', input: { 'bluberries': 5 }, output: { 'blueberry_jam': 1 } },
    { name: '2x Samorodek Brązu -> Sztabka Brązu', input: { 'bronz_nuggets': 2 }, output: { 'bronz_ingot': 1 } },
    { name: '2x Samorodek Miedzi -> Sztabka Miedzi', input: { 'copper_nuggets': 2 }, output: { 'copper_ingot': 1 } },
    { name: '2x Samorodek Złota -> Sztabka Złota', input: { 'gold_nuggets': 2 }, output: { 'gold_ingot': 1 } },
    { name: '1x Ryba -> Ości, Mięso, Łuski', input: { 'fish': 1 }, output: { 'fish_bones': 1, 'fish_flesh': 2, 'scales': 5 } },
    { name: '1x Niebieski Grzyb -> 2x Pył z Niebieskiego Grzyba', input: { 'blue_mushrom': 1 }, output: { 'blue_mushrom_powder': 2 } },
    { name: '4x Ryż -> Miska Ryżu', input: { 'rice': 4 }, output: { 'rice_bowl': 1 } },
    { name: '2x Korzeń -> Pył z Korzenia', input: { 'root': 2 }, output: { 'root_powder': 1 } },
    { name: '2x Biały Korzeń -> Pył z Białego Korzenia', input: { 'white_root': 2 }, output: { 'white_root_powder': 1 } }
];


// Pełna lista 50 ulepszeń kliknięć
addUpgrade('upg_c1', '1. Lepsza Myszka', '+1 pkt za kliknięcie', 'click', 3n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c2', '2. Wzmocniony Palec', '+4 pkt za kliknięcie', 'click', 50n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c3', '3. Mechaniczna Ręka', '+10 pkt za kliknięcie', 'click', 300n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c4', '4. Kopalnia Zasobów', '+37 pkt za kliknięcie', 'click', 1500n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c5', '5. Autonomiczny Kursor', '+50 pkt za kliknięcie', 'click', 5000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c6', '6. Kwantowy Klikacz', '+250 pkt za kliknięcie', 'click', 30000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c7', '7. Magnetyczna Rękawica', '+500 pkt za kliknięcie', 'click', 100000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c8', '8. Klikalna Osobliwość', '+1K pkt za kliknięcie', 'click', 400000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c9', '9. Hiperprzestrzenny Stymulator', '+16K pkt za kliknięcie', 'click', 10000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c10', '10. Nanobotowy Dotyk', '+128K pkt za kliknięcie', 'click', 100000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c11', '11. Cyfrowy Przełamywacz Barier', '+512K pkt za kliknięcie', 'click', 600000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c12', '12. Boski Palec Stwórcy', '+32M pkt za kliknięcie', 'click', 50000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c13', '13. Ektoplazmatyczny Klik', '+128M pkt za kliknięcie', 'click', 300000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c14', '14. Prędkość Warp', '+500M pkt za kliknięcie', 'click', 800000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c15', '15. Kliknięcie Chronosa', '+1B pkt za kliknięcie', 'click', 2000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c16', '16. Rękawica Nieskończoności', '+20B pkt za kliknięcie', 'click', 60000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c17', '17. Antymaterialne Stuknięcie', '+80B pkt za kliknięcie', 'click', 350000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c18', '18. Koder Rzeczywistości', '+500B pkt za kliknięcie', 'click', 3500000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c19', '19. Złamana Symulacja', '+1T pkt za kliknięcie', 'click', 10000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c20', '20. Galaktyczny Nacisk', '+10T pkt za kliknięcie', 'click', 150000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c21', '21. Kwantowy Nadzorca', '+70T pkt za kliknięcie', 'click', 1200000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c22', '22. Wielki Wybuch w Palcu', '+600T pkt za kliknięcie', 'click', 15000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c23', '23. Wymiarowy Przełącznik', '+25Qa pkt za kliknięcie', 'click', 800000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c24', '24. Przeznaczenie Programisty', '+100Qa pkt za kliknięcie', 'click', 4000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c25', '25. Nieskończona Pętla', '+500Qi pkt za kliknięcie', 'click', 30000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c26', '26. Kliknięcie Ostateczne', '+5Sx pkt za kliknięcie', 'click', 400000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c27', '27. Poza Granice Kodu', '+50Sp pkt za kliknięcie', 'click', 6500000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c28', '28. Kwantowy Splot Palców', '+450Sp pkt za kliknięcie', 'click', 40000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c29', '29. Kosmiczna Stymulacja', '+3.6Oc pkt za kliknięcie', 'click', 350000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c30', '30. Fluktuacja Próżni', '+25Oc pkt za kliknięcie', 'click', 2500000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c31', '31. Grawitacyjny Zwijacz', '+180Oc pkt za kliknięcie', 'click', 20000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c32', '32. Wielowymiarowy Stuk', '+1.2No pkt za kliknięcie', 'click', 150000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c33', '33. Pętla Chronostazy', '+10No pkt za kliknięcie', 'click', 1200000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c34', '34. Paradoks Dziadka', '+85No pkt za kliknięcie', 'click', 10000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c35', '35. Kliknięcie Hiper-Bryłowe', '+700No pkt za kliknięcie', 'click', 90000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c36', '36. Rozdzieracz Czasoprzestrzeni', '+5Dc pkt za kliknięcie', 'click', 800000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c37', '37. Kod Ostatecznego Wyjścia', '+40Dc pkt za kliknięcie', 'click', 7500000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c38', '38. Superpozycja Dotyku', '+350Dc pkt za kliknięcie', 'click', 70000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c39', '39. Kolaps Fali Prawdopodobieństwa', '+3Un pkt za kliknięcie', 'click', 650000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c40', '40. Złamanie Szybkości Światła', '+25Un pkt za kliknięcie', 'click', 6000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c41', '41. Matryca Przeznaczenia', '+200Un pkt za kliknięcie', 'click', 55000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c42', '42. Palec Wyższego Rzędu', '+1.8Du pkt za kliknięcie', 'click', 500000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c43', '43. Puls Tachionowy', '+15Du pkt za kliknięcie', 'click', 4800000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c44', '44. Nadwzroczność Systemowa', '+120Du pkt za kliknięcie', 'click', 45000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c45', '45. Anihilacja Ograniczeń', '+1Td pkt za kliknięcie', 'click', 420000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c46', '46. Kliknięcie Meta-Fizyczne', '+9Td pkt za kliknięcie', 'click', 4000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c47', '47. Algorytm Boga', '+80Td pkt za kliknięcie', 'click', 38000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c48', '48. Przełamanie Pętli Rzeczywistości', '+700Td pkt za kliknięcie', 'click', 360000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c49', '49. Osobliwość Absolutna', '+6Qt pkt za kliknięcie', 'click', 3500000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_c50', '50. Poza Horyzont Zdarzeń', '+55Qt pkt za kliknięcie', 'click', 35000000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});

// Pełna lista 50 ulepszeń pasywnych
addUpgrade('upg_p1', '1. Automatyczny Skrypt', '+2 pkt/sek', 'passive', 50n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p2', '2. Chomik w Kołowrotku', '+8 pkt/sek', 'passive', 250n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p3', '3. Zatrudniony Klikacz', '+20 pkt/sek', 'passive', 1200n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p4', '4. Farma Botów', '+75 pkt/sek', 'passive', 6000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p5', '5. Serwerownia w Piwnicy', '+100 pkt/sek', 'passive', 25000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p6', '6. Algorytm Przychodu', '+500 pkt/sek', 'passive', 150000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p7', '7. Sztuczna Inteligencja', '+1K pkt/sek', 'passive', 600000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p8', '8. Rój Nanorobotów', '+2K pkt/sek', 'passive', 2500000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p9', '9. Fabryka Generatorów', '+32K pkt/sek', 'passive', 50000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p10', '10. Cyfrowa Korporacja', '+256K pkt/sek', 'passive', 500000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p11', '11. Kwantowa Chmura Obliczeniowa', '+1.024M pkt/sek', 'passive', 3000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p12', '12. Globalny Monopol Informacyjny', '+64M pkt/sek', 'passive', 250000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p13', '13. Sieć Neuronowa Świata', '+256M pkt/sek', 'passive', 1500000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p14', '14. Planetarny Generator Czasu', '+1B pkt/sek', 'passive', 8000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p15', '15. Fuzja Rdzeniowa Gamedeva', '+5B pkt/sek', 'passive', 50000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p16', '16. Pętla Przestrzenna', '+25B pkt/sek', 'passive', 350000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p17', '17. Emanacja Pustki', '+150B pkt/sek', 'passive', 2500000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p18', '18. Matrix 2.0', '+800B pkt/sek', 'passive', 16000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p19', '19. Galaktyczny Nadajnik', '+2T pkt/sek', 'passive', 50000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p20', '20. Singularność Przychodu', '+20T pkt/sek', 'passive', 600000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p21', '21. Hiper-Kompilator', '+150T pkt/sek', 'passive', 5000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p22', '22. Równoległe Uniwersum', '+1.2Qa pkt/sek', 'passive', 50000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p23', '23. Esencja Prędkości', '+50Qa pkt/sek', 'passive', 2500000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p24', '24. Czwarty Wymiar Przychodu', '+200Qa pkt/sek', 'passive', 12000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p25', '25. Naczelny Architekt Kodu', '+1Sx pkt/sek', 'passive', 80000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p26', '26. Nieskończony Strumień Myśli', '+10Sx pkt/sek', 'passive', 1000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p27', '27. Absolutne Źródło Danych', '+55Sp pkt/sek', 'passive', 5500000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p28', '28. Multi-Wymiarowa Serwerownia', '+500Sp pkt/sek', 'passive', 45000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p29', '29. Kosmiczny Generator Przychodu', '+4Oc pkt/sek', 'passive', 400000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p30', '30. Projektor Fali Kwantowej', '+28Oc pkt/sek', 'passive', 3000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p31', '31. Hiperprzestrzenna Kopalnia', '+200Oc pkt/sek', 'passive', 24000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p32', '32. Makro-Struktura Przychodu', '+1.4No pkt/sek', 'passive', 180000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p33', '33. Reaktor Paralleli', '+12No pkt/sek', 'passive', 1400000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p34', '34. Strumień Tachionów', '+95No pkt/sek', 'passive', 12000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p35', '35. Symulator Wielkiego Wybuchu', '+800No pkt/sek', 'passive', 100000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p36', '36. Kolektor Energii Próżni', '+6Dc pkt/sek', 'passive', 900000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p37', '37. Kod Architekta Wszechświata', '+48Dc pkt/sek', 'passive', 8500000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p38', '38. Automatyzacja Wyższego Wymiaru', '+400Dc pkt/sek', 'passive', 80000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p39', '39. Chronowizor Zarobkowy', '+3.5Un pkt/sek', 'passive', 750000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p40', '40. Sieć Meta-Kwantowa', '+28Un pkt/sek', 'passive', 7000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p41', '41. Rdzeń Nieskończonego Postępu', '+220Un pkt/sek', 'passive', 65000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p42', '42. Galaktyczna Nad-Struktura', '+2Du pkt/sek', 'passive', 600000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p43', '43. Pulsator Prawdopodobieństwa', '+18Du pkt/sek', 'passive', 5500000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p44', '44. Nad-Inżynieria Matrixa', '+140Du pkt/sek', 'passive', 50000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p45', '45. Paradoks Nieskończonych Danych', '+1.2Td pkt/sek', 'passive', 480000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p46', '46. Kompilator Rzeczywistości', '+10Td pkt/sek', 'passive', 4500000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p47', '47. Singularność Informacyjna', '+90Td pkt/sek', 'passive', 42000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p48', '48. Absolutny Strumień Przychodu', '+800Td pkt/sek', 'passive', 400000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p49', '49. Wszechwiedzący Algorytm', '+7Qt pkt/sek', 'passive', 3800000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});
addUpgrade('upg_p50', '50. Ostateczna Dominacja Kodu', '+60Qt pkt/sek', 'passive', 38000000000000000000000000000000000000000000000000000n, 'clickPoint', (lvl) => {});

// Badania wielokrotne (Ziemia)
addUpgrade('res1', 'Badania nad Parą', 'Zwiększa postęp techniczny Ziemi (+25%)', 'research', 1, 'researchPoint', (lvl) => { addTechProgress(25); });
addUpgrade('res_3z_1', 'Optymalizacja Sieci', 'Przyspiesza badania i rozwój (+30%)', 'research', 3, 'researchPoint', (lvl) => { addTechProgress(30); });
addUpgrade('res2', 'Komputeryzacja', 'Duży skok technologiczny (+50%)', 'research', 5, 'researchPoint', (lvl) => { addTechProgress(50); });
addUpgrade('res_3z_2', 'Automatyzacja Fabryk', 'Zwiększa zaawansowanie techniczne Ziemi (+45%)', 'research', 8, 'researchPoint', (lvl) => { addTechProgress(45); });
addUpgrade('res_3z_3', 'Nanotechnologia', 'Kolejny krok w ewolucji cywilizacji (+60%)', 'research', 15, 'researchPoint', (lvl) => { addTechProgress(60); });
addUpgrade('res_3z_4', 'Sztuczna Superinteligencja', 'Rewolucja w algorytmach obliczeniowych (+80%)', 'research', 30, 'researchPoint', (lvl) => { addTechProgress(80); });
addUpgrade('res_3z_5', 'Fuzja Termojądrowa', 'Ogromny skok energetyczny cywilizacji (+100%)', 'research', 50, 'researchPoint', (lvl) => { addTechProgress(100); });
addUpgrade('res_3z_6', 'Kolonizacja Marsa', 'Rozszerzenie horyzontów ludzkości (+125%)', 'research', 80, 'researchPoint', (lvl) => { addTechProgress(125); });
addUpgrade('res_3z_7', 'Napęd Antymateriowy', 'Przełom w fizyce kwantowej (+150%)', 'research', 120, 'researchPoint', (lvl) => { addTechProgress(150); });
addUpgrade('res_3z_8', 'Inżynieria Planetarna', 'Terraforming na dużą skalę (+200%)', 'research', 180, 'researchPoint', (lvl) => { addTechProgress(200); });

// Generatory (Powtarzalne badania)
addResearchGenerator('rg1', 'Analiza Podstawowa', 1, 30.0, 6, 700);
addResearchGenerator('rg2', 'Badania Zaawansowane', 2, 50.0, 12, 1400);
addResearchGenerator('rg3', 'Projekt Globalny', 4, 140.0, 24, 2800);

document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    renderRecruitOptions();
    renderButtonUpgrades();

    checkDailyRewardStatus();

    let clickBtn = document.getElementById('main-click-btn');
    if (clickBtn) {
        clickBtn.addEventListener('click', () => {
            state.clickPoint += getEffectiveClickPower();
            let chance = state.eventResourceChanceTime > 0 ? 0.50 : 0.10;
            if (Math.random() < chance) {
                state.resourcePoint += 1;
            }
            updateUI();
        });
    }

    renderUpgrades();
    renderResearchGenerators();
    renderCraftingRecipes();
    renderInventory();
    updateUI();

    // Pętla 1: Wywoływana raz na sekundę (1000 ms)
    let saveCounter = 0;
    setInterval(() => {
        if (state.eventResourceChanceTime > 0) state.eventResourceChanceTime--;
        if (state.eventPassiveMultTime > 0) state.eventPassiveMultTime--;
        if (state.eventClickMultTime > 0) state.eventClickMultTime--;
        
        if (state.eventDiscountTime > 0) {
            state.eventDiscountTime--;
            if (state.eventDiscountTime === 0) renderUpgrades(); 
        }
        
        if (state.eventFallingActiveTime > 0) state.eventFallingActiveTime--;
        let gain = getEffectivePassiveGain();
        if (gain > 0n) {
            state.clickPoint += gain;
        }

        for (let i = state.activeBoosters.length - 1; i >= 0; i--) {
            state.activeBoosters[i].timeSeconds -= 1;
            if (state.activeBoosters[i].timeSeconds <= 0) {
                showNotification(`Booster ${state.activeBoosters[i].mult}x wygasł!`);
                state.activeBoosters.splice(i, 1);
            }
        }

        if (state.wheelCooldownSeconds > 0) {
            state.wheelCooldownSeconds -= 1;
        }

        let spinBtn = document.getElementById('spin-wheel-btn');
        if (spinBtn) {
            if (state.wheelCooldownSeconds > 0) {
                let cm = Math.floor(state.wheelCooldownSeconds / 60);
                let cs = Math.floor(state.wheelCooldownSeconds % 60);
                spinBtn.disabled = true;
                spinBtn.innerText = `Odnawianie (${cm}m ${cs < 10 ? '0' : ''}${cs}s)`;
            } else {
                spinBtn.disabled = false;
                spinBtn.innerText = 'Zakręć Kołem!';
            }
        }

        updateUI();
        checkDailyRewardStatus();

        saveCounter++;
        if (saveCounter >= 10) {
            saveGame();
            saveCounter = 0;
        }
    }, 1000);

    // Pętla 2: Wywoływana 60 razy na sekundę (Szybka pętla płynności pasków)
    setInterval(() => {
        researchGeneratorsList.forEach(gen => {
            if (gen.active) {
                gen.progress += (1 / 60) / gen.timeSeconds;
                if (gen.progress >= 1) {
                    gen.progress = 0;
                    gen.active = false; 
                    state.researchPoint += gen.rpAmount; 
                    state.workers += gen.workerCost; 
                    updateUI();
                    renderResearchGenerators(); 
                }
                updateGeneratorUI(gen.id);
            }
        });

        if (recruitOption.active) {
            recruitOption.progress += (1 / 60) / recruitOption.time;
            if (recruitOption.progress >= 1) {
                recruitOption.progress = 0;
                recruitOption.active = false;
                state.workers += recruitOption.workersGainedTotal;
                updateUI();
            }
            updateRecruitUI();
        }
    }, 1000 / 60);
});

function setRecruitBatch(mode) {
    recruitBatchMode = mode;
    document.querySelectorAll('.batch-btn').forEach(b => b.classList.remove('active'));
    let activeBtn = document.getElementById(`batch-${mode}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderRecruitOptions();
}

function getMaxRecruitAffordableCount() {
    let baseRP = recruitOption.rp;
    let baseCP = recruitOption.cp;
    let maxByRP = Math.floor(state.resourcePoint / baseRP);
    let maxByCP = Math.floor(Number(state.clickPoint) / baseCP);
    let possibleCount = Math.min(maxByRP, maxByCP);
    return Math.max(1, possibleCount);
}

function startRecruit() {
    if (recruitOption.active) return;

    let buyCount = 1;
    if (recruitBatchMode === 10) buyCount = 10;
    else if (recruitBatchMode === 'max') buyCount = getMaxRecruitAffordableCount();

    let totalCostRP = recruitOption.rp * buyCount;
    let totalCostCP = BigInt(recruitOption.cp * buyCount);

    if (state.resourcePoint >= totalCostRP && state.clickPoint >= totalCostCP) {
        state.resourcePoint -= totalCostRP;
        state.clickPoint -= totalCostCP;
        recruitOption.active = true;
        recruitOption.progress = 0;
        recruitOption.workersGainedTotal = recruitOption.workersGain * buyCount;
        updateUI();
    }
}

function updateRecruitUI() {
    let bar = document.getElementById('recruit-bar');
    let btn = document.getElementById('recruit-btn');
    if (bar) bar.style.width = `${recruitOption.progress * 100}%`;
    if (btn) {
        let buyCount = 1;
        if (recruitBatchMode === 10) buyCount = 10;
        else if (recruitBatchMode === 'max') buyCount = getMaxRecruitAffordableCount();

        let totalCostRP = recruitOption.rp * buyCount;
        let totalCostCP = BigInt(recruitOption.cp * buyCount);

        btn.disabled = recruitOption.active || (state.resourcePoint < totalCostRP || state.clickPoint < totalCostCP);
        btn.innerText = recruitOption.active ? 'Rekrutacja...' : `Rekrutuj (${buyCount}x)`;
    }
}

function renderRecruitOptions() {
    let container = document.getElementById('recruit-options-container');
    if (!container) return;
    container.innerHTML = '';

    let buyCount = 1;
    if (recruitBatchMode === 10) buyCount = 10;
    else if (recruitBatchMode === 'max') buyCount = getMaxRecruitAffordableCount();

    let totalCostRP = recruitOption.rp * buyCount;
    let totalCostCP = recruitOption.cp * buyCount;
    let totalGain = recruitOption.workersGain * buyCount;

    let div = document.createElement('div');
    div.style.cssText = "background: rgba(22, 33, 62, 0.9); padding: 8px; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem;";
    
    let reqHTML = `${totalCostRP} <img src="graphic/resources_point.png" class="currency-inline-icon"> + ${formatNumber(totalCostCP)} <img src="graphic/click_point.png" class="currency-inline-icon"> = <strong>+${totalGain} <img src="graphic/workers.png" class="currency-inline-icon"></strong>`;

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${reqHTML}</span>
            <button class="upgrade-btn" id="recruit-btn" onclick="startRecruit()">Rekrutuj (${buyCount}x)</button>
        </div>
        <div style="width: 100%; background: #1a1a2e; height: 8px; border-radius: 4px; overflow: hidden;">
            <div id="recruit-bar" style="width: 0%; height: 100%; background: #e94560;"></div>
        </div>
    `;
    container.appendChild(div);
}

function gatherRandomItem() {
    let randBase = baseItemsList[Math.floor(Math.random() * baseItemsList.length)];
    inventory[randBase] = (inventory[randBase] || 0) + 1;
    updateUI();
    renderInventory();
}

function sendExpedition() {
    if (state.workers >= 0.1) {
        state.workers -= 0.1;
        state.workers = Math.round(state.workers * 10) / 10;

        for (let i = 0; i < 4; i++) {
            let randBase = baseItemsList[Math.floor(Math.random() * baseItemsList.length)];
            inventory[randBase] = (inventory[randBase] || 0) + 1;
        }

        updateUI();
        renderInventory();
    } else {
        showNotification("Za mało wolnych workerów!");
    }
}

function sellItem(itemName) {
    if (inventory[itemName] && inventory[itemName] > 0) {
        inventory[itemName] -= 1;
        if (inventory[itemName] <= 0) delete inventory[itemName];
        state.coinPoint += (itemValues[itemName] || 0.01);
        updateUI();
        renderInventory();
    }
}

function renderInventory() {
    let container = document.getElementById('inventory-container');
    if (!container) return;
    container.innerHTML = '';

    let expeditionBox = document.createElement('div');
    expeditionBox.style.cssText = "grid-column: 1 / -1; margin-bottom: 10px; background: rgba(22, 33, 62, 0.9); padding: 10px; border-radius: 6px; border: 1px solid #00fff5; text-align: center;";
    expeditionBox.innerHTML = `
        <p style="font-size: 0.85rem; margin-bottom: 6px;">Ekspedycja po towary (Koszt: 0.1 <img src="graphic/workers.png" class="currency-inline-icon"> = 4 losowe itemy)</p>
        <button class="custom-action-btn" id="expedition-btn" onclick="sendExpedition()">Wyślij ekspedycję</button>
    `;
    container.appendChild(expeditionBox);

    if (Object.keys(inventory).length === 0) {
        let emptyMsg = document.createElement('p');
        emptyMsg.style.cssText = "color: #a0a0a0; font-size: 0.85rem; text-align: center; grid-column: 1/-1;";
        emptyMsg.innerText = "Brak przedmiotów w ekwipunku.";
        container.appendChild(emptyMsg);
        updateExpeditionButtonState();
        return;
    }

    for (let [item, count] of Object.entries(inventory)) {
        let card = document.createElement('div');
        card.className = 'item-card';
        let imgPath = `graphic/items/${item}.png`;
        let price = itemValues[item] || 0;
        card.innerHTML = `
            <img src="${imgPath}" alt="${item}" onerror="this.src='graphic/click_point.png'">
            <span>${item} (${count})</span>
            <small style="color: #f1c40f;">${price.toFixed(2)} <img src="graphic/coin_point.png" class="currency-inline-icon"></small>
            <button class="custom-action-btn" style="padding: 3px 8px; font-size: 0.75rem;" onclick="sellItem('${item}')">Sprzedaj</button>
        `;
        container.appendChild(card);
    }
    updateExpeditionButtonState();
}

function updateExpeditionButtonState() {
    let btn = document.getElementById('expedition-btn');
    if (btn) btn.disabled = state.workers < 0.1;
}

function formatRecipeItemsHTML(obj) {
    return Object.entries(obj).map(([item, count]) => {
        let imgPath = `graphic/items/${item}.png`;
        return `${count}x <img src="${imgPath}" class="crafting-item-icon" alt="${item}" title="${item}" onerror="this.style.display='none'"> <span>${item}</span>`;
    }).join(' + ');
}

function renderCraftingRecipes() {
    let container = document.getElementById('crafting-container');
    if (!container) return;
    container.innerHTML = '';

    recipes.forEach((rec, idx) => {
        let row = document.createElement('div');
        row.className = 'craft-row';
        let inputHTML = formatRecipeItemsHTML(rec.input);
        let outputHTML = formatRecipeItemsHTML(rec.output);

        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 0.8rem;">
                ${inputHTML} <span style="margin: 0 4px;">➔</span> ${outputHTML}
            </div>
            <button class="custom-action-btn" onclick="craftItem(${idx})">Wykonaj</button>
        `;
        container.appendChild(row);
    });
}

function craftItem(index) {
    let rec = recipes[index];
    let hasAll = true;
    for (let [item, reqCount] of Object.entries(rec.input)) {
        if ((inventory[item] || 0) < reqCount) {
            hasAll = false;
            break;
        }
    }

    if (hasAll) {
        for (let [item, reqCount] of Object.entries(rec.input)) {
            inventory[item] -= reqCount;
            if (inventory[item] <= 0) delete inventory[item];
        }
        for (let [item, outCount] of Object.entries(rec.output)) {
            inventory[item] = (inventory[item] || 0) + outCount;
        }
        renderInventory();
    } else {
        showNotification("Brak wymaganych składników!");
    }
}

function addTechProgress(amount) {
    state.techProgress += amount;
    while (state.techProgress >= 100) {
        state.techProgress -= 100;
        state.techLevel += 1;
        state.researchPoint += 1;
        state.workers += 15; 
        showNotification(`Awans Ziemi na Poziom ${state.techLevel}!`);
    }
    renderResearchGenerators();
    updateUI();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    let activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.add('active');
}

function renderResearchGenerators() {
    const container = document.getElementById('research-generators');
    if (!container) return;
    container.innerHTML = '';

    researchGeneratorsList.forEach(gen => {
        let div = document.createElement('div');
        div.style.cssText = "background: rgba(22, 33, 62, 0.9); padding: 8px; border-radius: 6px; margin-bottom: 6px; display: flex; flex-direction: column; gap: 4px;";
        
        let currentCPCost = Math.floor(gen.currentClickCost);
        let titleName = `${gen.name} (${gen.rpAmount} <img src="graphic/research_point.png" class="currency-inline-icon">) (${gen.timeSeconds}s)`;

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; font-weight: bold; color: #fff;">${titleName}</span>
                <span style="font-size: 0.75rem; color: #a0a0a0;">Koszt: ${formatNumber(currentCPCost)} <img src="graphic/click_point.png" class="currency-inline-icon"> | ${gen.workerCost} <img src="graphic/workers.png" class="currency-inline-icon"></span>
                <button class="upgrade-btn" id="gen-btn-${gen.id}" onclick="startResearchGen('${gen.id}')">Start</button>
            </div>
            <div style="width: 100%; background: #1a1a2e; height: 8px; border-radius: 4px; overflow: hidden;">
                <div id="gen-bar-${gen.id}" style="width: ${gen.progress * 100}%; height: 100%; background: #00fff5;"></div>
            </div>
        `;
        container.appendChild(div);
    });
}

function startResearchGen(id) {
    const gen = researchGeneratorsList.find(g => g.id === id);
    if (!gen || gen.active) return;

    let costCP = BigInt(Math.floor(gen.currentClickCost));

    if (state.clickPoint >= costCP && state.workers >= gen.workerCost) {
        state.clickPoint -= costCP;
        state.workers -= gen.workerCost; 
        gen.currentClickCost *= 2.0; 
        gen.active = true;
        gen.progress = 0;
        renderResearchGenerators();
        updateUI();
    } else {
        showNotification("Za mało Click Points lub Workerów!");
    }
}

function updateGeneratorUI(id) {
    const gen = researchGeneratorsList.find(g => g.id === id);
    const bar = document.getElementById(`gen-bar-${id}`);
    const btn = document.getElementById(`gen-btn-${id}`);
    let costCP = BigInt(Math.floor(gen.currentClickCost));

    if (bar) bar.style.width = `${gen.progress * 100}%`;
    if (btn) {
        let hasEnoughCP = state.clickPoint >= costCP;
        let hasEnoughWorkers = state.workers >= gen.workerCost;
        btn.disabled = gen.active || !hasEnoughCP || !hasEnoughWorkers;
    }
}

function getUpgradeCost(upg) {
    let multiplier = 1.0;
    if (upg.category === 'click') {
        multiplier = 1.50;
    } else if (upg.category === 'passive') {
        multiplier = 1.65;
    } else {
        multiplier = 1.80;
    }

    let finalCost = Math.floor(Number(upg.baseCost) * Math.pow(multiplier, upg.level));
    if (state.eventDiscountTime > 0) {
        finalCost = Math.floor(finalCost * 0.90);
    }
    return finalCost;
}

function getUpgradeRpCost(upg) { return upg.level < 35 ? 0 : Math.floor(2 * Math.pow(1.2, upg.level - 35)); }
function getResearchCost(upg) { return Math.floor(upg.baseCost * Math.pow(1.2, upg.level)); }

function renderUpgrades() {
    const clickContainer = document.getElementById('upgrades-click-container');
    const passiveContainer = document.getElementById('upgrades-passive-container');
    const researchContainer = document.getElementById('research-container');

    if (clickContainer) clickContainer.innerHTML = '';
    if (passiveContainer) passiveContainer.innerHTML = '';
    if (researchContainer) researchContainer.innerHTML = '';

    let clickUpgs = upgrades.filter(u => u.category === 'click');
    let passiveUpgs = upgrades.filter(u => u.category === 'passive');
    let researchUpgs = upgrades.filter(u => u.category === 'research');

    function renderCategoryList(list, container) {
        list.forEach((upg, index) => {
            if (index > 0 && list[index - 1].level < 10) return;

            let card = document.createElement('div');
            card.className = 'upgrade-card';
            let currencyIcon = '<img src="graphic/click_point.png" class="currency-inline-icon">';
            let rpIcon = '<img src="graphic/resources_point.png" class="currency-inline-icon">';
            
            let currentCost = getUpgradeCost(upg);
            let rpCost = getUpgradeRpCost(upg);
            let costText = `${formatNumber(currentCost)} ${currencyIcon}`;
            
            if (rpCost > 0) costText += ` + ${formatNumber(rpCost)} ${rpIcon}`;
            let btnText = upg.level >= upg.maxLevel ? 'Max Poziom' : `Kup (Poz. ${upg.level}/${upg.maxLevel})`;

            card.innerHTML = `
                <div class="bar-top">
                    <h4>${upg.name} (Poz. ${upg.level})</h4>
                </div>
                <div class="bar-middle">
                    <p>${upg.desc}</p>
                    <small>Koszt: ${costText}</small>
                </div>
                <div class="bar-down">
                    <button class="upgrade-btn" id="btn-${upg.id}" onclick="buyUpgrade('${upg.id}')">${btnText}</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    if (clickContainer) renderCategoryList(clickUpgs, clickContainer);
    if (passiveContainer) renderCategoryList(passiveUpgs, passiveContainer);

    researchUpgs.forEach((upg) => {
        upg.maxLevel = 25;
        let card = document.createElement('div');
        card.className = 'upgrade-card';
        let currencyIcon = '<img src="graphic/research_point.png" class="currency-inline-icon">';
        let realCost = getResearchCost(upg);
        let btnText = upg.level >= upg.maxLevel ? 'Max Poziom' : `Kup (Poz. ${upg.level}/${upg.maxLevel})`;

        card.innerHTML = `
            <div class="bar-top">
                <h4>${upg.name} (Poz. ${upg.level})</h4>
            </div>
            <div class="bar-middle">
                <p>${upg.desc}</p>
                <small>Koszt: ${upg.level >= upg.maxLevel ? 'MAX' : formatNumber(realCost) + ' ' + currencyIcon}</small>
            </div>
            <div class="bar-down">
                <button class="upgrade-btn" id="btn-${upg.id}" onclick="buyUpgrade('${upg.id}')" ${upg.level >= upg.maxLevel ? 'disabled' : ''}>${btnText}</button>
            </div>
        `;
        if (researchContainer) researchContainer.appendChild(card);
    });
}

function buyUpgrade(id) {
    const upg = upgrades.find(u => u.id === id);
    if (!upg || upg.level >= upg.maxLevel) return;

    if (upg.category === 'research') {
        let cost = getResearchCost(upg);
        if (state.researchPoint >= cost) {
            state.researchPoint -= cost;
            upg.level += 1;
            if (upg.effect) upg.effect(upg.level);
            renderUpgrades();
            updateUI();
        }
        return;
    }

    let mainCost = BigInt(getUpgradeCost(upg));
    let rpCost = getUpgradeRpCost(upg);
    if (state[upg.currency] >= mainCost && (rpCost === 0 || state.resourcePoint >= rpCost)) {
        state[upg.currency] -= mainCost;
        if (rpCost > 0) state.resourcePoint -= rpCost;
        upg.level += 1;
        recalculateBaseGains(); 
        renderUpgrades();
        updateUI();
    }
}

function updateUI() {
    let cpDisplay = document.getElementById('click-count');
    let rpDisplay = document.getElementById('resource-count');
    let resDisplay = document.getElementById('research-count');
    let coinDisplay = document.getElementById('coin-count');
    let powerDisplay = document.getElementById('click-power-display');
    let cpsDisplay = document.getElementById('cps-display');

    if (cpDisplay) cpDisplay.innerText = formatNumber(state.clickPoint);
    if (rpDisplay) rpDisplay.innerText = formatNumber(state.resourcePoint);
    if (resDisplay) resDisplay.innerText = formatNumber(state.researchPoint);
    if (coinDisplay) coinDisplay.innerText = state.coinPoint.toFixed(2);
    if (powerDisplay) powerDisplay.innerText = formatNumber(getEffectiveClickPower());
    if (cpsDisplay) cpsDisplay.innerText = formatNumber(getEffectivePassiveGain());

    const workerDisplay = document.getElementById('worker-count');
    if (workerDisplay) workerDisplay.innerText = formatNumber(state.workers);

    const boosterContainer = document.getElementById('active-booster-list');
    if (boosterContainer) {
        boosterContainer.innerHTML = ''; 
        if (state.activeBoosters.length > 0) {
            state.activeBoosters.forEach(b => {
                let min = Math.floor(b.timeSeconds / 60);
                let sec = Math.floor(b.timeSeconds % 60);
                let bDiv = document.createElement('div');
                bDiv.style.cssText = "color: #f1c40f; font-size: 0.85rem; font-weight: bold; background: rgba(241, 196, 15, 0.1); padding: 4px 8px; border-radius: 4px; border-left: 3px solid #f1c40f; margin-top: 4px;";
                bDiv.innerText = `🚀 Booster ${b.mult}x: ${min}m ${sec < 10 ? '0' : ''}${sec}s`;
                boosterContainer.appendChild(bDiv);
            });
        }
    }

    let rebirthBtn = document.getElementById('rebirth-btn');
    let rebirthCostDisplay = document.getElementById('rebirth-cost-display');
    let rebirthBar = document.getElementById('rebirth-bar');
    let rebirthCost = BigInt(getRebirthCost());
    
    if (rebirthCostDisplay) rebirthCostDisplay.innerText = formatNumber(rebirthCost);
    if (rebirthBtn) rebirthBtn.disabled = state.clickPoint < rebirthCost;

    if (rebirthBar) {
        let percentage = rebirthCost > 0n ? Math.min(100, Number((state.clickPoint * 100n) / rebirthCost)) : 100;
        rebirthBar.style.width = `${percentage}%`;
    }

    upgrades.forEach(upg => {
        let btnStandard = document.getElementById(`btn-${upg.id}`);
        if (btnStandard) {
            if (upg.level >= upg.maxLevel) {
                btnStandard.disabled = true;
                btnStandard.innerText = 'Max Poziom';
            } else if (upg.category === 'research') {
                let realCost = getResearchCost(upg);
                btnStandard.disabled = state.researchPoint < realCost;
            } else {
                let mainCost = BigInt(getUpgradeCost(upg));
                let rpCost = getUpgradeRpCost(upg);
                btnStandard.disabled = !(state[upg.currency] >= mainCost && (rpCost === 0 || state.resourcePoint >= rpCost));
            }
        }

        let btnMastery = document.getElementById(`btn-mastery-${upg.id}`);
        if (btnMastery) {
            let currentLvl = masteryLevels[upg.id] || 0;
            if (currentLvl >= 3) {
                btnMastery.disabled = true;
                btnMastery.innerText = 'Max Mistrzostwo';
            } else {
                let cost = BigInt(getMasteryCost(upg));
                btnMastery.disabled = state.clickPoint < cost;
            }
        }
    });

    buttonUpgrades.forEach(bu => {
        let btnButtonUpg = document.getElementById(`btn-bu-${bu.id}`);
        if (btnButtonUpg) {
            if (bu.level >= bu.maxLevel) {
                btnButtonUpg.disabled = true;
                btnButtonUpg.innerText = 'Max Poziom';
            } else {
                let cost = BigInt(getButtonUpgradeCost(bu));
                btnButtonUpg.disabled = state.clickPoint < cost;
            }
        }
    });

    researchGeneratorsList.forEach(gen => {
        let btn = document.getElementById(`gen-btn-${gen.id}`);
        let costCP = BigInt(Math.floor(gen.currentClickCost));
        if (btn && !gen.active) {
            btn.disabled = (state.clickPoint < costCP || state.workers < gen.workerCost);
        }
    });

    let progressB = document.getElementById('tech-progress-bar');
    let levelD = document.getElementById('tech-level-display');
    if (progressB) progressB.style.width = `${state.techProgress}%`;
    levelD.innerText = `Poziom Ziemi: ${state.techLevel} (Bonus Rebirth: x${getRebirthMultiplier().toFixed(1)})`;
    updateDailyRewardUI();
}

function recalculateBaseGains() {
    state.baseClickPower = 1n;
    state.basePassiveGain = 0n;
    
    const clickValues = {
        upg_c1: 1n, upg_c2: 4n, upg_c3: 10n, upg_c4: 37n, upg_c5: 50n, upg_c6: 250n, upg_c7: 500n,
        upg_c8: 1000n, upg_c9: 16000n, upg_c10: 128000n, upg_c11: 512000n, upg_c12: 32000000n,
        upg_c13: 128000000n, upg_c14: 500000000n, upg_c15: 1000000000n, upg_c16: 20000000000n,
        upg_c17: 80000000000n, upg_c18: 500000000000n, upg_c19: 1000000000000n,
        upg_c20: 10000000000000n, upg_c21: 70000000000000n, upg_c22: 600000000000000n,
        upg_c23: 25000000000000000n, upg_c24: 100000000000000000n, upg_c25: 500000000000000000000n,
        upg_c26: 5000000000000000000000n, upg_c27: 50000000000000000000000000n,
        upg_c28: 450000000000000000000000000n, upg_c29: 3600000000000000000000000000n,
        upg_c30: 25000000000000000000000000000n, upg_c31: 180000000000000000000000000000n,
        upg_c32: 1200000000000000000000000000000n, upg_c33: 10000000000000000000000000000000n,
        upg_c34: 85000000000000000000000000000000n, upg_c35: 700000000000000000000000000000000n,
        upg_c36: 5000000000000000000000000000000000n, upg_c37: 40000000000000000000000000000000000n,
        upg_c38: 350000000000000000000000000000000000n, upg_c39: 3000000000000000000000000000000000000n,
        upg_c40: 25000000000000000000000000000000000000n, upg_c41: 200000000000000000000000000000000000000n,
        upg_c42: 1800000000000000000000000000000000000000n, upg_c43: 15000000000000000000000000000000000000000n,
        upg_c44: 120000000000000000000000000000000000000000n, upg_c45: 1000000000000000000000000000000000000000000n,
        upg_c46: 9000000000000000000000000000000000000000000n, upg_c47: 80000000000000000000000000000000000000000000n,
        upg_c48: 700000000000000000000000000000000000000000000n, upg_c49: 6000000000000000000000000000000000000000000000n,
        upg_c50: 55000000000000000000000000000000000000000000000n
    };

    const passiveValues = {
        upg_p1: 2n, upg_p2: 8n, upg_p3: 20n, upg_p4: 75n, upg_p5: 100n, upg_p6: 500n, upg_p7: 1000n,
        upg_p8: 2000n, upg_p9: 32000n, upg_p10: 256000n, upg_p11: 1024000n, upg_p12: 64000000n,
        upg_p13: 256000000n, upg_p14: 1000000000n, upg_p15: 5000000000n, upg_p16: 25000000000n,
        upg_p17: 150000000000n, upg_p18: 800000000000n, upg_p19: 4000000000000n,
        upg_p20: 20000000000000n, upg_p21: 150000000000000n, upg_p22: 1200000000000000n,
        upg_p23: 500000000000000000n, upg_p24: 200000000000000000n, upg_p25: 1000000000000000000000n,
        upg_p26: 10000000000000000000000n, upg_p27: 100000000000000000000000000n,
        upg_p28: 500000000000000000000000000n, upg_p29: 4000000000000000000000000000n,
        upg_p30: 28000000000000000000000000000n, upg_p31: 200000000000000000000000000000n,
        upg_p32: 1400000000000000000000000000000n, upg_p33: 12000000000000000000000000000000n,
        upg_p34: 95000000000000000000000000000000n, upg_p35: 800000000000000000000000000000000n,
        upg_p36: 6000000000000000000000000000000000n, upg_p37: 48000000000000000000000000000000000n,
        upg_p38: 400000000000000000000000000000000000n, upg_p39: 3500000000000000000000000000000000000n,
        upg_p40: 28000000000000000000000000000000000000n, upg_p41: 220000000000000000000000000000000000000n,
        upg_p42: 2000000000000000000000000000000000000000n, upg_p43: 18000000000000000000000000000000000000000n,
        upg_p44: 140000000000000000000000000000000000000000n, upg_p45: 1200000000000000000000000000000000000000000n,
        upg_p46: 10000000000000000000000000000000000000000000n, upg_p47: 90000000000000000000000000000000000000000000n,
        upg_p48: 800000000000000000000000000000000000000000000n, upg_p49: 7000000000000000000000000000000000000000000000n,
        upg_p50: 60000000000000000000000000000000000000000000000n
    };

    upgrades.forEach(upg => {
        if (upg.level > 0) {
            let masteryMult = getMasteryMultiplier(upg.id);
            if (upg.category === 'click' && clickValues[upg.id] !== undefined) {
                let gained = clickValues[upg.id] * BigInt(upg.level);
                state.baseClickPower += BigInt(Math.floor(Number(gained) * masteryMult));
            } 
            else if (upg.category === 'passive' && passiveValues[upg.id] !== undefined) {
                let gained = passiveValues[upg.id] * BigInt(upg.level);
                state.basePassiveGain += BigInt(Math.floor(Number(gained) * masteryMult));
            }
        }
    });
}

// --- SYSTEM LOSOWYCH WYDARZEŃ (EVENT.PNG) ---
let nextEventTimeout = null;
let fallingInterval = null;

function planNextRandomEvent() {
    let randomSeconds = Math.floor(Math.random() * (360 - 240 + 1)) + 240;
    if (nextEventTimeout) clearTimeout(nextEventTimeout);
    nextEventTimeout = setTimeout(spawnEventBox, randomSeconds * 1000);
}

function spawnEventBox() {
    const box = document.getElementById('random-event-box');
    if (!box) return;

    let posX = Math.floor(Math.random() * (window.innerWidth - 100)) + 20;
    let posY = Math.floor(Math.random() * (window.innerHeight - 100)) + 20;

    box.style.left = `${posX}px`;
    box.style.top = `${posY}px`;
    box.style.display = 'block';

    box.onclick = () => {
        box.style.display = 'none';
        triggerRandomEventEffect();
        planNextRandomEvent(); 
    };
}

function triggerRandomEventEffect() {
    let roll = Math.floor(Math.random() * 5) + 1;

    if (roll === 1) {
        state.eventResourceChanceTime = 60; 
        showNotification("Wydarzenie: 5x większa szansa na Resource Points przez 1 min!");
    } else if (roll === 2) {
        state.eventPassiveMultTime = 30; 
        showNotification("Wydarzenie: Szał Produkcji! 5x więcej CP/s przez 30 sek!");
    } else if (roll === 3) {
        state.eventClickMultTime = 30; 
        showNotification("Wydarzenie: Hiper-Klik! 5x silniejsze kliknięcia przez 30 sek!");
    } else if (roll === 4) {
        state.eventDiscountTime = 120; 
        showNotification("Wydarzenie: Wyprzedaż! Ulepszenia tańsze o 10% przez 2 min!");
        renderUpgrades(); 
    } else if (roll === 5) {
        state.eventFallingActiveTime = 60; 
        showNotification("Wydarzenie: Deszcz Zasobów! Klikaj spadające punkty przez 1 min!");
        startFallingResources();
    }
    updateUI();
}

function startFallingResources() {
    if (fallingInterval) clearInterval(fallingInterval);
    fallingInterval = setInterval(() => {
        if (state.eventFallingActiveTime <= 0) {
            clearInterval(fallingInterval);
            return;
        }
        createFallingResourceElement();
    }, 1000);
}

function createFallingResourceElement() {
    const container = document.getElementById('falling-resources-container');
    if (!container) return;

    const img = document.createElement('img');
    img.src = 'graphic/resources_point.png';
    img.style.cssText = `
        position: absolute;
        width: 36px;
        height: 36px;
        cursor: pointer;
        pointer-events: auto;
        left: ${Math.floor(Math.random() * (window.innerWidth - 50))}px;
        top: ${Math.floor(Math.random() * (window.innerHeight - 50))}px;
        transition: opacity 0.5s;
        z-index: 9999;
    `;

    img.onclick = (e) => {
        e.stopPropagation();
        let gain = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
        state.resourcePoint += gain;
        showNotification(`+${gain} Resource Points!`);
        updateUI();
        img.remove();
    };

    container.appendChild(img);

    setTimeout(() => {
        if (img.parentNode) {
            img.style.opacity = '0';
            setTimeout(() => img.remove(), 500);
        }
    }, 6000);
}

// --- SYSTEM ZAPISU (LOCAL STORAGE) ---
function saveGame() {
    const dataToSave = {
        state: {
            // Zapisujemy BigInt jako stringi, bo JSON nie obsługuje BigIntów
            clickPoint: state.clickPoint.toString(),
            baseClickPower: state.baseClickPower.toString(),
            basePassiveGain: state.basePassiveGain.toString(),
            
            // Zwykłe liczby i tablice zapisujemy normalnie
            resourcePoint: state.resourcePoint,
            researchPoint: state.researchPoint,
            coinPoint: state.coinPoint,
            techProgress: state.techProgress,
            techLevel: state.techLevel,
            workers: state.workers,
            rebirthCount: state.rebirthCount,
            globalCostMultiplier: state.globalCostMultiplier,
            wheelCooldownSeconds: state.wheelCooldownSeconds,
            dailyStreak: state.dailyStreak,
            lastDailyClaimTime: state.lastDailyClaimTime,
            dailyRewardAvailable: state.dailyRewardAvailable
        },
        inventory: inventory,
        masteryLevels: masteryLevels,
        // Zapisujemy poziomy ulepszeń przycisków
        buttonUpgrades: buttonUpgrades.map(bu => ({ id: bu.id, level: bu.level })),
        // Zapisujemy poziomy zwykłych ulepszeń
        upgrades: upgrades.map(u => ({ id: u.id, level: u.level }))
    };

    localStorage.setItem('civilizationClickerSave', JSON.stringify(dataToSave));
    console.log("Gra została automatycznie zapisana!");
}

function loadGame() {
    const savedData = localStorage.getItem('civilizationClickerSave');
    if (!savedData) return; // Brak zapisu, gracz zaczyna od nowa

    try {
        const parsed = JSON.parse(savedData);

        // Odtwarzanie podstawowego stanu konta
        if (parsed.state) {
            if (parsed.state.clickPoint !== undefined) state.clickPoint = BigInt(parsed.state.clickPoint);
            if (parsed.state.baseClickPower !== undefined) state.baseClickPower = BigInt(parsed.state.baseClickPower);
            if (parsed.state.basePassiveGain !== undefined) state.basePassiveGain = BigInt(parsed.state.basePassiveGain);
            
            if (parsed.state.resourcePoint !== undefined) state.resourcePoint = parsed.state.resourcePoint;
            if (parsed.state.researchPoint !== undefined) state.researchPoint = parsed.state.researchPoint;
            if (parsed.state.coinPoint !== undefined) state.coinPoint = parsed.state.coinPoint;
            if (parsed.state.techProgress !== undefined) state.techProgress = parsed.state.techProgress;
            if (parsed.state.techLevel !== undefined) state.techLevel = parsed.state.techLevel;
            if (parsed.state.workers !== undefined) state.workers = parsed.state.workers;
            if (parsed.state.rebirthCount !== undefined) state.rebirthCount = parsed.state.rebirthCount;
            if (parsed.state.globalCostMultiplier !== undefined) state.globalCostMultiplier = parsed.state.globalCostMultiplier;
            if (parsed.state.wheelCooldownSeconds !== undefined) state.wheelCooldownSeconds = parsed.state.wheelCooldownSeconds;
            
            // Odtwarzanie Twoich nowych serii codziennych nagród
            if (parsed.state.dailyStreak !== undefined) state.dailyStreak = parsed.state.dailyStreak;
            if (parsed.state.lastDailyClaimTime !== undefined) state.lastDailyClaimTime = parsed.state.lastDailyClaimTime;
            if (parsed.state.dailyRewardAvailable !== undefined) state.dailyRewardAvailable = parsed.state.dailyRewardAvailable;
        }

        // Odtwarzanie ekwipunku
        if (parsed.inventory) {
            Object.keys(inventory).forEach(key => delete inventory[key]);
            Object.assign(inventory, parsed.inventory);
        }

        // Odtwarzanie poziomów mistrzostwa
        if (parsed.masteryLevels) {
            Object.keys(masteryLevels).forEach(key => delete masteryLevels[key]);
            Object.assign(masteryLevels, parsed.masteryLevels);
        }

        // Odtwarzanie ulepszeń przycisków
        if (parsed.buttonUpgrades) {
            parsed.buttonUpgrades.forEach(savedBu => {
                let bu = buttonUpgrades.find(b => b.id === savedBu.id);
                if (bu) bu.level = savedBu.level;
            });
        }

        // Odtwarzanie standardowych ulepszeń
        if (parsed.upgrades) {
            parsed.upgrades.forEach(savedU => {
                let u = upgrades.find(upg => upg.id === savedU.id);
                if (u) u.level = savedU.level;
            });
        }

        console.log("Zapis został wczytany pomyślnie!");
    } catch (e) {
        console.error("Błąd podczas wczytywania zapisu:", e);
    }
}

planNextRandomEvent();
