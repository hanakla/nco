Remote = require "remote"
Electron = Remote.require "app"
shell = require "shell"

Nico = global.require "node-nicovideo-api"
ElectronKit = global.require "electron-kit"
Emitter = ElectronKit.Emitter
{Application, CommandManager, ContextMenuManager, ConfigManager, MenuManager} = ElectronKit.Renderer

Colors = require "colors"
NsenStream = require "./NsenStream"
RegionManager = require "./RegionManager"
Notification = require "utils/Notification"
SpeechHost = require "./SpeechHost"
Player = require "./player"

module.exports =
class App extends Application
    _session : null

    constructor : ->
        Emitter.apply(@)

        global.app = @

        @currentWindow = Remote.getGlobal("app")
            .windows.findWindowByBrowserWindow(Remote.getCurrentWindow())

        @_initializeModules()
        @_handleEvents()
        @_handleCommands()

        @_restoreSession()

    _initializeModules : ->
        @command = new CommandManager
        @contextMenu = new ContextMenuManager
        @menu = new MenuManager
        @config = new ConfigManager
            configDirPath : Electron.getDataPath()
            configFileName : "config.json"
        @config.load()

        @nsenStream = new NsenStream
        @speechHost = new SpeechHost
        @player = new Player

        $ =>
            $(document).on "click", "a", ->
                return if @href in ["#", ""]
                app.command.dispatch "shell:open-url", @href
                false
            $("body").append require("views/nco/view.jade")()
            @region = new RegionManager

        return


    _handleEvents : ->
        Application::handleEvents.apply(@)

        window.addEventListener "online", =>
            @emit "did-change-network-state", true

        window.addEventListener "offline", =>
            @emit "did-change-network-state", false

        @onDidChangeNetworkState (isOnLine) =>
            if isOnLine is no
                console.info "%cNetwork state was changed to %cOffline", Colors.text.info, Colors.text.danger

                app.command.dispatch "shell:notify", "Nco",
                    body : "ネットワーク接続が切断されました"
                    timeout : 2000
            else
                console.info "%cNetwork state was changed to %cOnline", Colors.text.info, Colors.text.primary
                app.command.dispatch "session:relogin"

        return


    _handleCommands : ->
        @command.on
            "shell:open-url" : (url) =>
                shell.openExternal url

            "shell:notify"  : (title, options) =>
                new Notification(title, options).open()

            "session:relogin" : (callback) =>
                console.info "%cRelogin...", Colors.text.info, @_session

                @_session?.relogin()
                .then =>
                    console.info "%cRelogin successful.", Colors.text.info
                    @emit "did-login", @_session
                    app.command.dispatch "channel:reset-session", @_session
                    return

                .catch (e) =>
                    console.error "Failed to relogin", e
                    return


            "session:login" : (user, pass, callback = ->) =>
                Nico.login(user, pass)
                .then (session) =>
                    @_session = session
                    @_saveSession()

                    @emit "did-login", @_session
                    app.command.dispatch "channel:reset-session", @_session
                    callback()

                .catch (e) =>
                    console.error e
                    callback(e)


    _saveSession : ->
        return unless @_session?
        app.config.set "nco.auth.session", @_session.toJSON()


    _restoreSession : ->
        restoredSession = null
        serializedSession = app.config.get("nco.auth.session")

        console.info "%c[app.restoredSession] Seesion restoring...", Colors.text.info

        unless serializedSession?
            $ => @region.get("login").currentView.open()
            return

        Nico.restoreSession(serializedSession)
        .then (session) =>
            restoredSession = session

            if navigator.onLine is yes
                session.isActive()
            else
                Promise.resolve(yes)

        .then (active) =>
            if active is no
                @region.get("login").currentView.open()
            else
                @_session = restoredSession
                app.command.dispatch "channel:reset-session", @_session
                @emit "did-login", @_session
                console.info "%c[app.restoredSession] Session restored!", Colors.text.success
        #
        # .catch (e) =>
            # console.error e


    #
    # states
    #

    ###*
    # @return {Boolean}
    ###
    hasSession : ->
        @_session?


    getSession : ->
        @_session


    #
    # Event handler
    #

    onDidChangeNetworkState : (listener) ->
        @on "did-change-network-state", listener

    onLoginRequired : (listener) ->
        @on "login-required", listener

    onDidChangeChannel : (listener) ->
        @on "did-change-channel", listener

    onDidLogin : (listener) ->
        @on "did-login", listener
