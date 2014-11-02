define (require, exports, module) ->
    Marionette = require "marionette"

    class NcoViewShell extends Marionette.LayoutView
        template: require "jade!./view"

        ui      :
            close   : ".NcoShell_ctrl .close"
            max     : ".NcoShell_ctrl .maximize"
            min     : ".NcoShell_ctrl .minimize"
            pin     : ".NcoShell_ctrl .pin"

        events  :
            "click @ui.close" : "close"

        onClickClose    : ->

        onClickMaximize : ->
        onClickMinimize : ->
        onClickPin      : ->


    return NcoViewShell
