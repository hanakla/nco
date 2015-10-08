commentViewTemplate = require "./commentView.jade"
tooltipTemplate = require "./userTooltip.jade"

module.exports =
class CommentService
    constructor : ->
        app.nsenStream.onDidChangeStream (channel) =>
            @_listenLiveEvents(channel)

    _listenLiveEvents : (channel) ->
        channel.onDidReceiveComment (comment) =>
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

            $comment = $ commentViewTemplate {hasNewLine, comment : content}

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

            app.command.dispatch "comments:add", $comment, classList

    _md5Hash : (text) ->
        hasher = Crypto.createHash('md5')
        hasher.update(text, 'utf8')
        hasher.digest('hex')
