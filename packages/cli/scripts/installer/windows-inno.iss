; Inno Setup script for sireno-deck. Compile with ISCC.exe (CI installs via chocolatey).
; Requires the staged tree at dist/staging/sireno-windows-x64/sireno (installer:prepare).
#ifndef VERSION
  #define VERSION "0.1.0"
#endif
#ifndef ARCH
  #ifdef IsWin64
    #define ARCH "x64"
  #else
    #define ARCH "x86"
  #endif
#endif

#define AppName "SirenoDeck"
#define StageDir "..\..\dist\staging\sireno-windows-{#ARCH}\sireno"
#define OutDir "..\..\dist\installer"

[Setup]
AppId=io.sireno.SirenoDeck
AppName={#AppName}
AppVersion={#VERSION}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
UninstallDisplayIcon={app}\sirenodeck.cmd
OutputDir={#OutDir}
OutputBaseFilename=sireno-deck-{#VERSION}-windows-{#ARCH}
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupLogging=yes

[Files]
Source: "{#StageDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\SirenoDeck"; Filename: "{app}\sirenodeck.cmd"; Parameters: "start"
Name: "{group}\SirenoDeck (emulator)"; Filename: "{app}\sirenodeck.cmd"; Parameters: "run --emulator"

[Run]
; Register SIRENO_INSTALL_ROOT for the current user so both cmd and the daemon see it.
Filename: "{cmd}"; Parameters: "setx SIRENO_INSTALL_ROOT ""{app}"""; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\frontend\dist"
Type: filesandordirs; Name: "{app}\emulator\dist"
