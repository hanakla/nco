module.exports =
class NotifyNowPlaying
    _template : require "./notifyTemplate.jade"

    constructor : ->
        app.nsenStream.onDidChangeStream (nsenChannel) =>
            @_handleStreamEvents(nsenChannel)

    _handleStreamEvents : (nsenChannel) ->

        nsenChannel.onDidChangeMovie (movie) =>

            app.command.dispatch "comments:add", @_template
                withHeader : true
                attr: (key) -> movie.get(key)
                format : (val) => Intl.NumberFormat("en-US").format val

            app.command.dispatch "notify:notify", "再生中の動画", @_template
                withHeader : false
                attr: (key) -> movie.get(key)
                format : (val) => Intl.NumberFormat("en-US").format val
