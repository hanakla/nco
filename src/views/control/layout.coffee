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
            "keydown @ui.input" : "_onSubmitComment"
            "focus @ui.input"   : "_showOption"
            "blur @ui.input"    : "_hideOption"
            "click [name='comment_184']": "_memory184State"
            "click @ui.commentArea": "_keepFocusInInput"
            "click @ui.skip"    : "_onClickSkip"
            "click @ui.good"    : "_onClickGood"
            "click @ui.mylist"  : "_onClickMylist"
            "click @ui.request" : "_onClickRequest"
            "click @ui.reload"  : "_onClickReload"

        regions     :
            actions     : ".NcoControl_actions"
            comment     : ".NcoControl_comment"
            subControls : ".NcoControl_subControls"

        initialize  : (option) ->
            #@actions.attachView new ActionView

        _onSubmitComment : (e) ->
            if e.keyCode is 13 and e.shiftKey is false
                console.log "submit"
                ChannelManager.postComment @ui.input.val()
                @ui.input.val ""
                return false

        _onClickReload   : ->
            console.log "reloadin"
            location.reload()

        _onClickGood     : ->
            ChannelManager.pushGood()

        _onClickSkip     : ->
            ChannelManager.pushSkip()

        _onClickRequest  : ->
            nco.exec "openRequest"

        _onClickMylist   : ->
            nco.exec "addToMylist"

        _showOption      : ->
            @ui.commentArea.addClass "focus"

        _hideOption      : ->
            @$el.find(".NcoControl_comment_opt").removeClass "show"


    return NcoControlLayout
