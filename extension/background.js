// === Глобальное состояние ===
let proxyConfig = null;
let isConnected = false;
let activeTabId = null;

// === Обработка сообщений от Web App / Content Script ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request);

  switch (request.action) {
    case 'SETUP_PROXY':
      setupProxy(request.config).then(() => {
        sendResponse({ success: true, message: 'Прокси настроен' });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // async response

    case 'ENABLE_PROXY':
      enableProxy().then(() => {
        sendResponse({ success: true, status: 'connected' });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'DISABLE_PROXY':
      disableProxy().then(() => {
        sendResponse({ success: true, status: 'disconnected' });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'GET_STATUS':
      sendResponse({ 
        connected: isConnected, 
        config: proxyConfig ? { country: proxyConfig.country } : null 
      });
      return true;

    case 'PARSE_CONFIG':
      try {
        const parsed = parseVlessConfig(request.configString);
        sendResponse({ success: true, config: parsed });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// === Парсинг VLESS конфига ===
function parseVlessConfig(configString) {
  if (!configString.startsWith('vless://')) {
    throw new Error('Неподдерживаемый протокол');
  }

  const url = new URL(configString.replace('vless://', 'vless://'));
  const uuid = url.username;
  const [host, port] = url.host.split(':');
  const params = new URLSearchParams(url.search);

  return {
    protocol: 'vless',
    uuid,
    host,
    port: parseInt(port),
    security: params.get('security') || 'none',
    type: params.get('type') || 'tcp',
    sni: params.get('sni') || host,
    path: params.get('path') || '/',
    flow: params.get('flow'),
    pbk: params.get('pbk'),
    sid: params.get('sid'),
    fp: params.get('fp') || 'chrome',
    alpn: params.get('alpn'),
    country: decodeURIComponent(url.hash.replace('#', '')) || 'Unknown'
  };
}

// === Настройка прокси ===
async function setupProxy(config) {
  proxyConfig = config;
  
  // Сохраняем в storage для восстановления после перезагрузки
  await chrome.storage.local.set({ 
    proxyConfig: config,
    lastUpdated: Date.now()
  });

  // Для VLESS через WebSocket используем proxyRules
  // Примечание: полноценная поддержка VLESS требует native host
  // Здесь мы настраиваем SOCKS5/HTTP прокси как заглушку
  // Для реального VLESS нужно использовать native messaging с внешним приложением
  
  console.log('🔧 Proxy config saved:', config);
  return { success: true };
}

// === Включение прокси ===
async function enableProxy() {
  if (!proxyConfig) {
    throw new Error('Сначала настройте конфиг');
  }

  // Настройка правил прокси
  // Для демо используем заглушку - в реальности здесь должен быть 
  // вызов native application или socks5 proxy
  
  const proxyRules = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "https",
        host: proxyConfig.host,
        port: proxyConfig.port
      },
      bypassList: ["localhost", "127.0.0.1", "*.local"]
    }
  };

  await chrome.proxy.settings.set({
    value: proxyRules,
    scope: 'regular'
  });

  isConnected = true;
  
  // Обновляем иконку
  await updateIcon('connected');
  
  // Уведомление
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🔐 VPN Connect',
    message: `Подключено: ${proxyConfig.country}`
  });

  console.log('✅ Proxy enabled');
  return { success: true };
}

// === Отключение прокси ===
async function disableProxy() {
  await chrome.proxy.settings.clear({ scope: 'regular' });
  isConnected = false;
  proxyConfig = null;
  
  await updateIcon('disconnected');
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🔌 VPN Connect',
    message: 'Отключено'
  });

  console.log('❌ Proxy disabled');
  return { success: true };
}

// === Обновление иконки ===
async function updateIcon(status) {
  const path = status === 'connected' 
    ? { "16": "icons/icon16-active.png", "48": "icons/icon48-active.png", "128": "icons/icon128-active.png" }
    : { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" };
  
  await chrome.action.setIcon({ path });
}

// === Восстановление состояния при загрузке ===
chrome.runtime.onStartup.addListener(async () => {
  const { proxyConfig: savedConfig } = await chrome.storage.local.get('proxyConfig');
  if (savedConfig) {
    proxyConfig = savedConfig;
    console.log('🔄 Config restored from storage');
  }
});

// === Обработка установки ===
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'https://ваш-юзернейм.github.io/ваш-репо' });
  }
});
