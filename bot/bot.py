import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

BOT_TOKEN = "8704703103:AAHIfm5ZCQ6wMVULa3ziZzoIIIuxeFxnwCw"  # ← Замените после отзыва старого!
WEBAPP_URL = "https://mihail196801-ops.github.io/Ratybor/"  # ← Ваш Web App URL

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user = message.from_user.first_name
    
    # Кнопка с Web App
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🔐 Запустить VPN",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [InlineKeyboardButton(
            text="⭐ Поддержать автора",
            callback_data="support"
        )]
    ])
    
    await message.answer(
        f"👋 Привет, {user}!\n\n"
        f"🛡️ <b>VPN Connect</b> — ваш приватный доступ к интернету.\n\n"
        f"📋 <b>Как использовать:</b>\n"
        f"1. Нажмите «Запустить VPN»\n"
        f"2. Установите расширение (если нужно)\n"
        f"3. Выберите сервер и подключитесь!\n\n"
        f"🔐 Все конфиги хранятся на вашем GitHub",
        reply_markup=keyboard,
        parse_mode="HTML"
    )

@dp.callback_query(F.data == "support")
async def on_support(callback: types.CallbackQuery):
    """Кнопка поддержки через Telegram Stars"""
    await callback.answer("⭐ Функция оплаты скоро будет доступна!", show_alert=True)
    
    # Для реальной оплаты раскомментируйте:
    # await bot.send_invoice(
    #     chat_id=callback.message.chat.id,
    #     title="Поддержка VPN Connect",
    #     description="Спасибо за помощь в развитии проекта!",
    #     payload="support_100stars",
    #     provider_token="",  # Для XTR оставляем пустым
    #     currency="XTR",
    #     prices=[types.LabeledPrice(label="Donation", amount=100)],
    # )

async def main():
    print(f"✅ Бот запущен! Web App: {WEBAPP_URL}")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Бот остановлен")
