###*
# Nco views bootstrapper
###
define (require, exports, module) ->
    # Global modules
    $               = require "jquery"
    Marionette      = require "marionette"

    # Nco Components
    # -- model
    NcoAPI          = require "cs!./nco"

    # -- views
    baseView    = require "jade!views/nco/view"
    NcoShell    = require "cs!views/shell/view"
    NcoMain     = require "cs!views/main/layout"
    NcoControl  = require "cs!views/control/layout"
    NcoLogin    = require "cs!views/login/layout"

    NcoCommentCollection    = require "cs!views/comment/collection"

    _instance = null

    class NcoBootstrapper extends Marionette.Application
        initialize      : ->
            $(document.body).html baseView()

            @_initRegions()
            @_initViews()
            @_initEventListeners()


        _initRegions    : ->
            # Init regions
            @addRegions
                login :
                    el          : "#nco-login"
                    regionClass : NcoLogin
                shell   :
                    el          : "#nco-shell"
                    regionClass : NcoShell
                main    :
                    el          : "#nco-main"
                    regionClass : NcoMain
                control :
                    el          : "#nco-control"
                    regionClass : NcoControl


        _initViews      : ->
            # すべてのリージョンを描画する
            $.each @getRegions(), () ->
                @render() if $.isFunction @render

            @main.comments.attachView new NcoCommentCollection

            return


        _initEventListeners : ->
            self = @

            NcoAPI.on "login", -> self.login.close()


    _instance = new NcoBootstrapper()

    # Login check
    _instance.addInitializer ->
        NcoAPI.request "checkLogged"
            .then ->
                null
            , ->
                _instance.login.open()


    _instance.start()
