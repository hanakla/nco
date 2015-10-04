define (require, exports, module) ->
    $           = require "jquery"
    Marionette  = require "marionette"

    ChannelManager  = require "cs!nco/ChannelManager"
    NcoConfig       = require "cs!nco/config"
    NodeWebkit      = require "cs!utils/nw"

    RequestLayoutView       = require "cs!./request/layout"
    MylistSelectionView     = require "cs!./mylist/listSelectionView"

    class NcoControlLayout extends Marionette.LayoutView
        template    : require "jade!./view"
        className   : "NcoControl"

        ui          :
            skip        : ".skip"
            good        : ".good"
            mylist      : ".mylist"
            request     : ".request"
            openNsen    : ".openNsen"
            reload      : ".reload"
            alert       : ".NcoControl_comment_alert"
            commentArea : ".NcoControl_comment"
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
            "click @ui.openNsen": "_onClickOpenNsen"
            "click @ui.reload"  : "_onClickReload"

        regions     :
            actions     : ".NcoControl_actions"
            comment     : ".NcoControl_comment"
            requestSelection    : ".NcoControl_request"
            mylistSelection     : ".NcoControl_mylist"


        onShow          : ->
            # ビューを表示
            @requestSelection.show new RequestLayoutView
            @mylistSelection.show new MylistSelectionView

            # フォーム状態を復元
            @$el.find("[name='comment_184']")[0]?.checked = NcoConfig.get "comment.184"


        _showError      : do ->
            timerId = null

            return (msg) ->
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
            NcoConfig.set "comment.184"
            , @ui.commentArea.find("[name='comment_184']")[0]?.checked

        _onSubmitComment : (e) ->
            if e.keyCode is 13 and e.shiftKey is false
                self = @
                ChannelManager.postComment @ui.input.val()
                    .then null, (msg) ->
                        self._showError msg

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
            @requestSelection.currentView.open()
            #nco.exec "openRequest"

        _onClickOpenNsen : ->
            id = ChannelManager.getChannelType()
            NodeWebkit.Shell.openExternal "http://live.nicovideo.jp/watch/nsen/#{id}"
            return

        _onClickMylist   : ->
            @mylistSelection.currentView.open()
            #nco.exec "addToMylist"

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

    module.exports = NcoControlLayout
