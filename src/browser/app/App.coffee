app = require "app"
path = require "path"

ElectronKit = require "electron-kit"
{Application, WindowManager, MenuManager} = ElectronKit.Browser
AppCommandManager = require "./AppCommandManager"

module.exports =
class App extends Application
    constructor : ->
        super

    initializeModules : ->
        @windows = new WindowManager(@options)
        @command = new AppCommandManager(@options)
        @menu = new MenuManager
            defaultTemplate : require("../config/menus/#{process.platform}")({
                devMode : @options.devMode
            })
        return

    handleEvents : ->

        # MenuManager events
        @windows.onDidAddWindow (window) =>
            @menu.attachMenu window

        @windows.onDidChangeFocusedWindow (window) =>
            @menu.changeActiveMenu window

        @menu.onDidClickCommandItem (command) =>
            @command.dispatch command


    handleCommands : ->
        @command.on
            # Application commands
            "app:new-window" : =>
                config = require "../config/window"

                window = @windows.openWindow(config)
                window.loadUrl("file://" + path.join(__dirname, "../../renderer/index.html"))

            "app:show-settings" : =>
                return unless (window = @windows.lastFocusedWindow())?
                @command.dispatchToWindow window, "app:show-settings"
                return

            "app:quit" : =>
                app.quit()
                return

            # Window commands
            "window:toggle-dev-tools" : => @windows.lastFocusedWindow()?.toggleDevTools()
            "window:reload" : => @windows.lastFocusedWindow()?.reload()

            "window:toggle-always-on-top" : =>
                window = @windows.lastFocusedWindow()

                return unless window?

                newState = not window.isAlwaysOnTop()
                window.setAlwaysOnTop(newState)

            "window:maximize" : =>
                @windows.lastFocusedWindow().maximize()

            "window:minimize" : =>
                @windows.lastFocusedWindow()?.minimize()

            "window:close" : =>
                return unless (bw = @windows.lastFocusedWindow()?.browserWindow)?

                if bw.devToolsWebContents?
                    bw.closeDevTools()
                else if bw.isFocused()
                    bw.close()
                return

        return
