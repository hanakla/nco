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

    _instance = null

    class NcoBootstrapper extends Marionette.Application
        container   : "#nco-container"

        regions     :
            login       : "#nco-login"
            shell       : "#nco-shell"
            main        : "#nco-main"
            control     : "#nco-control"


        initialize      : ->
            $(document.body).html baseView()

            @_initViews()
            @_initEventListeners()


        _initViews      : ->
            # すべてのリージョンを描画する
            @login.show new NcoLogin
            @shell.show new NcoShell
            @main.show new NcoMain
            @control.show new NcoControl

            return


        _initEventListeners : ->
            self = @

            NcoAPI.on "login", -> self.login.close()


    _instance = new NcoBootstrapper()


    _instance.start()
