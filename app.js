/**
 * HDR Astrofotografia Calculator
 * Gestione dinamica delle sessioni e calcolo dei pesi
 */

// =========================
// Variabili globali
// =========================
let sessionCount = 3;
let sessions = [];

// =========================
// Inizializzazione
// =========================
function initializeSessions() {
    sessions = [
        { exposure: 30, shots: 60 },
        { exposure: 60, shots: 90 },
        { exposure: 90, shots: 153 }
    ];
    updateSessionsDisplay();
    calculateWeights();
    setupEventListeners();
    initializePWA();
}

// =========================
// Gestione sessioni
// =========================
function changeSessionCount(delta) {
    const newCount = sessionCount + delta;
    if (newCount >= 2 && newCount <= 10) {
        sessionCount = newCount;
        
        if (delta > 0) {
            // Aggiungi nuove sessioni
            for (let i = sessions.length; i < sessionCount; i++) {
                const lastSession = sessions[sessions.length - 1] || { exposure: 30, shots: 60 };
                sessions.push({
                    exposure: lastSession.exposure + 30,
                    shots: 60
                });
            }
        } else {
            // Rimuovi sessioni
            sessions = sessions.slice(0, sessionCount);
        }
        
        updateSessionsDisplay();
        calculateWeights();
        updateButtons();
    }
}

function addSession() {
    if (sessionCount < 10) {
        const lastSession = sessions[sessions.length - 1] || { exposure: 30, shots: 60 };
        sessions.push({
            exposure: lastSession.exposure + 30,
            shots: 60
        });
        sessionCount = sessions.length;
        updateSessionsDisplay();
        calculateWeights();
        updateButtons();
    }
}

function removeSession(index) {
    if (sessions.length > 2) {
        sessions.splice(index, 1);
        sessionCount = sessions.length;
        updateSessionsDisplay();
        calculateWeights();
        updateButtons();
    }
}

function updateButtons() {
    document.getElementById('decreaseBtn').disabled = sessionCount <= 2;
    document.getElementById('increaseBtn').disabled = sessionCount >= 10;
    document.getElementById('sessionCount').textContent = sessionCount;
    document.getElementById('totalSessions').textContent = sessionCount;
}

// =========================
// Aggiornamento display
// =========================
function updateSessionsDisplay() {
    const container = document.getElementById('sessionsContainer');
    container.innerHTML = '';
    
    sessions.forEach((session, index) => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-input';
        sessionDiv.innerHTML = `
            <div class="session-header">
                <h3>Sessione ${index + 1}</h3>
                ${sessions.length > 2 ? `<button class="delete-session" onclick="removeSession(${index})">×</button>` : ''}
            </div>
            <div class="input-group">
                <div class="input-field">
                    <label>Tempo esposizione (secondi)</label>
                    <input type="number" value="${session.exposure}" min="1" onchange="updateSession(${index}, 'exposure', this.value)">
                </div>
                <div class="input-field">
                    <label>Numero di scatti</label>
                    <input type="number" value="${session.shots}" min="1" onchange="updateSession(${index}, 'shots', this.value)">
                </div>
            </div>
            <div class="integration-time" id="int${index}">Integrazione: ${((session.exposure * session.shots) / 60).toFixed(1)} minuti</div>
        `;
        container.appendChild(sessionDiv);
    });
}

function updateSession(index, field, value) {
    sessions[index][field] = parseFloat(value) || 0;
    const integration = (sessions[index].exposure * sessions[index].shots) / 60;
    document.getElementById(`int${index}`).textContent = `Integrazione: ${integration.toFixed(1)} minuti`;
    calculateWeights();
}

// =========================
// Preset configurazioni
// =========================
function loadPreset(preset) {
    switch(preset) {
        case 'basic':
            sessions = [
                { exposure: 30, shots: 60 },
                { exposure: 90, shots: 100 }
            ];
            sessionCount = 2;
            break;
        case 'standard':
            sessions = [
                { exposure: 30, shots: 60 },
                { exposure: 60, shots: 90 },
                { exposure: 90, shots: 153 }
            ];
            sessionCount = 3;
            break;
        case 'advanced':
            sessions = [
                { exposure: 15, shots: 40 },
                { exposure: 30, shots: 60 },
                { exposure: 60, shots: 80 },
                { exposure: 120, shots: 100 },
                { exposure: 180, shots: 80 }
            ];
            sessionCount = 5;
            break;
    }
    updateSessionsDisplay();
    calculateWeights();
    updateButtons();
}

