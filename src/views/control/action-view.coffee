define (require, exports, module) ->
    Marionette  = require "marionette"

    class ActionView extends Marionette.View
        ui      :
            skip    : ".skip"
            good    : ".good"
            mylist  : ".mylist"
            request : ".request"
            reload  : ".reload"

        events  :
            "click @ui.skip"    : "onClickSkip"
            "click @ui.good"    : "onClickGood"
            "click @ui.mylist"  : "onClickMylist"
            "click @ui.request" : "onClickRequest"
            "click @ui.reload"  : "onClickReload"

        onClickReload   : ->
        onClickRequest  : ->
        onClickMylist   : ->
        onClickGood     : ->
        onClickSkip     : ->


    return ActionView
