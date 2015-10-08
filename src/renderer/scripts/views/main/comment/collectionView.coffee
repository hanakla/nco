itemViewTemplate = require "./commentView.jade"
tooltipTemplate = require "./userTooltip.jade"

module.exports =
class CommentCollectionView extends Marionette.View
    tagName     : "ul"
    className   : "NcoComments"


    initialize  : ->

        app.command.on "comments:add", (content, classList = []) =>
            @_addComment {content, classList}

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

        stream.onDidReceiveComment (comment) =>
            classList = []
            classList.push("NcoComments_item-control") if comment.isControlComment()
            classList.push("NcoComments_item-self") if comment.isPostBySelf()
            classList.push("NcoComments_item-distributor") if comment.isPostByDistributor()

            hasNewLine = /\n/g.test(comment.comment)

            content = comment.comment
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
                .replace(/(https?:\/\/[^\s　<>]+)/, "<a href='$&'>$&</a>")

            $comment = $ itemViewTemplate {hasNewLine, comment : content}

            # setup user info tooltipTemplate
            if comment.isPostByAnonymous()
                $user = $ """
                <div class="NcoComments_user">
                    <h5 class="NcoComments_user_name">#{comment.get("user.id")}</h5>
                </div>
                """

                $comment.filter(".NcoComments_item_thumbnail")
                    .attr("src", "./images/anonymous_user.png")
                    .data("powertipjq", $user)
                    .powerTip({placement: "e", mouseOnToPopup: true})

            else
                app.getSession()?.user.getUserInfo(comment.get("user.id"))
                .then (user) ->
                    $user = $(tooltipTemplate({user}))

                    $comment.filter(".NcoComments_item_thumbnail")
                        .attr("src", user.get("thumbnailURL"))
                        .data("powertipjq", $user)
                        .powerTip({placement: "e", mouseOnToPopup: true})

            @_addComment({content: $comment, classList})



    scrollToBottom  : ->
        #@$el.

    _addComment : (options) ->
        {content, classList} = _.defaults options, {classList: []}

        $comment = $("<li class='NcoComments_item'>").addClass(classList.join(" ")).append content
        @$el.append $comment

        if (@el.scrollHeight - (@el.scrollTop + @el.clientHeight)) < 200
            @$el.animate {scrollTop: @el.scrollHeight}, 10


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
