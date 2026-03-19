// Встроенные VPN конфиги
const VPN_CONFIGS = [
    {
        id: 1,
        country: 'Нидерланды',
        location: 'Амстердам',
        flag: '🇳🇱',
        ping: 45,
        config: 'vless://2563b829-866c-4c0f-8270-a91cffbfe852@alb03.tcpdoor.net:443?type=xhttp&security=tls#NL'
    },
    {
        id: 2,
        country: 'Финляндия',
        location: 'Хельсинки',
        flag: '🇫🇮',
        ping: 62,
        config: 'vless://9bc2b4de-8dc1-41e8-91d6-37e2687d9eff@138.124.100.120:443#FI'
    },
    {
        id: 3,
        country: 'Германия',
        location: 'Франкфурт',
        flag: '🇩🇪',
        ping: 38,
        config: 'vless://0576588a-41df-476f-8060-d09043b4f2bc@de-fra-6.blook.network:443#DE'
    }
];

let isConnected = false;
let isActivated = false;
let selectedServer = VPN_CONFIGS[0];
let speedInterval = null;

// DOM Elements
const keyModal = document.getElementById('keyModal');
const accessKeyInput = document.getElementById('accessKey');
const activateBtn = document.getElementById('activateBtn');
const keyMessage = document.getElementById('keyMessage');
const connectContainer = document.getElementById('connectContainer');
const connectBtn = document.getElementById('connectBtn');
const connectStatus = document.getElementById('connectStatus');
const connectInfo = document.getElementById('connectInfo');
const statusText = document.getElementById('statusText');
const serversSection = document.getElementById('serversSection');
const serversList = document.getElementById('serversList');
const stats = document.getElementById('stats');

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await checkActivation();
    renderServers();
    
    if (isActivated) {
        showMainInterface();
    } else {
        keyModal.classList.add('show');
    }
});

// Проверка активации
async function checkActivation() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'CHECK_VALIDATION' });
        if (response?.validated) {
            isActivated = true;
        }
    } catch (e) {
        console.log('Not activated yet');
    }
}

// Показ основного интерфейса
function showMainInterface() {
    keyModal.style.display = 'none';
    connectContainer.style.display = 'block';
    serversSection.style.display = 'block';
    
    // Загружаем сохранённый ключ
    chrome.storage.local.get(['accessKey'], (result) => {
        if (result.accessKey) {
            connectInfo.textContent = `Ключ: ${result.accessKey}`;
        }
    });
}

// Активация ключа
activateBtn.addEventListener('click', async () => {
    const key = accessKeyInput.value.trim().toUpperCase();
    
    if (key.length !== 8) {
        showMessage('❌ Ключ должен содержать 8 символов', 'error');
        return;
    }
    
    activateBtn.disabled = true;
    activateBtn.innerHTML = '<div class="spinner show"></div>';
    
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'VALIDATE_KEY',
            key: key
        });
        
        if (response?.success) {
            isActivated = true;
            showMessage('✅ Ключ активирован!', 'success');
            setTimeout(() => {
                showMainInterface();
            }, 1000);
        } else {
            showMessage('❌ ' + (response?.error || 'Неверный ключ'), 'error');
            activateBtn.disabled = false;
            activateBtn.textContent = 'Активировать';
        }
    } catch (e) {
        showMessage('❌ Ошибка подключения', 'error');
        activateBtn.disabled = false;
        activateBtn.textContent = 'Активировать';
    }
});

// Ввод ключа
accessKeyInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// Подключение/отключение
connectBtn.addEventListener('click', async () => {
    if (isConnected) {
        await disconnect();
    } else {
        await connect();
    }
});

// Подключение
async function connect() {
    connectBtn.classList.add('connecting');
    connectBtn.textContent = '⏳';
    connectStatus.textContent = 'Подключение...';
    
    try {
        // Парсим конфиг
        const parsed = await chrome.runtime.sendMessage({
            action: 'PARSE_CONFIG',
            configString: selectedServer.config
        });
        
        // Настраиваем прокси
        await chrome.runtime.sendMessage({
            action: 'SETUP_PROXY',
            config: parsed
        });
        
        // Включаем
        await chrome.runtime.sendMessage({ action: 'ENABLE_PROXY' });
        
        isConnected = true;
        connectBtn.classList.remove('connecting');
        connectBtn.classList.add('active');
        connectBtn.textContent = '🔐';
        connectStatus.textContent = 'Подключено';
        statusText.textContent = 'Подключено';
        stats.classList.add('show');
        
        startSpeedSimulation();
        
    } catch (e) {
        connectBtn.classList.remove('connecting');
        connectBtn.textContent = '🔌';
        connectStatus.textContent = 'Ошибка подключения';
        setTimeout(() => {
            connectStatus.textContent = 'Нажмите для подключения';
        }, 2000);
    }
}

// Отключение
async function disconnect() {
    try {
        await chrome.runtime.sendMessage({ action: 'DISABLE_PROXY' });
        
        isConnected = false;
        connectBtn.classList.remove('active');
        connectBtn.textContent = '🔌';
        connectStatus.textContent = 'Отключено';
        statusText.textContent = 'Отключено';
        stats.classList.remove('show');
        
        stopSpeedSimulation();
        
    } catch (e) {
        console.error('Disconnect error:', e);
    }
}

// Рендер серверов
function renderServers() {
    serversList.innerHTML = VPN_CONFIGS.map(server => `
        <div class="server-item ${selectedServer.id === server.id ? 'selected' : ''}" 
             onclick="selectServer(${server.id})">
            <div class="server-info">
                <span class="server-flag">${server.flag}</span>
                <div>
                    <div class="server-name">${server.country}</div>
                    <div class="server-ping">⚡ ${server.ping}ms</div>
                </div>
            </div>
            <div class="server-indicator"></div>
        </div>
    `).join('');
}

// Выбор сервера
window.selectServer = async (id) => {
    selectedServer = VPN_CONFIGS.find(s => s.id === id);
    renderServers();
    
    // Если подключено - переподключаем
    if (isConnected) {
        await disconnect();
        await connect();
    }
    
    connectInfo.textContent = `${selectedServer.flag} ${selectedServer.country}`;
};

// Симуляция скорости
function startSpeedSimulation() {
    speedInterval = setInterval(() => {
        document.getElementById('downloadSpeed').textContent = 
            (Math.random() * 50 + 10).toFixed(1);
        document.getElementById('uploadSpeed').textContent = 
            (Math.random() * 20 + 5).toFixed(1);
    }, 2000);
}

function stopSpeedSimulation() {
    clearInterval(speedInterval);
    document.getElementById('downloadSpeed').textContent = '0';
    document.getElementById('uploadSpeed').textContent = '0';
}

// Показ сообщений
function showMessage(text, type) {
    keyMessage.textContent = text;
    keyMessage.className = `message show ${type}`;
    setTimeout(() => {
        keyMessage.classList.remove('show');
    }, 3000);
}
