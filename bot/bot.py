from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder
import asyncio
import random
import string
import json
import os
from datetime import datetime
import logging

# Убираем лишние логи
logging.basicConfig(level=logging.WARNING)

# ⚠️ ВСТАВЬТЕ ВАШ ТОКЕН
BOT_TOKEN = "8704703103:AAGjORYqxVH5si9OodvDE7xOAXt1do9Zy0Q"
WEBAPP_URL = "https://mihail196801-ops.github.io/Ratybor/"

# Файл для хранения ключей
KEYS_FILE = "access_keys.json"

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# === Работа с ключами ===

def load_keys():
    if os.path.exists(KEYS_FILE):
        try:
            with open(KEYS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"keys": {}, "user_keys": {}}
    return {"keys": {}, "user_keys": {}}

def save_keys(data):
    with open(KEYS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def generate_unique_key(length=8):
    attempts = 0
    while attempts < 100:
        key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
        keys_data = load_keys()
        if key not in keys_data["keys"]:
            return key
        attempts += 1
    raise Exception("Не удалось сгенерировать уникальный ключ")

def create_key_for_user(user_id):
    keys_data = load_keys()
    
    if str(user_id) in keys_data["user_keys"]:
        return keys_data["user_keys"][str(user_id)]
    
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

def generate_new_key_for_user(user_id):
    keys_data = load_keys()
    
    # Деактивируем старый ключ
    if str(user_id) in keys_data["user_keys"]:
        old_key = keys_data["user_keys"][str(user_id)]
        if old_key in keys_data["keys"]:
            keys_data["keys"][old_key]["revoked"] = True
            keys_data["keys"][old_key]["revoked_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Генерируем новый
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
    keys_data = load_keys()
    return keys_data["user_keys"].get(str(user_id))

# === Клавиатуры ===

def main_keyboard():
    builder = ReplyKeyboardBuilder()
    builder.button(text="🚀 Старт")
    builder.button(text="🔑 Мой ключ")
    builder.button(text="🔄 Новый ключ")
    builder.button(text="🌐 Сайт активации")
    builder.button(text="⭐ Поддержка")
    builder.adjust(1, 2, 1, 1)
    return builder.as_markup(resize_keyboard=True)

def webapp_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="🌐 Сайт активации", web_app=WebAppInfo(url=WEBAPP_URL))
    builder.button(text="📦 Автоустановка", web_app=WebAppInfo(url=WEBAPP_URL + "auto_install.html"))
    builder.adjust(1)
    return builder.as_markup()

def support_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="💰 Telegram Stars", callback_data="donate_stars")
    builder.button(text="🔗 GitHub", url="https://github.com/mihail196801-ops/Ratybor")
    builder.button(text="📞 Написать разработчику", url="https://t.me/tihonetoya")
    builder.adjust(1)
    return builder.as_markup()

def confirm_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Да, создать новый", callback_data="confirm_new_key")
    builder.button(text="❌ Отмена", callback_data="cancel_new_key")
    builder.adjust(2)
    return builder.as_markup()

# === Обработчики ===

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user_id = message.from_user.id
    user_name = message.from_user.first_name or "Пользователь"
    
    try:
        key = create_key_for_user(user_id)
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")
        return
    
    await message.answer(
        f"👋 Привет, {user_name}!\n\n"
        f"🛡️ <b>Ratybor VPN</b>\n\n"
        f"🔑 Твой ключ: <code>{key}</code>\n\n"
        f"Выбери действие:",
        reply_markup=main_keyboard(),
        parse_mode="HTML"
    )

@dp.message(F.text == "🚀 Старт")
async def on_start(message: types.Message):
    user_id = message.from_user.id
    key = get_user_key(user_id)
    
    if not key:
        try:
            key = create_key_for_user(user_id)
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
            return
    
    await message.answer(
        f"🚀 <b>Добро пожаловать!</b>\n\n"
        f"🔑 Твой ключ:\n<code>{key}</code>\n\n"
        f"1️⃣ Нажми '🌐 Сайт активации'\n"
        f"2️⃣ Введи ключ\n"
        f"3️⃣ Скачай расширение\n"
        f"4️⃣ Подключись!",
        parse_mode="HTML"
    )

@dp.message(F.text == "🔑 Мой ключ")
async def on_my_key(message: types.Message):
    user_id = message.from_user.id
    key = get_user_key(user_id)
    
    if not key:
        try:
            key = create_key_for_user(user_id)
        except Exception as e:
            await message.answer(f"❌ Ошибка: {e}")
            return
    
    keys_data = load_keys()
    key_data = keys_data["keys"].get(key, {})
    
    status = "⏳ Не активирован"
    if key_data.get("revoked"):
        status = "❌ Заменён новым"
    elif key_data.get("activated"):
        status = "✅ Активен"
    
    await message.answer(
        f"🔑 <b>Твой ключ:</b>\n\n"
        f"<code>{key}</code>\n\n"
        f"📊 Статус: {status}\n"
        f"📅 Создан: {key_data.get('created', 'Неизвестно')}",
        parse_mode="HTML"
    )

@dp.message(F.text == "🔄 Новый ключ")
async def on_new_key(message: types.Message):
    keyboard = confirm_keyboard()
    
    await message.answer(
        "⚠️ <b>Создать новый ключ?</b>\n\n"
        "❌ Старый перестанет работать!\n"
        "✅ Новый нужно активировать заново.",
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.message(F.text == "🌐 Сайт активации")
async def on_webapp(message: types.Message):
    keyboard = webapp_keyboard()
    
    await message.answer(
        "🌐 <b>Выберите:</b>",
        reply_markup=keyboard
    )

@dp.message(F.text == "⭐ Поддержка")
async def on_support(message: types.Message):
    keyboard = support_keyboard()
    
    await message.answer(
        "⭐ <b>Поддержать</b>\n\n"
        "Выберите способ:",
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "confirm_new_key")
async def confirm_new_key_callback(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    
    try:
        old_key = get_user_key(user_id)
        new_key = generate_new_key_for_user(user_id)
        
        await callback.message.edit_text(
            f"✅ <b>Готово!</b>\n\n"
            f"❌ Старый: <code>{old_key}</code>\n"
            f"✅ Новый: <code>{new_key}</code>\n\n"
            f"💡 Используй новый ключ!",
            parse_mode="HTML"
        )
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка: {e}")
    
    await callback.answer()

@dp.callback_query(F.data == "cancel_new_key")
async def cancel_new_key_callback(callback: types.CallbackQuery):
    await callback.message.edit_text("❌ Отменено")
    await callback.answer()

@dp.callback_query(F.data == "donate_stars")
async def on_donate_stars(callback: types.CallbackQuery):
    await callback.answer("💰 Скоро можно будет поддержать!", show_alert=True)

@dp.message()
async def echo(message: types.Message):
    await message.answer(
        "🤔 Используй кнопки:",
        reply_markup=main_keyboard()
    )

# === Запуск ===

async def main():
    print("=" * 50)
    print("✅ БОТ ЗАПУЩЕН!")
    print(f"Web App: {WEBAPP_URL}")
    print(f"Keys: {os.path.abspath(KEYS_FILE)}")
    print("=" * 50)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
