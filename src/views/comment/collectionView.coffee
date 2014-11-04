define (require, exports, module) ->
    _           = require "underscore"
    Backbone    = require "backbone"
    Marionette  = require "marionette"

    ChannelManager = require "cs!nco/ChannelManager"

    CommentView = require "cs!./commentView"
    CommentCollection   = require "cs!./collection.coffee"

    class CommentCollectionView extends Marionette.CollectionView
        childView   : CommentView
        #childViewContainer  : "ul"

        initialize  : ->

            @collection = new CommentCollection

            _.bindAll @, "onReceiveComment"

            ChannelManager.on "receiveComment", @onReceiveComment

        #onAddChild  : ->
        #    console.log "add"

        scrollToBottom  : ->
            #@$el.

        onReceiveComment : (comment) ->
            unless comment.isControl()
                @collection.models.push comment
                @_onCollectionAdd comment

                content = @$el[0]

                # 要素を追加すると計算結果が乱れるので
                # 先に最下部判定しておく
                if (content.scrollHeight - (@$el.scrollTop() + @$el.height()) < 100)
                    scroll = true;


                # ページ最下部にいる時だけ自動スクロールする

                scroll && $(content).stop(false, true).animate({scrollTop: content.scrollHeight}, 200)

            return

    module.exports = CommentCollectionView
