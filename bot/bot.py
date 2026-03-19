from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
import asyncio
import random
import string
import json
import os
from datetime import datetime

# ⚠️ ВСТАВЬТЕ ВАШ ТОКЕН
BOT_TOKEN = "8704703103:AAGjORYqxVH5si9OodvDE7xOAXt1do9Zy0Q"
WEBAPP_URL = "https://mihail196801-ops.github.io/Ratybor/"

# Файл для хранения ключей
KEYS_FILE = "access_keys.json"

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# === Работа с ключами ===

def load_keys():
    """Загрузка ключей из файла"""
    if os.path.exists(KEYS_FILE):
        with open(KEYS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "keys": {},
        "user_keys": {}
    }

def save_keys(data):
    """Сохранение ключей в файл"""
    with open(KEYS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def generate_unique_key(length=8):
    """Генерация уникального ключа"""
    while True:
        key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        keys_data = load_keys()
        if key not in keys_data["keys"]:
            return key

def create_key_for_user(user_id):
    """Создание уникального ключа для пользователя"""
    keys_data = load_keys()
    
    # Если у пользователя уже есть ключ - возвращаем его
    if str(user_id) in keys_data["user_keys"]:
        return keys_data["user_keys"][str(user_id)]
    
    # Генерируем новый уникальный ключ
    key = generate_unique_key()
    
    # Сохраняем
    keys_data["keys"][key] = {
        "user_id": user_id,
        "created": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "used": False,
        "activated": False
    }
    keys_data["user_keys"][str(user_id)] = key
    
    save_keys(keys_data)
    
    return key

def generate_new_key_for_user(user_id):
    """Генерация нового ключа (старый деактивируется)"""
    keys_data = load_keys()
    
    # Если был старый ключ - помечаем как недействительный
    if str(user_id) in keys_data["user_keys"]:
        old_key = keys_data["user_keys"][str(user_id)]
        if old_key in keys_data["keys"]:
            keys_data["keys"][old_key]["revoked"] = True
            keys_data["keys"][old_key]["revoked_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Генерируем новый ключ
    key = generate_unique_key()
    
    keys_data["keys"][key] = {
        "user_id": user_id,
        "created": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "used": False,
        "activated": False
    }
    keys_data["user_keys"][str(user_id)] = key
    
    save_keys(keys_data)
    return key

def get_user_key(user_id):
    """Получить ключ пользователя"""
    keys_data = load_keys()
    return keys_data["user_keys"].get(str(user_id))

def validate_key(key):
    """Проверка ключа"""
    keys_data = load_keys()
    
    if key not in keys_data["keys"]:
        return {"valid": False, "error": "Ключ не найден"}
    
    key_data = keys_data["keys"][key]
    
    if key_data.get("revoked", False):
        return {"valid": False, "error": "Ключ был заменён новым"}
    
    if key_data.get("activated", False):
        return {"valid": False, "error": "Ключ уже активирован другим устройством"}
    
    return {
        "valid": True,
        "user_id": key_data["user_id"],
        "created": key_data["created"]
    }

# === Клавиатуры ===

def main_keyboard():
    """Основная клавиатура с кнопками"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🚀 Старт")],
            [
                KeyboardButton(text="🔑 Мой ключ"),
                KeyboardButton(text="🔄 Новый ключ")
            ],
            [KeyboardButton(text="🌐 Сайт активации", web_app=WebAppInfo(url=WEBAPP_URL))],
            [KeyboardButton(text="⭐ Поддержать разработчиков")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False
    )
    return keyboard

def support_keyboard():
    """Клавиатура для поддержки"""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💰 Отправить Stars", callback_data="donate_stars")],
        [InlineKeyboardButton(text="🔗 GitHub", url="https://github.com/mihail196801-ops/Ratybor")],
        [InlineKeyboardButton(text="📞 Поддержка", url="https://t.me/ваш_контакт")]
    ])
    return keyboard

# === Обработчики ===

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    user_name = message.from_user.first_name
    
    key = create_key_for_user(user_id)
    
    await message.answer(
        f"👋 Привет, {user_name}!\n\n"
        f"🛡️ <b>Ratybor VPN</b> — система защиты твоего ПК.\n\n"
        f"Используй кнопки ниже для управления:",
        reply_markup=main_keyboard(),
        parse_mode="HTML"
    )

@dp.message(lambda msg: msg.text == "🚀 Старт")
async def on_start(message: types.Message):
    user_id = message.from_user.id
    key = get_user_key(user_id)
    
    if not key:
        key = create_key_for_user(user_id)
    
    await message.answer(
        f"🚀 <b>Добро пожаловать в Ratybor VPN!</b>\n\n"
        f"🔑 Твой ключ доступа:\n"
        f"<code>{key}</code>\n\n"
        f"💡 <b>Что дальше?</b>\n"
        f"1. Нажми '🌐 Сайт активации'\n"
        f"2. Введи ключ\n"
        f"3. Скачай расширение\n"
        f"4. Подключись к VPN!\n\n"
        f"⚠️ Ключ работает только на одном устройстве!",
        parse_mode="HTML"
    )

@dp.message(lambda msg: msg.text == "🔑 Мой ключ")
async def on_my_key(message: types.Message):
    user_id = message.from_user.id
    key = get_user_key(user_id)
    
    if not key:
        key = create_key_for_user(user_id)
    
    # Проверяем статус ключа
    keys_data = load_keys()
    key_data = keys_data["keys"].get(key, {})
    
    status = "⏳ Не активирован"
    if key_data.get("activated"):
        status = "✅ Активен"
    elif key_data.get("revoked"):
        status = "❌ Заменён новым"
    
    await message.answer(
        f"🔑 <b>Твой ключ доступа:</b>\n\n"
        f"<code>{key}</code>\n\n"
        f"📊 Статус: {status}\n"
        f"📅 Создан: {key_data.get('created', 'Неизвестно')}\n"
        f"{'⏰ Активирован: ' + key_data.get('activated_at', '') if key_data.get('activated_at') else ''}\n\n"
        f"💡 Используй этот ключ на сайте активации",
        parse_mode="HTML"
    )

@dp.message(lambda msg: msg.text == "🔄 Новый ключ")
async def on_new_key(message: types.Message):
    user_id = message.from_user.id
    
    # Подтверждение
    confirm_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Да, сгенерировать новый", callback_data="confirm_new_key")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_new_key")]
    ])
    
    await message.answer(
        "⚠️ <b>Внимание!</b>\n\n"
        "Сейчас будет создан <b>новый ключ</b>.\n\n"
        "❌ Старый ключ перестанет работать!\n"
        "✅ Новый ключ нужно будет активировать заново.\n\n"
        "Продолжить?",
        reply_markup=confirm_keyboard,
        parse_mode="HTML"
    )

@dp.callback_query(lambda c: c.data == "confirm_new_key")
async def confirm_new_key_callback(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    
    old_key = get_user_key(user_id)
    new_key = generate_new_key_for_user(user_id)
    
    await callback.message.edit_text(
        f"✅ <b>Новый ключ создан!</b>\n\n"
        f"❌ Старый ключ: <code>{old_key}</code> — отозван\n"
        f"✅ Новый ключ: <code>{new_key}</code>\n\n"
        f"💡 Теперь используй новый ключ на сайте активации",
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(lambda c: c.data == "cancel_new_key")
async def cancel_new_key_callback(callback: types.CallbackQuery):
    await callback.message.edit_text("❌ Создание нового ключа отменено")
    await callback.answer()

@dp.message(lambda msg: msg.text == "🌐 Сайт активации")
async def on_webapp(message: types.Message):
    await message.answer(
        "🌐 Открываю сайт активации...\n\n"
        "💡 Если сайт не открылся автоматически — нажми на кнопку ниже:",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔗 Открыть сайт", url=WEBAPP_URL)]
        ])
    )

@dp.message(lambda msg: msg.text == "⭐ Поддержать разработчиков")
async def on_support(message: types.Message):
    await message.answer(
        "⭐ <b>Поддержать разработчиков</b>\n\n"
        "Если вам нравится наш VPN, вы можете поддержать разработчиков:\n\n"
        "💰 <b>Telegram Stars</b> — быстрая поддержка\n"
        "🔗 <b>GitHub</b> — поставить звезду проекту\n"
        "💵 <b>Прямой перевод</b> — напишите в поддержку",
        reply_markup=support_keyboard(),
        parse_mode="HTML"
    )

@dp.callback_query(lambda c: c.data == "donate_stars")
async def on_donate_stars(callback: types.CallbackQuery):
    # Для реальной оплаты через Stars нужно настроить товар в BotFather
    await callback.answer(
        "💰 Для поддержки через Telegram Stars:\n\n"
        "1. Откройте @BotFather\n"
        "2. Найдите наш бот\n"
        "3. Выберите 'Поддержать'\n\n"
        "Или напишите нам в поддержку!",
        show_alert=True
    )

@dp.message()
async def echo(message: types.Message):
    await message.answer(
        "🤔 Неизвестная команда.\n\n"
        "Используйте кнопки ниже или нажмите /start",
        reply_markup=main_keyboard()
    )

# === Запуск ===

async def main():
    print("✅ Бот запущен! Web App:", WEBAPP_URL)
    print(f"📁 Файл ключей: {os.path.abspath(KEYS_FILE)}")
    print("\n📋 Доступные команды:")
    print("  /start - Запустить бота")
    print("\n🎮 Кнопки:")
    print("  🚀 Старт")
    print("  🔑 Мой ключ")
    print("  🔄 Новый ключ")
    print("  🌐 Сайт активации")
    print("  ⭐ Поддержать разработчиков")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
