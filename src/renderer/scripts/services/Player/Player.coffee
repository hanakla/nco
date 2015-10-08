Request = global.require "request-promise"

module.exports =
class Player
    constructor : ->
        @_mp4player = document.createElement("video")
        @_mp4player.style.display = "none"
        @_mp4player.autoplay = true
        @_mp4player.volume = 0

        @_handleEvents()
        @_handleNsenEvents()

    _handleEvents : ->
        $ =>
            document.body.appendChild(@_mp4player)

        app.nsenStream.onDidChangeStream =>
            @_handleNsenEvents()

        app.config.observe "nco.player.enabled", (enabled) =>
            if enabled is no
                @_mp4player.pause()
            else
                @_loadMovie()

            return

        app.config.observe "nco.player.volume", (volume) =>
            @_mp4player.volume = volume

    _handleNsenEvents : ->
        channel = app.nsenStream.getStream()
        return unless channel?

        channel.onDidChangeMovie (movie) =>
            return if app.config.get("nco.player.enabled", no) is no
            @_loadMovie()


    _loadMovie : ->
        nicoSession = app.getSession()
        channel = app.nsenStream.getStream()
        movie = channel?.getCurrentVideo()

        return if false in [nicoSession?, channel?, movie?]
        return if app.config.get("nco.player.enabled", false) is false

        # 動画を取得（再生する）するための`nicohistory`クッキーを取得するために
        # 動画ページへアクセスする
        Request.get
            resolveWithFullResponse : true
            url : "http://www.nicovideo.jp/watch/#{movie.id}"
            jar : nicoSession.cookie
        .then (res) =>
            browserSession = app.currentWindow.browserWindow.webContents.session
            cookies = @_translateToughCookieToElectronSettable(nicoSession.cookie.getCookies("http://www.nicovideo.jp/"))
            cookies.forEach (cookie) ->
                browserSession.cookies.set cookie, (err) ->
                    console.error err if err?

            movie.fetchGetFlv()
        .then (result) =>
            playContent = channel.getLiveInfo().get("stream.contents.0")
            elapsedFromStart = (Date.now() - playContent.startTime) / 1000 | 0

            if @_mp4player.src is ""
                volume = app.config.get("nco.player.volume")
                $(@_mp4player).animate({volume}, 2000)

            @_mp4player.src = result.url
            @_mp4player.currentTime = elapsedFromStart
            @_mp4player.play()

        .catch =>
            console.log arguments


    _translateToughCookieToElectronSettable : (cookies) ->
        cookies.map (cookie) ->
            {
                url : "http://" + cookie.domain
                name : cookie.key
                value : cookie.value
                domain : cookie.domain
                path : cookie.path
                secure : false
                session : false
                expirationDate : +cookie.expires
            }
