from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
import asyncio
import random
import string

# ⚠️ ВСТАВЬТЕ ВАШ ТОКЕН
BOT_TOKEN = "8704703103:AAGjORYqxVH5si9OodvDE7xOAXt1do9Zy0Q"
WEBAPP_URL = "https://mihail196801-ops.github.io/Ratybor/webapp/"

# Хранилище ключей (в памяти)
access_keys = {}

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def generate_key(length=8):
    """Генерация случайного ключа"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@dp.message(CommandStart())
async def start_command(message: types.Message):
    user_id = message.from_user.id
    user_name = message.from_user.first_name
    
    # Генерируем уникальный ключ для пользователя
    if user_id not in access_keys:
        access_keys[user_id] = generate_key()
    
    key = access_keys[user_id]
    
    # Кнопка с Web App
    keyboard = types.ReplyKeyboardMarkup(
        keyboard=[
            [types.KeyboardButton(text="🔐 Получить доступ к VPN", web_app=WebAppInfo(url=WEBAPP_URL))]
        ],
        resize_keyboard=True
    )
    
    await message.answer(
        f"👋 Привет, {user_name}!\n\n"
        f"🛡️ <b>Ratybor VPN</b> — система защиты твоего ПК.\n\n"
        f"📋 <b>Твой персональный ключ доступа:</b>\n"
        f"<code>{key}</code>\n\n"
        f"⚠️ Сохрани этот ключ! Он понадобится для активации расширения.\n\n"
        f"Нажми кнопку ниже, чтобы скачать расширение и активировать VPN:",
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.message()
async def echo(message: types.Message):
    if message.text == "🔐 Получить доступ к VPN":
        await message.answer("🔗 Открой Web App для скачивания расширения!")
    else:
        await message.answer("Нажми /start для получения ключа доступа")

async def main():
    print("✅ Бот запущен! Web App:", WEBAPP_URL)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())


