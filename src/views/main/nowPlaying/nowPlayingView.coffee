define (require, exports, module) ->
    Marionette  = require "marionette"

    ChannelManager  = require "cs!nco/ChannelManager"
    playingView     = require "jade!./nowPlayingView"
    emptyView       = require "jade!./emptyPlayingView"


    class PlayingMovieView extends Marionette.ItemView
        template    : false

        className   : "NcoNotifier_item info NcoNowplaying show"

        events      :
            "webkitAnimationEnd"    : "onAnimationEnded"

        templateHelpers : ->
            self    = @

            return {
                attr    : (attr) ->
                    if not self.model?
                        return null

                    attrSp = attr.split "."
                    val = self.model.get attrSp.shift()

                    while key = attrSp.shift()
                        if val[key]?
                            val = val[key]
                        else
                            val = null

                    return val

                format  : (val) ->
                    val = val | 0
                    return Intl.NumberFormat("en-US").format val
            }

        initialize  : ->
            @listenTo ChannelManager, "videoChanged", @onVideoChangeNotified
            @listenTo ChannelManager, "channelChanged", @onChannelChangedNotified

            # # TestCode
            # self = @
            # require("cs!nco/nco").request("nicoApi").then (api) ->
            #     api.video.getVideoInfo "sm9"
            #         .then (info) ->
            #             console.log info
            #             self.onVideoChangeNotified info


        onAnimationEnded        : ->
            @$el.removeClass "show"

        onBeforeRender  : ->
            if @model is null
                @template = emptyView
            else
                @template = playingView


        onVideoChangeNotified   : (movie) ->
            if movie? and (movie.id isnt @model?.id)
                @model = movie
                @$el.addClass "show"

            @render()

        onChannelChangeNotified : ->
            @onNotifiedVideoChange ChannelManager.getCurrentVideo()

        onShow      : ->



    module.exports = PlayingMovieView
