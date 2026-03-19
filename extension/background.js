// Инъекция API для Web App
function injectVPNAPI() {
  const api = {
    isExtensionInstalled: () => true,
    
    getStatus: () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    },
    
    parseConfig: (configString) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'PARSE_CONFIG', configString: configString },
          (response) => {
            if (response?.success) {
              resolve(response.config);
            } else {
              reject(new Error(response?.error || 'Parse failed'));
            }
          }
        );
      });
    },
    
    setupProxy: (config) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'SETUP_PROXY', config: config },
          (response) => {
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Setup failed'));
            }
          }
        );
      });
    },
    
    enableProxy: () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'ENABLE_PROXY' }, (response) => {
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Enable failed'));
          }
        });
      });
    },
    
    disableProxy: () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'DISABLE_PROXY' }, (response) => {
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Disable failed'));
          }
        });
      });
    }
  };

  window.VPNExtension = api;
  console.log('🔐 VPN Extension API injected');
}

// Слушаем сообщения от Web App
window.addEventListener('message', async (event) => {
  // Проверяем источник
  if (!event.origin.includes('t.me') && !event.origin.includes('github.io')) {
    return;
  }

  const { action, payload } = event.data || {};
  if (!action) return;

  console.log('📨 From WebApp:', action);

  try {
    let response;
    
    switch (action) {
      case 'GET_STATUS':
        response = await window.VPNExtension.getStatus();
        break;
      case 'PARSE_CONFIG':
        response = await window.VPNExtension.parseConfig(payload.configString);
        break;
      case 'SETUP_PROXY':
        response = await window.VPNExtension.setupProxy(payload.config);
        break;
      case 'ENABLE_PROXY':
        response = await window.VPNExtension.enableProxy();
        break;
      case 'DISABLE_PROXY':
        response = await window.VPNExtension.disableProxy();
        break;
      default:
        console.warn('Unknown action:', action);
        return;
    }

    // Отправляем ответ
    window.postMessage({
      action: `${action}_RESPONSE`,
      payload: { success: true, ...response },
      timestamp: Date.now()
    }, event.origin);

  } catch (error) {
    window.postMessage({
      action: `${action}_RESPONSE`,
      payload: { success: false, error: error.message },
      timestamp: Date.now()
    }, event.origin);
  }
});

// Запускаем инъекцию
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectVPNAPI);
} else {
  injectVPNAPI();
}
