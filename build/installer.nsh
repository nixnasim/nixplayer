; NixPlayer installer customisation (electron-builder / NSIS, assisted installer)
; Pages:  Welcome  ->  License  ->  Install folder  ->  Options  ->  Installing  ->  Finish
; The install folder is pre-selected, the user can Browse to change it, and the folder
; "NixPlayer" is always created inside it (electron-builder appends it automatically).

!include nsDialogs.nsh
!include LogicLib.nsh

!define NP_ID "NixPlayer"

Var npDlg
Var npChkDefault
Var npChkDesktop
Var npChkStart
Var npSetDefault
Var npDesktop
Var npStart

; every option is ticked by default; the user can untick any of them
!macro customInit
  StrCpy $npSetDefault ${BST_CHECKED}
  StrCpy $npDesktop ${BST_CHECKED}
  StrCpy $npStart ${BST_CHECKED}
!macroend

; ---- 1. Welcome page (sidebar logo on the left) -----------------------------------------
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to the NixPlayer Setup"
  !define MUI_WELCOMEPAGE_TEXT "Setup will guide you through the installation of NixPlayer.$\r$\n$\r$\nIt is recommended that you close all other applications before starting Setup.$\r$\n$\r$\nClick Next to continue."
  !insertmacro skipPageIfUpdated
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ---- 2. Options page: "Set NixPlayer as default player" ---------------------------------
; The functions live INSIDE the macro on purpose: ${isUpdated} needs the StdUtils plugin, and electron-builder only
; registers that plugin folder after this file is included, so at top level makensis says "Plugin not found".
!macro customPageAfterChangeDir
  Function npOptionsCreate
    ${If} ${isUpdated}
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Choose Options" "Choose how NixPlayer should integrate with Windows."
    nsDialogs::Create 1018
    Pop $npDlg
    ${If} $npDlg == error
      Abort
    ${EndIf}
    ${NSD_CreateCheckbox} 0 6u 100% 12u "Set NixPlayer as the default player for video and audio files"
    Pop $npChkDefault
    ${NSD_SetState} $npChkDefault $npSetDefault
    ${NSD_CreateLabel} 12u 20u 94% 24u "Windows asks you to confirm this once: after the installation its Default apps page for NixPlayer opens - choose 'Set default' there."
    Pop $0
    ${NSD_CreateCheckbox} 0 52u 100% 12u "Create a Desktop shortcut"
    Pop $npChkDesktop
    ${NSD_SetState} $npChkDesktop $npDesktop
    ${NSD_CreateCheckbox} 0 70u 100% 12u "Create a Start Menu shortcut"
    Pop $npChkStart
    ${NSD_SetState} $npChkStart $npStart
    nsDialogs::Show
  FunctionEnd

  Function npOptionsLeave
    ${NSD_GetState} $npChkDefault $npSetDefault
    ${NSD_GetState} $npChkDesktop $npDesktop
    ${NSD_GetState} $npChkStart $npStart
  FunctionEnd
  Page custom npOptionsCreate npOptionsLeave
!macroend

; ---- 3. Finish page: run NixPlayer + open Default apps ---------------------------------
!macro customFinishPage
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  Function npFinishLeave
    ${IfNot} ${isUpdated}
    ${AndIf} $npSetDefault == ${BST_CHECKED}
      ExecShell "open" "ms-settings:defaultapps?registeredAppUser=${NP_ID}"
    ${EndIf}
  FunctionEnd

  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "Run NixPlayer"
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !define MUI_PAGE_CUSTOMFUNCTION_LEAVE npFinishLeave
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro npAssoc EXT
  WriteRegStr SHELL_CONTEXT "Software\${NP_ID}\Capabilities\FileAssociations" ".${EXT}" "NixPlayer.Media"
!macroend

; ---- register NixPlayer in Windows "Default apps" -------------------------------------
!macro customInstall
  ; shortcuts were created by the installer; remove the ones the user unticked (not on auto-updates)
  ${IfNot} ${isUpdated}
    ${If} $npDesktop != ${BST_CHECKED}
      Delete "$newDesktopLink"
    ${EndIf}
    ${If} $npStart != ${BST_CHECKED}
      Delete "$newStartMenuLink"
      StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    ${EndIf}
  ${EndIf}
  WriteRegStr SHELL_CONTEXT "Software\${NP_ID}\Capabilities" "ApplicationName" "NixPlayer"
  WriteRegStr SHELL_CONTEXT "Software\${NP_ID}\Capabilities" "ApplicationDescription" "NixPlayer - a simple, clean video and audio player"
  WriteRegStr SHELL_CONTEXT "Software\${NP_ID}\Capabilities" "ApplicationIcon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  !insertmacro npAssoc mp4
  !insertmacro npAssoc m4v
  !insertmacro npAssoc mkv
  !insertmacro npAssoc webm
  !insertmacro npAssoc mov
  !insertmacro npAssoc avi
  !insertmacro npAssoc mp3
  !insertmacro npAssoc flac
  !insertmacro npAssoc wav
  !insertmacro npAssoc ogg
  !insertmacro npAssoc m4a
  WriteRegStr SHELL_CONTEXT "Software\RegisteredApplications" "${NP_ID}" "Software\${NP_ID}\Capabilities"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegValue SHELL_CONTEXT "Software\RegisteredApplications" "${NP_ID}"
  DeleteRegKey SHELL_CONTEXT "Software\${NP_ID}"
!macroend
