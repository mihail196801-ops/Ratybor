// === Глобальное состояние ===
let proxyConfig = null;
let isConnected = false;
let accessKey = null;
let isValidated = false;
let currentTabId = null;

// === Обработка сообщений от Web App и Popup ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);

  switch (request.action) {
    // Проверка ключа доступа
    case 'VALIDATE_KEY':
      validateKey(request.key).then(result => {
        sendResponse({ success: result, validated: isValidated });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    // Получение текущего статуса
    case 'GET_STATUS':
      sendResponse({ 
        connected: isConnected,
        validated: isValidated,
        config: proxyConfig,
        accessKey: accessKey
      });
      break;

    // Настройка прокси
    case 'SETUP_PROXY':
      if (!isValidated) {
        sendResponse({ success: false, error: '❌ Ключ не активирован' });
        return true;
      }
      setupProxy(request.config).then(() => {
        sendResponse({ success: true });
        broadcastStatus();
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    // Включение прокси
    case 'ENABLE_PROXY':
      if (!isValidated) {
        sendResponse({ success: false, error: '❌ Ключ не активирован' });
        return true;
      }
      enableProxy().then(() => {
        sendResponse({ success: true, status: 'connected' });
        broadcastStatus();
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    // Отключение прокси
    case 'DISABLE_PROXY':
      disableProxy().then(() => {
        sendResponse({ success: true, status: 'disconnected' });
        broadcastStatus();
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;

    // Парсинг VLESS конфига
    case 'PARSE_CONFIG':
      try {
        const parsed = parseVlessConfig(request.configString);
        sendResponse({ success: true, config: parsed });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      break;

    // Проверка состояния валидации
    case 'CHECK_VALIDATION':
      sendResponse({ 
        validated: isValidated,
        accessKey: accessKey
      });
      break;

    // Сброс ключа
    case 'RESET_KEY':
      resetKey().then(() => {
        sendResponse({ success: true });
        broadcastStatus();
      });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// === Проверка и валидация ключа ===
async function validateKey(key) {
  // Простая валидация: 8 символов, буквы и цифры
  const isValid = /^[A-Z0-9]{8}$/.test(key);
  
  if (isValid) {
    accessKey = key;
    isValidated = true;
    
    // Сохраняем в storage
    await chrome.storage.local.set({
      accessKey: key,
      validated: true,
      validatedAt: Date.now()
    });
    
    // Уведомление пользователя
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🔑 Ratybor VPN',
      message: 'Ключ активирован! Теперь можно подключиться.',
      priority: 2
    }, (notificationId) => {
      console.log('Notification created:', notificationId);
    });
    
    console.log('✅ Key validated:', key);
  } else {
    console.log('❌ Invalid key:', key);
  }
  
  return isValid;
}

// === Сброс ключа ===
async function resetKey() {
  accessKey = null;
  isValidated = false;
  
  await chrome.storage.local.remove(['accessKey', 'validated', 'validatedAt']);
  
  // Отключаем прокси если был включен
  if (isConnected) {
    await disableProxy();
  }
  
  console.log('🗑️ Key reset');
  return true;
}

// === Парсинг VLESS конфига ===
function parseVlessConfig(configString) {
  if (!configString.startsWith('vless://')) {
    throw new Error('Неподдерживаемый протокол. Используйте vless://');
  }

  try {
    // Удаляем vless:// и парсим URL
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

// === Настройка прокси ===
async function setupProxy(config) {
  proxyConfig = config;
  
  // Сохраняем в storage для восстановления
  await chrome.storage.local.set({ 
    proxyConfig: config,
    lastUpdated: Date.now()
  });

  console.log('✅ Proxy configured:', config.host);
  return true;
}

// === Включение прокси ===
async function enableProxy() {
  if (!proxyConfig) {
    throw new Error('Сначала настройте конфиг');
  }

  // Настройка правил прокси
  // Примечание: Для полноценной VLESS поддержки нужен native host
  // Здесь используем HTTPS прокси как базовую реализацию
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
  
  // Обновляем иконку
  await updateIcon('connected');
  
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

// === Отключение прокси ===
async function disableProxy() {
  await chrome.proxy.settings.clear({ scope: 'regular' });
  isConnected = false;
  
  // Обновляем иконку
  await updateIcon('disconnected');
  
  // Уведомление
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

// === Обновление иконки расширения ===
async function updateIcon(status) {
  const path = status === 'connected' 
    ? {
        "16": "icons/icon16-active.png",
        "48": "icons/icon48-active.png",
        "128": "icons/icon128-active.png"
      }
    : {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      };
  
  try {
    await chrome.action.setIcon({ path });
  } catch (e) {
    console.log('Icon update error:', e);
  }
}

// === Отправка статуса всем вкладкам ===
function broadcastStatus() {
  chrome.runtime.sendMessage({
    action: 'STATUS_CHANGED',
    payload: {
      connected: isConnected,
      validated: isValidated,
      config: proxyConfig,
      accessKey: accessKey
    }
  }).catch(() => {
    // Игнорируем ошибки (если нет получателей)
  });
}

// === Восстановление состояния при запуске браузера ===
chrome.runtime.onStartup.addListener(async () => {
  console.log('🔄 Browser startup - restoring state');
  
  const { 
    proxyConfig: savedConfig, 
    accessKey: savedKey, 
    validated 
  } = await chrome.storage.local.get(['proxyConfig', 'accessKey', 'validated']);
  
  if (savedKey && validated) {
    accessKey = savedKey;
    isValidated = validated;
    console.log('✅ Key restored:', accessKey);
  }
  
  if (savedConfig) {
    proxyConfig = savedConfig;
    console.log('✅ Config restored:', savedConfig.host);
  }
  
  // Обновляем иконку
  await updateIcon(isConnected ? 'connected' : 'disconnected');
});

// === Обработка установки расширения ===
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🔐 Ratybor VPN',
      message: 'Расширение установлено! Откройте Telegram бота для получения ключа доступа.'
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// === Обработка закрытия браузера ===
chrome.runtime.onSuspend.addListener(() => {
  console.log('⏸️ Extension suspending');
  // Сохраняем текущее состояние
  chrome.storage.local.set({
    lastSuspended: Date.now(),
    wasConnected: isConnected
  });
});

// === Периодическая проверка соединения ===
chrome.alarms.create('connectionCheck', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'connectionCheck') {
    console.log(' Connection check');
    // Здесь можно добавить проверку доступности сервера
    broadcastStatus();
  }
});

// === Логирование для отладки ===
console.log('🛡️ Ratybor VPN Background Script Loaded');
console.log('Version:', chrome.runtime.getManifest().version);
