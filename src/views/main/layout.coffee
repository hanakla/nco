define (require, exports, module) ->
    Marionette  = require "marionette"

    CommentCollectionView   = require "cs!./comment/collectionView"
    PlayingNotifierView     = require "cs!./nowPlaying/nowPlayingView"

    class NcoMainLayout extends Marionette.LayoutView
        template    : require "jade!./view"

        regions     :
            comment     : ".NcoComments"
            notify      : ".NcoNotifier"

        ui          : null

        events      : null

        onShow      : ->
            @comment.show new CommentCollectionView
            @notify.show new PlayingNotifierView


    return NcoMainLayout
