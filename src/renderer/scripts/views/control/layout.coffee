define (require, exports, module) ->
$           = require "jquery"
Marionette  = require "marionette"
#
# ChannelManager  = require "nco/ChannelManager"
# NcoConfig       = require "nco/config"
# NodeWebkit      = require "utils/nwnco"

RequestLayoutView       = require "./request/layout"
MylistSelectionView     = require "./mylist/listSelectionView"

module.exports =
class NcoControlLayout extends Marionette.LayoutView
    template    : require "./view.jade"
    className   : "NcoControl"

    ui          :
        skip        : ".skip"
        good        : ".good"
        mylist      : ".mylist"
        request     : ".request"
        preference  : ".preference"
        openNsen    : ".openNsen"
        reload      : ".reload"

        alert       : ".NcoControl_comment_alert"
        commentArea : ".NcoControl_comment"
        anonyOpt    : "[name='comment_184']"
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
        "click @ui.preference" : "_onClickPreference"
        "click @ui.openNsen": "_onClickOpenNsen"
        "click @ui.reload"  : "_onClickReload"

    regions     :
        actions     : ".NcoControl_actions"
        comment     : ".NcoControl_comment"
        requestSelection    : ".NcoControl_request"
        mylistSelection     : ".NcoControl_mylist"


    initialize : ->
        app.nsenStream.onDidChangeStream =>
            @_listenEvents()

    _listenEvents : ->
        stream = app.nsenStream.getStream()
        return unless stream?

        stream.onDidReceiveComment =>
            @ui.good.addClass("received").one "webkitTransitionEnd", =>
                @ui.good.removeClass("received")

        stream.onDidReceiveAddMylist =>
            @ui.mylist.addClass("received").one "webkitTransitionEnd", =>
                @ui.mylist.removeClass("received")

    onShow          : ->
        # ビューを表示
        @requestSelection.show new RequestLayoutView
        @mylistSelection.show new MylistSelectionView

        # フォーム状態を復元
        @$el.find("[name='comment_184']")[0]?.checked = app.config.get("nco.comment.postAsAnonymous")


    _showError      : do ->
        timerId = null

        (msg) ->
            $alert = @ui.alert
            $alert
                .text msg
                .fadeIn
                    duration    : 300
                    done        : ->
                        if timerId isnt null
                            clearTimeout timerId

                        setTimeout ->
                            $alert.fadeOut 300
                        , 1000



    _memory184State  : ->
        app.config.set "nco.comment.postAsAnonymous", @ui.commentArea.find("[name='comment_184']")[0]?.checked

    _onSubmitComment : (e) ->
        # keyCode 13 = Enter
        return true if e.keyCode isnt 13 or e.shiftKey is true

        option = if @ui.anonyOpt[0].checked then "184" else ""

        app.nsenStream.getStream()?.postComment @ui.input.val(), option
        .catch (e) => @_showError e.message
        .then => @ui.input.val ""

        false

    _onClickReload   : ->
        # console.log "reloadin"
        location.reload()

    _onClickGood     : ->
        app.command.dispatch "channel:push-good"

    _onClickSkip     : ->
        app.command.dispatch "channel:push-skip"

    _onClickRequest  : ->
        @requestSelection.currentView.open()

    _onClickOpenNsen : ->
        channel = app.nsenStream.currentChannel()
        return unless channel?
        app.command.dispatch "shell:open-url", "http://live.nicovideo.jp/watch/#{channel}"
        return

    _onClickMylist   : ->
        view = @mylistSelection.currentView
        if view.isOpened() then view.close() else view.open()

    _onClickPreference : ->
        app.command.dispatch "app:show-settings"
        return

    _showOption      : ->
        @ui.commentArea.addClass "focus"
        $(document).one "click", {self: @}, @_globalClickListener

    _hideOption      : ->
        @$el.find(".NcoControl_comment_opt").removeClass "show"

    _keepFocusInInput: ->
        @ui.input[0].focus()

    ###*
    # 領域外クリックを検出して
    # コメント入力欄のフォーカス状態を解除するリスナ
    ###
    _globalClickListener : (e)->
        self = e.data.self
        $parents = $(e.target).parents()

        if $parents.filter(self.ui.commentArea).length is 0
            self.ui.commentArea.removeClass "focus"
        else
            $(document).one "click", {self}, arguments.callee
