module.exports =
class SpeechHost
    constructor : ->
        app.nsenStream.onDidChangeStream =>
            @_listenStreamEvents()

        app.config.observe "nco.speech", (value) =>
            if value is false
                speechSynthesis.cancel()
            return

    _listenStreamEvents : ->
        stream = app.nsenStream.getStream()
        return unless stream?

        stream.onDidChangeMovie (movie) =>
            return unless movie?
            @speech "再生中の動画は#{movie.get("user.name")}さんの、#{movie.get("title")}です。"

        setTimeout =>
            stream.onDidReceiveComment (comment) =>
                if comment.isNormalComment() and not comment.isControlComment()
                    @speech comment.comment
        , 1000

        return

    speech : (text) ->
        return if app.config.get("nco.speech", false) is false

        s = new SpeechSynthesisUtterance(text)
        speechSynthesis.speak(s)
        return
