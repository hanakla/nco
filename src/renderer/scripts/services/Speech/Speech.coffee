CONFIG_SPEECH_ENABLED = "nco.services.speech.enabled"

module.exports =
class SpeechHost
    constructor : ->
        app.nsenStream.onDidChangeStream =>
            @_listenStreamEvents()

        app.config.observe CONFIG_SPEECH_ENABLED, (value) =>
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
        return if app.config.get(CONFIG_SPEECH_ENABLED, false) is false

        s = new SpeechSynthesisUtterance(text)
        s.rate = if text.length > 100 then 10 else 5
        speechSynthesis.speak(s)
        return
