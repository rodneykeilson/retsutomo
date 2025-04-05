@echo off
set KEYSTORE_PASSWORD=retsutomo
set KEY_ALIAS=retsutomo-key
set KEY_PASSWORD=retsutomo
call gradlew.bat assembleRelease
echo Build completed. APK location: app\build\outputs\apk\release\app-release.apk
pause
