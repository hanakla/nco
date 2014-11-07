define (require, exports, module) ->
    _           = require "underscore"
    Marionette  = require "marionette"

    NcoAPI          = require "cs!nco/nco"
    ChannelManager  = require "cs!nco/ChannelManager"

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
            setTimeout =>
                channels = JSON.parse NsenChannelDefinition
                tpl = _.template "<option value='<%- id %>'><%- name %>"
                buffer = []
                _.each channels, (obj, index) ->
                    buffer.push tpl(obj)

                @ui.channel.html buffer.join("")
            , 0



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

    return NcoViewShell
