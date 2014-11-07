define (require, exports, module) ->
    Marionette = require "marionette"

    NcoAPI          = require "cs!nco/nco"

    class NcoViewShell extends Marionette.LayoutView
        template: require "jade!./view"

        ui      :
            close   : ".NcoShell_ctrl .close"
            max     : ".NcoShell_ctrl .maximize"
            min     : ".NcoShell_ctrl .minimize"
            pin     : ".NcoShell_ctrl .pin"

        events  :
            "click @ui.close"   : "_onClickClose"
            "click @ui.max"     : "_onClickMaximize"
            "click @ui.min"     : "_onClickMinimize"
            "click @ui.pin"     : "_onClickPin"

        _onClickClose       : ->
            NcoAPI.execute "close"

        _onClickMaximize    : ->
            NcoAPI.execute "maximize"

        _onClickMinimize    : ->
            NcoAPI.execute "minimize"

        _onClickPin         : ->
            NcoAPI.execute "toggleAlwaysOnTop"


    return NcoViewShell
