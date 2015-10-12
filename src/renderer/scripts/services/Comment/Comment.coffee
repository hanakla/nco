Crypto = global.require "crypto"
Identicon = require "thirdparty/identicon"

commentViewTemplate = require "./commentView.jade"
tooltipTemplate = require "./userTooltip.jade"

module.exports =
class CommentService
    constructor : ->
        @_iconCache = {}

        app.nsenStream.onDidChangeStream (channel) =>
            @_listenLiveEvents(channel)

    _listenLiveEvents : (channel) ->
        channel.onDidReceiveComment (comment) =>
            userId = comment.get("user.id")

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
                    <h5 class="NcoComments_user_name">#{userId}</h5>
                </div>
                """

                # make icon
                if @_iconCache[userId]?
                    thumbnailUrl = @_iconCache[userId]
                else
                    hash = @_md5Hash(userId)
                    data = "data:image/png;base64," + new Identicon(hash, 128).toString()
                    thumbnailUrl = @_iconCache[userId] = @_dataURItoBlobURL(data)

                $comment.filter(".NcoComments_item_thumbnail")
                    .attr("src", thumbnailUrl)
                    .data("powertipjq", $user)
                    .powerTip({placement: "e", mouseOnToPopup: true})

            else
                app.getSession()?.user.getUserInfo(userId)
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

    _dataURItoBlobURL : (dataURI) ->
        # convert base64/URLEncoded data component to raw binary data held in a string
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1])
        else
            byteString = unescape(dataURI.split(',')[1])

        # separate out the mime component
        mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

        # write the bytes of the string to a typed array
        ia = new Uint8Array(byteString.length)
        for i in [0...byteString.length]
            ia[i] = byteString.charCodeAt(i)

        URL.createObjectURL(new Blob([ia], {type:mimeString}))
