BrowserWindow = require "browser-window"
{CommandManager} = require("electron-kit").Browser

module.exports =
class AppCommandManager extends CommandManager
    dispatch : (command, args...) ->
        @emit command, args...

        window = BrowserWindow.getFocusedWindow()
        window?.webContents.send "command", command, args...
        @emitter.emit "did-send", {window, command, args}
        return
