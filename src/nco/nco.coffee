#
# Ncoの操作を行うAPI郡
#
# Command
#   Example: nco.execute "commandName"[, arg1[, arg2...]]
#
#   minimize()
#       ウィンドウを最小化します。
#
#   maximize()
#       ウィンドウを最大化します。
#
#   exit()
#       アプリケーションを終了します。
#
# Request - Response
#   Exapmple: nco.request "commandName"[, arg1[, arg2...]]
#
#   login(user: string, pass: string, memory: boolean = false) : $.Promise
#       ニコニコ動画へログインを行います。
#       memoryにtrueが指定された時、ログイン成功時に受け取ったセッションIDを保存します。
#
#   reuseSession(sessionId: string) : $.Promise
#       セッションIDからニコニコ動画へログインします。
#
#   checkLogged(): $.Promise
#       ログインされているかチェックし、resolve / rejectで結果を返します。
#       resolveされた時はログイン済み、ログインしていない場合はrejectされます。
#
#   nicoApi(): $.Promise
#       Ncoの現在のインスタンスで利用しているnicoオブジェクトをresolveで返します。
#       未ログインなど、nicoオブジェクトが初期化されていない時はrejectされます。
#
#   module(): Any
#       Ncoのコアモジュールを読み込みます。
#
# Events
#
#   alwaysOnTop:enabled() / alwaysOnTop:disabled()
#       ウィンドウの最前面固定の状態が変わった時にどちらかが呼び出されます。
#
#
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
                ChannelManager.setApi self._api
                ChannelManager.changeChannel NcoConfigure.get("currentCh")


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


    ncoApi.addInitializer   ->
        window.addEventListener "beforeunload", ->
            ncoApi._api?.dispose()
            console.info "success dispose api object."
        , false

    ncoApi.addInitializer ->
        ChannelManager.on "channelChanged", (name, id)->
            NcoConfigure.set "currentCh", id

    ncoApi.start()
    module.exports = window.nco = ncoApi
