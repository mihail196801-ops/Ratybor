const vpnButton = document.getElementById('vpnButton');
const buttonText = document.getElementById('buttonText');
const status = document.getElementById('status');

let isEnabled = false;

// Проверяем статус при открытии
chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response?.enabled) {
        setEnabledState(true);
    }
});

vpnButton.addEventListener('click', async () => {
    if (isEnabled) {
        await disableVPN();
    } else {
        await enableVPN();
    }
});

async function enableVPN() {
    vpnButton.innerHTML = '<span>⏳</span>';
    buttonText.textContent = 'Подключение...';
    
    try {
        await chrome.runtime.sendMessage({ action: 'ENABLE_VPN' });
        setEnabledState(true);
    } catch (e) {
        alert('Ошибка: ' + e.message);
        vpnButton.innerHTML = '<span>🔌</span>';
        buttonText.textContent = 'Попробовать снова';
    }
}

async function disableVPN() {
    vpnButton.innerHTML = '<span>⏳</span>';
    buttonText.textContent = 'Отключение...';
    
    try {
        await chrome.runtime.sendMessage({ action: 'DISABLE_VPN' });
        setEnabledState(false);
    } catch (e) {
        alert('Ошибка: ' + e.message);
    }
}

function setEnabledState(enabled) {
    isEnabled = enabled;
    
    if (enabled) {
        vpnButton.classList.add('active');
        vpnButton.innerHTML = '<span>🔐</span>';
        buttonText.textContent = 'Подключено';
        status.textContent = '✅ YouTube работает';
        status.style.color = '#00d084';
    } else {
        vpnButton.classList.remove('active');
        vpnButton.innerHTML = '<span>🔌</span>';
        buttonText.textContent = 'Нажмите для подключения';
        status.textContent = 'Отключено';
        status.style.color = '#fff';
    }
}
