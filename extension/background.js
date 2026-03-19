// Глобальное состояние
let proxyConfig = null;
let isConnected = false;
let currentTabId = null;

// Обработка сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message:', request.action);

  switch (request.action) {
    case 'GET_STATUS':
      sendResponse({ 
        connected: isConnected, 
        config: proxyConfig 
      });
      break;

    case 'SETUP_PROXY':
      setupProxy(request.config).then(() => {
        sendResponse({ success: true });
        broadcastStatus();
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'ENABLE_PROXY':
      enableProxy().then(() => {
        sendResponse({ success: true });
        broadcastStatus();
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'DISABLE_PROXY':
      disableProxy().then(() => {
        sendResponse({ success: true });
        broadcastStatus();
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    case 'PARSE_CONFIG':
      try {
        const parsed = parseVlessConfig(request.configString);
        sendResponse({ success: true, config: parsed });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Парсинг VLESS конфига
function parseVlessConfig(configString) {
  if (!configString.startsWith('vless://')) {
    throw new Error('Неподдерживаемый протокол. Используйте vless://');
  }

  try {
    const url = new URL(configString.replace('vless://', 'vless://'));
    const uuid = url.username;
    const [host, port] = url.host.split(':');
    const params = new URLSearchParams(url.search);

    return {
      protocol: 'vless',
      uuid: uuid,
      host: host,
      port: parseInt(port) || 443,
      security: params.get('security') || 'none',
      type: params.get('type') || 'tcp',
      sni: params.get('sni') || host,
      path: params.get('path') || '/',
      flow: params.get('flow'),
      pbk: params.get('pbk'),
      sid: params.get('sid'),
      fp: params.get('fp') || 'chrome',
      alpn: params.get('alpn'),
      name: decodeURIComponent(url.hash.replace('#', '')) || 'VPN Server'
    };
  } catch (e) {
    throw new Error('Ошибка парсинга конфига: ' + e.message);
  }
}

// Настройка прокси
async function setupProxy(config) {
  proxyConfig = config;
  
  await chrome.storage.local.set({ 
    proxyConfig: config,
    lastUpdated: Date.now()
  });

  console.log('✅ Proxy configured:', config.host);
  return true;
}

// Включение прокси
async function enableProxy() {
  if (!proxyConfig) {
    throw new Error('Сначала настройте конфиг');
  }

  // Для VLESS через прокси используем HTTPS прокси
  // Примечание: полноценная поддержка VLESS требует native host
  const proxyRules = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "https",
        host: proxyConfig.host,
        port: proxyConfig.port
      },
      bypassList: ["localhost", "127.0.0.1", "*.local", "<local>"]
    }
  };

  await chrome.proxy.settings.set({
    value: proxyRules,
    scope: 'regular'
  });

  isConnected = true;
  
  // Уведомление
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🔐 Ratybor VPN',
    message: `Подключено: ${proxyConfig.name || proxyConfig.host}`,
    priority: 2
  });

  console.log('✅ Proxy enabled');
  return true;
}

// Отключение прокси
async function disableProxy() {
  await chrome.proxy.settings.clear({ scope: 'regular' });
  isConnected = false;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🔌 Ratybor VPN',
    message: 'Отключено',
    priority: 2
  });

  console.log('❌ Proxy disabled');
  return true;
}

// Отправка статуса всем вкладкам
function broadcastStatus() {
  chrome.runtime.sendMessage({
    action: 'STATUS_CHANGED',
    payload: {
      connected: isConnected,
      config: proxyConfig
    }
  }).catch(() => {
    // Игнорируем ошибки (если нет получателей)
  });
}

// Восстановление состояния
chrome.runtime.onStartup.addListener(async () => {
  const { proxyConfig: savedConfig } = await chrome.storage.local.get('proxyConfig');
  if (savedConfig) {
    proxyConfig = savedConfig;
    console.log('🔄 Config restored');
  }
});

// При установке
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🔐 Ratybor VPN',
      message: 'Расширение установлено! Откройте Telegram бота для начала работы.'
    });
  }
});
