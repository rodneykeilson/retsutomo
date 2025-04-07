@echo off
set KEYSTORE_PASSWORD=10r20o30d
set KEY_ALIAS=retsutomo-key
set KEY_PASSWORD=10r20o30d
call gradlew.bat assembleRelease
@REM echo Build completed. APK location: app\build\outputs\apk\release\app-release.apk
pause
