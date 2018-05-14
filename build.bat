REM Copies src files to build dir
REM Wraps client js and css in html files
REM so Google Scripts can serve them
REM to the client

@echo off

rmdir /s /q build
mkdir build

echo Making files Google Scripts compatable

copy src\client\html\* build

REM FOR /D %%I IN (%USERPROFILE%\*) DO @ECHO %%I

for /F %%I in ('dir /B/D src\client\js\*') do (
    echo %%I

    echo ^<script^> > build\%%I.html
    type src\client\js\%%I >> build\%%I.html
    echo ^</script^> >> build\%%I.html
)

for /F %%I in ('dir /B/D src\client\css\*') do (
    echo %%I

    echo ^<script^> > build\%%I.html
    type src\client\css\%%I >> build\%%I.html
    echo >> build\%%I.html
    echo ^</script^> >> build\%%I.html
)

copy src\server\* build

if "%1"=="deploy" (
    gapps upload
)
