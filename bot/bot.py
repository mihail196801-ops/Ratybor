import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

# ⚠️ Вставьте НОВЫЙ токен после отзыва старого в @BotFather
BOT_TOKEN = "8704703103:AAHIfm5ZCQ6wMVULa3ziZzoIIIuxeFxnwCw"
# Ссылка на ваш сайт на GitHub Pages (замените на свою)
WEBAPP_URL = https://github.com/mihail196801-ops/Ratybor"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    user = message.from_user.first_name
    
    # Клавиатура с двумя кнопками
    builder = InlineKeyboardBuilder()
    
    # Кнопка 1: Поддержать (Telegram Stars)
    builder.button(
        text="⭐ Поддержать автора", 
        callback_data="support_stars"
    )
    
    # Кнопка 2: Запустить VPN (открывает WebApp)
    builder.button(
        text="🔒 Запустить VPN",
        web_app=WebAppInfo(url=WEBAPP_URL)
    )
    
    builder.adjust(1)
    
    await message.answer(
        f"👋 Привет, {user}!\n\n"
        f"Я бот для доступа к приватным конфигурациям VPN.\n"
        f"Выберите действие:",
        reply_markup=builder.as_markup()
    )

@dp.callback_query(F.data == "support_stars")
async def on_support(callback: types.CallbackQuery):
    """Обработка кнопки поддержки"""
    # Для полноценной оплаты звездами нужно:
    # 1. Создать товар в @BotFather с валютой XTR
    # 2. Использовать bot.send_invoice()
    
    await callback.answer("Функция оплаты скоро будет доступна! ⭐", show_alert=True)
    
    # Пример отправки инвойса (раскомментируйте после настройки товара):
    # await bot.send_invoice(
    #     chat_id=callback.message.chat.id,
    #     title="Поддержка проекта",
    #     description="Спасибо за вашу помощь в развитии!",
    #     payload="support_100stars",
    #     provider_token="",  # Для звезд оставляем пустым
    #     currency="XTR",
    #     prices=[types.LabeledPrice(label="Donation", amount=100)],  # 100 звезд
    # )

@dp.callback_query(F.data == "vpn_info")
async def on_vpn_info(callback: types.CallbackQuery):
    """Доп. информация о подключении"""
    await callback.message.edit_text(
        "📋 Инструкция:\n"
        "1. Скопируйте конфиг с сайта\n"
        "2. Вставьте в приложение (v2rayNG, Streisand, Hiddify)\n"
        "3. Нажмите «Подключиться»\n\n"
        "🔗 Ссылки на приложения:\n"
        "• Android: v2rayNG, Hiddify\n"
        "• iOS: Streisand, FoXray\n"
        "• PC: v2rayN, Hiddify Desktop",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Назад", callback_data="back_menu")]
        ])
    )

@dp.callback_query(F.data == "back_menu")
async def on_back(callback: types.CallbackQuery):
    await cmd_start(callback.message)

async def main():
    print("✅ Бот запущен...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Бот остановлен")
