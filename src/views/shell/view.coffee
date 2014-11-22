define (require, exports, module) ->
    _           = require "underscore"
    Marionette  = require "marionette"

    NcoAPI          = require "cs!nco/nco"
    ChannelManager  = require "cs!nco/ChannelManager"
    NcoConfigure    = require "cs!nco/config"

    NsenChannelDefinition = require "text!nco/NsenChannels.json"

    class NcoViewShell extends Marionette.LayoutView
        template: require "jade!./view"

        ui      :
            channel : ".NcoShell_nelchan_select"
            close   : ".NcoShell_ctrl .close"
            max     : ".NcoShell_ctrl .maximize"
            min     : ".NcoShell_ctrl .minimize"
            pin     : ".NcoShell_ctrl .pin"

        events  :
            "change @ui.channel": "_onChangeChannel"
            "click @ui.close"   : "_onClickClose"
            "click @ui.max"     : "_onClickMaximize"
            "click @ui.min"     : "_onClickMinimize"
            "click @ui.pin"     : "_onClickPin"


        initialize          : ->
            @listenTo ChannelManager, "channelChanged", @_onNotifiedChannelChange
            @listenTo NcoAPI, "changeAlwaysOnTop", @_onPinStateChanged

        onShow              : ->
            # チャンネル一覧をセレクトボックスへ設定
            channels = JSON.parse NsenChannelDefinition
            buffer = []
            tpl = _.template "<option value='<%- id %>'><%- name %>"

            _.each channels, (obj, index) ->
                buffer.push tpl(obj)

            @ui.channel.html buffer.join("")
            buffer = undefined

            # 最後に選択されたチャンネルを復元
            self    = @
            ch      = NcoConfigure.get "currentCh"
            @ui.channel.find("option").each (i) ->
                if this.value is ch
                    self.ui.channel[0].selectedIndex = i
                    return false


        _onNotifiedChannelChange    : (name, id) ->
            @ui.channel.find("option").each (i) ->
                if this.value is ch
                    self.ui.channel[0].selectedIndex = i
                    return false


        _onPinStateChanged  : (state)->
            @ui.pin.toggleClass "fixed", state


        _onClickClose       : ->
            NcoAPI.execute "close"


        _onClickMaximize    : ->
            NcoAPI.execute "maximize"


        _onClickMinimize    : ->
            NcoAPI.execute "minimize"


        _onClickPin         : ->
            NcoAPI.execute "toggleAlwaysOnTop"


        _onChangeChannel    : ->
            ChannelManager.changeChannel @ui.channel.val()


    module.exports = NcoViewShell