// =========================
// Calcolo pesi e formule
// =========================
function calculateWeights() {
    if (sessions.length === 0) return;
    
    // Calcola integrazioni
    const integrations = sessions.map(s => (s.exposure * s.shots) / 60);
    const totalIntegration = integrations.reduce((sum, int) => sum + int, 0);
    const totalFrames = sessions.reduce((sum, s) => sum + s.shots, 0);
    
    // Aggiorna statistiche
    document.getElementById('totalTime').textContent = totalIntegration.toFixed(1);
    document.getElementById('totalFrames').textContent = totalFrames;
    
    // Calcola pesi secondo strategia
    const strategy = document.querySelector('input[name="strategy"]:checked').value;
    let weights = calculateWeightsByStrategy(integrations, totalIntegration, strategy);
    
    // Normalizza i pesi
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    weights = weights.map(w => w / weightSum);
    
    // Aggiorna interfaccia
    updateFormulas(weights);
    updateVisualization(weights, integrations);
    updateBreakdown(weights, integrations);
}

function calculateWeightsByStrategy(integrations, totalIntegration, strategy) {
    let weights = [];
    
    switch(strategy) {
        case 'proportional':
            weights = integrations.map(int => Math.max(0.05, int / totalIntegration));
            break;
        case 'conservative':
            weights = integrations.map(() => 1 / sessions.length);
            break;
        case 'aggressive':
            const maxInt = Math.max(...integrations);
            weights = integrations.map(int => 
                int === maxInt ? 0.7 : 0.3 / (sessions.length - 1)
            );
            break;
        case 'balanced':
            const avgWeight = 1 / sessions.length;
            weights = integrations.map(int => 
                avgWeight + (int / totalIntegration - avgWeight) * 0.5
            );
            break;
        default:
            weights = integrations.map(int => int / totalIntegration);
    }
    
    return weights;
}

// =========================
// Aggiornamento formule
// =========================
function updateFormulas(weights) {
    const formula = weights.map((w, i) => `I${i+1} * ${w.toFixed(3)}`).join(' + ');
    document.getElementById('formulaText').textContent = formula;
    
    // Formula alternativa 1 (più peso all'ultima sessione)
    const alt1Weights = weights.map((w, i) => 
        i === weights.length - 1 ? w * 1.2 : w * 0.8
    );
    const alt1Sum = alt1Weights.reduce((sum, w) => sum + w, 0);
    const alt1Normalized = alt1Weights.map(w => w / alt1Sum);
    const alt1Formula = alt1Normalized.map((w, i) => `I${i+1} * ${w.toFixed(3)}`).join(' + ');
    document.getElementById('altFormula1Text').textContent = alt1Formula;
    
    // Formula alternativa 2 (più bilanciata)
    const alt2Weights = weights.map(w => w * 0.9 + 0.1 / weights.length);
    const alt2Formula = alt2Weights.map((w, i) => `I${i+1} * ${w.toFixed(3)}`).join(' + ');
    document.getElementById('altFormula2Text').textContent = alt2Formula;
}

// =========================
// Visualizzazione pesi
// =========================
function updateVisualization(weights, integrations) {
    const weightViz = document.getElementById('weightViz');
    const colors = [
        '#f44336', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', 
        '#607d8b', '#795548', '#e91e63', '#3f51b5', '#009688'
    ];
    
    weightViz.innerHTML = weights.map((weight, index) => {
        const percentage = (weight * 100).toFixed(0);
        return `<div class="weight-bar" style="background: ${colors[index % colors.length]}; flex: ${weight};">
            S${index + 1}: ${percentage}%
        </div>`;
    }).join('');
}

function updateBreakdown(weights, integrations) {
    const breakdown = document.getElementById('sessionBreakdown');
    breakdown.innerHTML = `
        <h4>Dettaglio per sessione:</h4>
        ${sessions.map((session, index) => `
            <div style="margin: 8px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px;">
                <strong>Sessione ${index + 1}:</strong> ${session.exposure}s × ${session.shots} = ${integrations[index].toFixed(1)}min 
                → Peso: ${(weights[index] * 100).toFixed(1)}%
            </div>
        `).join('')}
    `;
}

