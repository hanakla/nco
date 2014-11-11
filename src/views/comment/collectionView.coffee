define (require, exports, module) ->
    _           = require "underscore"
    Backbone    = require "backbone"
    Marionette  = require "marionette"

    ChannelManager = require "cs!nco/ChannelManager"

    CommentView = require "cs!./commentView"

    class CommentCollectionView extends Marionette.CollectionView
        childView   : CommentView
        #childViewContainer  : "ul"

        initialize  : ->
            @collection = new Backbone.Collection
            _.bindAll @
                , "_onReceiveComment"
                , "_onChannelChanged"

            ChannelManager
                .on "receiveComment", @_onReceiveComment
                .on "channelChanged", @_onChannelChanged

            _.each ChannelManager.getComments(), (m) ->
                @onReceiveComment m
            , @

        #onAddChild  : ->
        #    console.log "add"

        scrollToBottom  : ->
            #@$el.

        _onChannelChanged: ->
            @collection.reset()


        _onReceiveComment : (comment) ->
            unless comment.isControl()
                @collection.models.push comment
                @_onCollectionAdd comment

                content = @$el[0]

                # 要素を追加すると計算結果が乱れるので
                # 先に最下部判定しておく
                #if (content.scrollHeight - (@$el.scrollTop() + @$el.height()) < 100)
                    #scroll = true

                # ページ最下部にいる時だけ自動スクロールする
                $p = @$el.parent()
                $p.stop(false, true).animate {scrollTop: $p[0].scrollHeight}, 200

            return

    module.exports = CommentCollectionView
