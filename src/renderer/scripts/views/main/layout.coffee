Marionette  = require "marionette"

CommentCollectionView   = require "./comment/collectionView"
PlayingNotifierView     = require "./nowPlaying/nowPlayingView"

module.exports =
class NcoMainLayout extends Marionette.LayoutView
    template    : require "./view.jade"

    regions     :
        comment     : "#nco-comments"
        notify      : ".NcoNotifier"

    ui          : null

    events      : null

    onShow      : ->
        @comment.show new CommentCollectionView
        @notify.show new PlayingNotifierView
