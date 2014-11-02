define (require, exports, module) ->
    Marionette  = require "marionette"

    ChannelManager = require "cs!nco/ChannelManager"

    CommentView = require "cs!./commentView"

    class CommentCollectionView extends Marionette.CollectionView
        childView   : CommentView

        initialize  : ->
            console.dir(ChannelManager)
            ChannelManager.changeChannel "nsen/vocaloid"
            ChannelManager.on "receiveComment", @onReceiveComment

        onReceiveComment : (comment) ->
            console.log comment


    module.exports = CommentCollectionView