// =========================
// Funzioni di utilità
// =========================
function copyFormula(type = 'main') {
    let text;
    switch(type) {
        case 'main':
            text = document.getElementById('formulaText').textContent;
            break;
        case 'alt1':
            text = document.getElementById('altFormula1Text').textContent;
            break;
        case 'alt2':
            text = document.getElementById('altFormula2Text').textContent;
            break;
    }
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback(event.target);
        }).catch(() => {
            fallbackCopyTextToClipboard(text, event.target);
        });
    } else {
        fallbackCopyTextToClipboard(text, event.target);
    }
}

function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(button);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopyFeedback(button) {
    const originalText = button.textContent;
    button.textContent = '✓';
    button.style.background = '#4CAF50';
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
    }, 1000);
}

function showTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName + '-steps').classList.add('active');
    event.target.classList.add('active');
}

// =========================
// Event Listeners
// =========================
function setupEventListeners() {
    document.querySelectorAll('input[name="strategy"]').forEach(radio => {
        radio.addEventListener('change', calculateWeights);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '=':
                case '+':
                    e.preventDefault();
                    changeSessionCount(1);
                    break;
                case '-':
                    e.preventDefault();
                    changeSessionCount(-1);
                    break;
                case '1':
                    e.preventDefault();
                    loadPreset('basic');
                    break;
                case '2':
                    e.preventDefault();
                    loadPreset('standard');
                    break;
                case '3':
                    e.preventDefault();
                    loadPreset('advanced');
                    break;
            }
        }
    });
}

// =========================
// PWA Functionality
// =========================
function initializePWA() {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
    
    // Install prompt
    setupInstallPrompt();
}

function registerServiceWorker() {
    const swCode = `
        const CACHE_NAME = 'astro-hdr-v2.1';
        const urlsToCache = [
            '/',
            '/index.html',
            '/styles.css',
            '/app.js',
            '/manifest.json'
        ];
        
        self.addEventListener('install', (event) => {
            event.waitUntil(
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        console.log('Opened cache');
                        return cache.addAll(urlsToCache);
                    })
            );
        });
        
        self.addEventListener('fetch', (event) => {
            event.respondWith(
                caches.match(event.request)
                    .then((response) => {
                        // Cache hit - return response
                        if (response) {
                            return response;
                        }
                        return fetch(event.request);
                    }
                )
            );
        });
        
        self.addEventListener('activate', (event) => {
            event.waitUntil(
                caches.keys().then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            if (cacheName !== CACHE_NAME) {
                                return caches.delete(cacheName);
                            }
                        })
                    );
                })
            );
        });
    `;
    
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    navigator.serviceWorker.register(swUrl)
        .then((registration) => {
            console.log('Service Worker registrato con successo:', registration.scope);
        })
        .catch((error) => {
            console.log('Registrazione Service Worker fallita:', error);
        });
}

function setupInstallPrompt() {
    let deferredPrompt;
    const installButton = document.createElement('button');
    installButton.textContent = '📱 Installa App';
    installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(45deg, #4CAF50, #2196F3);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 25px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        display: none;
        transition: transform 0.3s ease;
    `;
    
    installButton.addEventListener('mouseover', () => {
        installButton.style.transform = 'scale(1.05)';
    });
    
    installButton.addEventListener('mouseout', () => {
        installButton.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(installButton);
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });
    
    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
            installButton.style.display = 'none';
        }
    });
    
    window.addEventListener('appinstalled', () => {
        installButton.style.display = 'none';
        console.log('PWA was installed');
    });
}

// =========================
// Inizializzazione al caricamento
// =========================
document.addEventListener('DOMContentLoaded', function() {
    initializeSessions();
    console.log('HDR Astrofotografia Calculator inizializzato');
});

// =========================
// Debug utilities (solo in development)
// =========================
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugApp = {
        getSessions: () => sessions,
        getSessionCount: () => sessionCount,
        addTestSessions: () => {
            sessions.push(
                { exposure: 240, shots: 50 },
                { exposure: 300, shots: 40 }
            );
            sessionCount = sessions.length;
            updateSessionsDisplay();
            calculateWeights();
            updateButtons();
        },
        resetToDefault: () => {
            initializeSessions();
        }
    };
    console.log('Debug utilities available: window.debugApp');
}