Marionette  = require "marionette"

playingView     = require "./nowPlayingView.jade"

module.exports =
class PlayingMovieView extends Marionette.ItemView
    template    : playingView

    className   : "NcoNotifier_item info NcoNowplaying show"

    events      :
        "click .NcoNowPlaying_detail_title" : "_clickTitleLink"
        "webkitAnimationEnd"    : "onAnimationEnded"

    templateHelpers : ->
        {
            attr    : (path) =>
                movie = app.nsenStream.getStream()?.getCurrentVideo()
                return null unless movie?
                movie.get(path)

            isPlaying : =>
                app.nsenStream.getStream()?.getCurrentVideo()?


            format  : (val) =>
                val = val | 0
                return Intl.NumberFormat("en-US").format val
        }

    initialize  : ->
        app.nsenStream.onDidChangeStream =>
            @_listenLiveEvents()


    _listenLiveEvents : ->
        stream = app.nsenStream.getStream()

        return unless stream?

        stream.onDidChangeMovie (movie) =>
            @render()
            @$el.addClass("show")

    _clickTitleLink : ->
        movie = app.nsenStream.getStream()?.getCurrentVideo()
        return unless movie?
        app.command.dispatch "shell:open-url", "http://www.nicovideo.jp/watch/#{movie.id}"
        return


    onAnimationEnded        : ->
        @$el.removeClass "show"
