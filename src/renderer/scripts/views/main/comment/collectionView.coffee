_           = require "underscore"
Backbone    = require "backbone"
Marionette  = require "marionette"

itemViewTemplate = require "./commentView.jade"
tooltipTemplate = require "./userTooltip.jade"

module.exports =
class CommentCollectionView extends Marionette.View
    tagName     : "ul"
    className   : "NcoComments"


    initialize  : ->

        app.nsenStream.onDidChangeStream =>
            @_listenLiveEvents()

        app.contextMenu.add "body", [
             {
                label   : 'コピー',
                role    : 'copy'
            }
        ]

        # @collection = new Backbone.Collection
        # _.bindAll @
        #     , "_onReceiveComment"
        #     , "_onChannelChanged"

        # ChannelManager
        #     .on "receiveComment", @_onReceiveComment
        #     .on "channelChanged", @_onChannelChanged

        # _.each ChannelManager.getComments(), (m) ->
        #     @onReceiveComment m
        # , @

    _listenLiveEvents : ->
        stream = app.nsenStream.getStream()

        @$el.empty()

        stream.onDidChangeMovie (movie) =>
            return unless movie?
            buf = "<li class='NcoComments_item NcoNowPlaying'>"
            buf += require("../nowPlaying/nowPlayingView.jade")
                isPlaying : -> true
                attr: (path) -> movie.get(path)
                format  : (val) => Intl.NumberFormat("en-US").format val
            buf += "</li>"

            @$el.append(buf)

        stream.onDidReceiveComment (comment) =>

            classList = ["NcoComments_item"]
            classList.push("NcoComments_item-control") if comment.isControlComment()
            classList.push("NcoComments_item-self") if comment.isPostBySelf()
            classList.push("NcoComments_item-distributor") if comment.isPostByDistributor()

            hasNewLine = /\n/g.test(comment.comment)

            content = comment.comment
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
            content = content.replace(/(https?:\/\/[^\s　<>]+)/, "<a href='$&'>$&</a>")

            $comment = $(itemViewTemplate({classList, comment: content, hasNewLine}))
            @$el.append $comment

            if (@el.scrollHeight - (@el.scrollTop + @el.clientHeight)) < 200
                @$el.animate {scrollTop: @el.scrollHeight}, 10

            if comment.isPostByAnonymous()
                $user = $ """
                <div class="NcoComments_user">
                    <h5 class="NcoComments_user_name">#{comment.get("user.id")}</h5>
                </div>
                """

                $comment.find(".NcoComments_item_thumbnail")
                    .attr("src", "./images/anonymous_user.png")
                    .data("powertipjq", $user)
                    .powerTip({placement: "e", mouseOnToPopup: true})

                return

            app.getSession().user.getUserInfo(comment.get("user.id"))
            .then (user) ->
                $user = $(tooltipTemplate({user}))

                $comment.find(".NcoComments_item_thumbnail")
                    .attr("src", user.get("thumbnailURL"))
                    .data("powertipjq", $user)
                    .powerTip({placement: "e", mouseOnToPopup: true})


    scrollToBottom  : ->
        #@$el.

    _onChannelChanged: ->
        @collection.reset()


    _onReceiveComment : (comment) ->
        if comment.isControl()
            return

        # @collection.models.push comment
        # @_onCollectionAdd comment

        #scroll  = false
        #$elp    = @$el.parent()
        #elp     = @el.parentElement

        # 最下部判定
        # ページ最下部にいる時だけ自動スクロールする
        # if elp?.scrollHeight - ($elp.scrollTop() + $elp.height()) < 100
        #     $elp.stop(false, true).animate {scrollTop: elp.scrollHeight}, 200

        return
