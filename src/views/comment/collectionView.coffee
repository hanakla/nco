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
            if comment.isControl()
                return

            @collection.models.push comment
            @_onCollectionAdd comment

            scroll  = false
            $elp    = @$el.parent()
            elp     = @el.parentElement

            # 最下部判定
            # ページ最下部にいる時だけ自動スクロールする
            if elp?.scrollHeight - ($elp.scrollTop() + $elp.height()) < 100
                $elp.stop(false, true).animate {scrollTop: elp.scrollHeight}, 200

            return

    module.exports = CommentCollectionView
