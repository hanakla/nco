Remote = require "remote"
App = Remote.require "app"
fs = require "fs"
path = require "path"
Moment = require "moment"

module.exports =
class Logger
    constructor : ->
        @_logs = {}

        app.nsenStream.onDidChangeStream (channel) =>
            @_listenChannelEvents(channel)
            return

        app.command.on "service:logger:export", =>
            @_export()
            return


    _listenChannelEvents : (channel) ->
        channel.onDidReceiveComment (comment) =>
            ch = channel.getChannelType()
            store = @_logs[ch] ?= []
            store.push comment
            return

    _export : ->
        channel = app.nsenStream.getStream()
        live = channel.getLiveInfo()
        return unless channel? and live?

        chName = channel.getChannelType()
        store = @_logs[chName]

        return unless store?

        app.command.dispatch "shell:dialog:save", {
            title : "ログを保存"
            filters : [{name: "Text", extensions: ["txt"]}]
            defaultPath : App.getPath("userDesktop")
        }, (savePath) =>
            return unless savePath?

            buffer = []
            store.forEach (comment) =>
                postedAt = comment.get("date")
                date = Moment(postedAt).format "YYYY/MM/DD"
                time = Moment(postedAt).format "HH:mm:ss"

                return unless comment.isNormalComment()

                if comment.isPostBySelf()
                    buffer.push "[Me] #{date} #{time} #{comment.comment}"
                else
                    buffer.push "     #{date} #{time} #{comment.comment}"

                return

            fs.writeFileSync savePath, buffer.join("\n"), {encoding : "utf8"}
            app.command.dispatch "notify:notify", "ログを保存しました！", savePath
