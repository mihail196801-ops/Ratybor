@echo off
chcp 65001 >nul
title Ratybor VPN - Установка расширения

echo ========================================
echo    RATYBOR VPN - AUTO INSTALLER
echo ========================================
echo.

REM Проверка Chrome
set chrome_path="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %chrome_path% (
    set chrome_path="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist %chrome_path% (
    echo [ERROR] Google Chrome не найден!
    echo Установите Chrome: https://google.com/chrome
    pause
    exit /b 1
)

echo [OK] Chrome найден
echo.

REM Скачивание расширения
echo [1/4] Скачивание расширения...
set download_url=https://github.com/mihail196801-ops/Ratybor/raw/main/downloads/extension.zip
set zip_file=%TEMP%\ratybor_extension.zip
set extract_folder=%TEMP%\ratybor_extension

powershell -Command "& {Invoke-WebRequest -Uri '%download_url%' -OutFile '%zip_file%'}"

if not exist %zip_file% (
    echo [ERROR] Не удалось скачать расширение!
    pause
    exit /b 1
)

echo [OK] Скачано
echo.

REM Распаковка
echo [2/4] Распаковка...
if exist %extract_folder% rmdir /s /q %extract_folder%
mkdir %extract_folder%

powershell -Command "& {Expand-Archive -Path '%zip_file%' -DestinationPath '%extract_folder%' -Force}"

echo [OK] Распаковано
echo.

REM Открытие Chrome с расширениями
echo [3/4] Открытие Chrome...
start "" %chrome_path% --profile-directory=Default

timeout /t 3 >nul

REM Открытие страницы расширений
start "" %chrome_path% chrome://extensions/

echo [OK] Chrome открыт
echo.

REM Инструкция
echo ========================================
echo [4/4] ПОСЛЕДНИЙ ШАГ:
echo ========================================
echo.
echo 1. В Chrome включите "Режим разработчика"
echo    (переключатель справа сверху)
echo.
echo 2. Нажмите "Загрузить распакованное"
echo.
echo 3. Выберите папку:
echo    %extract_folder%
echo.
echo 4. Готово!
echo ========================================
echo.
echo Папка с расширением:
echo %extract_folder%
echo.
echo [INFO] Копирование пути в буфер обмена...
echo %extract_folder% | clip

echo.
echo ✅ Путь скопирован! Просто вставьте (Ctrl+V)
echo.
pause
