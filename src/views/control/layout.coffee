define (require, exports, module) ->
    Marionette  = require "marionette"

    #ActionView    = require "cs!./action-view"
    ChannelManager = require "cs!nco/ChannelManager"

    class NcoControlLayout extends Marionette.LayoutView
        template    : require "jade!./view"

        ui          :
            skip        : ".skip"
            good        : ".good"
            mylist      : ".mylist"
            request     : ".request"
            reload      : ".reload"
            input       : ".NcoControl_comment_input"

        events      :
            "keydown @ui.input" : "onSubmitComment"
            "click @ui.skip"    : "onClickSkip"
            "click @ui.good"    : "onClickGood"
            "click @ui.mylist"  : "onClickMylist"
            "click @ui.request" : "onClickRequest"
            "click @ui.reload"  : "onClickReload"

        regions     :
            actions     : ".NcoControl_actions"
            comment     : ".NcoControl_comment"
            subControls : ".NcoControl_subControls"

        initialize  : (option) ->
            #@actions.attachView new ActionView

        onSubmitComment : (e) ->
            if e.keyCode is 13 and e.shiftKey is false
                console.log "submit"
                ChannelManager.postComment @ui.input.val()
                @ui.input.val ""
                return false

        onClickReload   : ->
            console.log "reloadin"
            location.reload()

        onClickGood     : ->
            ChannelManager.pushGood()

        onClickSkip     : ->
            ChannelManager.pushSkip()

        onClickRequest  : ->
            nco.exec "openRequest"

        onClickMylist   : ->
            nco.exec "addToMylist"


    return NcoControlLayout
