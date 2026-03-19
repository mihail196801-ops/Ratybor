document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusText = document.getElementById('statusText');
  const configInfo = document.getElementById('configInfo');
  const openWebAppBtn = document.getElementById('openWebAppBtn');
  const clearBtn = document.getElementById('clearBtn');

  async function updateUI() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
      
      if (response?.connected) {
        toggleBtn.classList.add('active');
        toggleBtn.textContent = '🔐';
        statusText.textContent = 'Подключено';
        statusText.style.color = '#00d084';
        configInfo.textContent = response.config?.name || response.config?.host || 'Активный сервер';
      } else {
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = '🔌';
        statusText.textContent = 'Отключено';
        statusText.style.color = '#eee';
        configInfo.textContent = 'Нет активного конфига';
      }
    } catch (e) {
      console.error('Error:', e);
    }
  }

  toggleBtn.addEventListener('click', async () => {
    try {
      const { connected } = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
      
      if (connected) {
        await chrome.runtime.sendMessage({ action: 'DISABLE_PROXY' });
      } else {
        const { proxyConfig } = await chrome.storage.local.get('proxyConfig');
        if (!proxyConfig) {
          alert('📋 Сначала добавьте конфиг через Telegram Web App');
          return;
        }
        await chrome.runtime.sendMessage({ action: 'SETUP_PROXY', config: proxyConfig });
        await chrome.runtime.sendMessage({ action: 'ENABLE_PROXY' });
      }
      
      updateUI();
    } catch (e) {
      alert('❌ Ошибка: ' + e.message);
    }
  });

  openWebAppBtn.addEventListener('click', () => {
    chrome.tabs.create({ 
      url: 'https://mihail196801-ops.github.io/Ratybor/webapp/'
    });
  });

  clearBtn.addEventListener('click', async () => {
    if (confirm('Удалить все сохранённые конфиги?')) {
      await chrome.storage.local.remove(['proxyConfig', 'configs']);
      await chrome.runtime.sendMessage({ action: 'DISABLE_PROXY' });
      updateUI();
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'STATUS_CHANGED') {
      updateUI();
    }
  });

  updateUI();
});
