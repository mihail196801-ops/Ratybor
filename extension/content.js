// === Связь между Web App и Background Script ===

// Слушаем сообщения от Web App (через Telegram WebApp)
window.addEventListener('message', (event) => {
  // Проверяем источник для безопасности
  if (!event.origin.includes('t.me') && !event.origin.includes('github.io')) {
    return;
  }

  const { action, payload } = event.data || {};
  
  if (!action) return;

  // Пересылаем в background script
  chrome.runtime.sendMessage({ action, ...payload }, (response) => {
    // Отправляем ответ обратно в Web App
    window.postMessage({ 
      action: `${action}_RESPONSE`, 
      payload: response,
      timestamp: Date.now()
    }, event.origin);
  });
});

// === Инъекция API для Web App ===
function injectVPNAPI() {
  const api = {
    // Проверка наличия расширения
    isExtensionInstalled: () => true,
    
    // Отправка конфига
    sendConfig: (configString) => {
      return new Promise((resolve, reject) => {
        window.postMessage({
          action: 'PARSE_CONFIG',
          payload: { configString }
        }, '*');
        
        const handler = (event) => {
          if (event.data?.action === 'PARSE_CONFIG_RESPONSE') {
            window.removeEventListener('message', handler);
            if (event.data.payload?.success) {
              resolve(event.data.payload.config);
            } else {
              reject(new Error(event.data.payload?.error || 'Parse failed'));
            }
          }
        };
        window.addEventListener('message', handler);
      });
    },
    
    // Управление подключением
    connect: (config) => {
      return new Promise((resolve, reject) => {
        window.postMessage({
          action: 'SETUP_PROXY',
          payload: { config }
        }, '*');
        
        setTimeout(() => {
          window.postMessage({ action: 'ENABLE_PROXY' }, '*');
          resolve({ status: 'connecting' });
        }, 500);
      });
    },
    
    disconnect: () => {
      return new Promise((resolve) => {
        window.postMessage({ action: 'DISABLE_PROXY' }, '*');
        resolve({ status: 'disconnected' });
      });
    },
    
    // Получение статуса
    getStatus: () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
          resolve(response);
        });
      });
    }
  };

  // Делаем API глобально доступным
  window.VPNExtension = api;
  console.log('🔐 VPN Extension API injected');
}

// Запускаем инъекцию после загрузки страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectVPNAPI);
} else {
  injectVPNAPI();
}
