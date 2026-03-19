document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusText = document.getElementById('statusText');
  const configInfo = document.getElementById('configInfo');
  const openWebAppBtn = document.getElementById('openWebAppBtn');
  const clearBtn = document.getElementById('clearBtn');

  // === Загрузка статуса при открытии ===
  async function updateUI() {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    
    if (response?.connected) {
      toggleBtn.classList.add('active');
      toggleBtn.textContent = '🔐';
      statusText.textContent = 'Подключено';
      statusText.style.color = '#00d084';
      configInfo.textContent = response.config?.country || 'Активный сервер';
    } else {
      toggleBtn.classList.remove('active');
      toggleBtn.textContent = '🔌';
      statusText.textContent = 'Отключено';
      statusText.style.color = '#eee';
      configInfo.textContent = 'Нет активного конфига';
    }
  }

  // === Переключение VPN ===
  toggleBtn.addEventListener('click', async () => {
    const { connected } = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    
    if (connected) {
      await chrome.runtime.sendMessage({ action: 'DISABLE_PROXY' });
    } else {
      // Проверяем наличие конфига
      const { proxyConfig } = await chrome.storage.local.get('proxyConfig');
      if (!proxyConfig) {
        alert('📋 Сначала добавьте конфиг через Telegram Web App');
        return;
      }
      await chrome.runtime.sendMessage({ 
        action: 'SETUP_PROXY', 
        config: proxyConfig 
      });
      await chrome.runtime.sendMessage({ action: 'ENABLE_PROXY' });
    }
    
    updateUI();
  });

  // === Открыть Web App ===
  openWebAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ 
      url: 'https://ваш-юзернейм.github.io/ваш-репо' 
    });
  });

  // === Очистка конфигов ===
  clearBtn.addEventListener('click', async () => {
    if (confirm('Удалить все сохранённые конфиги?')) {
      await chrome.storage.local.remove(['proxyConfig', 'configs']);
      await chrome.runtime.sendMessage({ action: 'DISABLE_PROXY' });
      updateUI();
    }
  });

  // === Слушаем изменения от background ===
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'STATUS_CHANGED') {
      updateUI();
    }
  });

  // Initial load
  updateUI();
});
