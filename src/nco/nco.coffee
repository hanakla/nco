define (require, exports, module) ->
    $           = require "jquery"
    Marionette  = require "marionette"
    NicoAPI     = window.require "node-nicovideo-api"
    NodeWebkit  = require "cs!utils/nw"

    ChannelManager  = require "cs!nco/ChannelManager"
    NcoConfigure    = require "cs!nco/config"

    class NcoAPI extends Marionette.Application

        _api            : null

        initialize      : ->
            @_initCommands()
            @_initReqRes()
            @_initSelfListeners()

        ###*
        # Setup commands
        ###
        _initCommands   : ->
            self = @

            alwaysOnTop = false
            nwWindow = NodeWebkit.Window.get()

            @commands.setHandlers
                toggleAlwaysOnTop   : ->
                    nwWindow.setAlwaysOnTop (alwaysOnTop = !alwaysOnTop)
                    return

                minimize    : ->
                    nwWindow.minimize()
                    return

                maximize    : ->
                    nwWindow.maximize()

                exit        : ->
                    #NodeWebkit.App.quit()
                    return

            return


        ###*
        # Setup reqres
        ###
        _initReqRes     : ->
            self = @

            @reqres.setHandlers
                login       : (user, pass, memory = false) ->
                    dfr = $.Deferred()

                    api = new NicoAPI user, pass
                    api.loginThen ->
                        self._api = api

                        if memory
                            NcoConfigure.set
                                session : api.session.getSessionId()
                                user    : user
                                pass    : pass

                        self.trigger "login"
                        dfr.resolve()

                    ,(err) ->
                        dfr.reject err

                    return dfr.promise()

                reuseSession    : (sessionId) ->
                    dfr = $.Deferred()
                    self._api = new NicoAPI

                    self._api.session.setSessionId sessionId
                    self._api.loginThen ->
                        console.info "Login by old session."
                        self.trigger "login"

                    return dfr.promise()

                checkLogged : ->
                    dfr = $.Deferred()

                    unless self._api
                        return dfr.reject().promise()

                    if self._api.session.isLogged()
                        dfr.resolve()
                    else
                        dfr.reject()

                    return dfr.promise()

                nicoApi     : ->
                    dfr = $.Deferred()

                    if self._api?
                        dfr.resolve self._api
                    else
                        dfr.reject()

                    return dfr.promise()

                module      : (module) ->
                    require module

            return


        _initSelfListeners  : ->
            self = @

            @on "login", ->
                ChannelManager.setLiveApi self._api.live
                ChannelManager.changeChannel "nsen/toho"


    ncoApi = new NcoAPI()

    # Auto login
    ncoApi.addInitializer ->
        user = NcoConfigure.get "user"
        pass = NcoConfigure.get "pass"
        sessId = NcoConfigure.get "session"

        ncoApi.on "login", ->
            console.info "Auto login success"
        , ->
            console.info "Auto login failed"

        if sessId?
            ncoApi.request "reuseSession", sessId
            return

        if user? and pass?
            ncoApi.request "login", user, pass, true

    ncoApi.start()
    module.exports = window.nco = ncoApi
