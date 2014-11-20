define (require, exports, module) ->
    Marionette  = require "marionette"

    CommentCollectionView = require "cs!./comment/collectionView"

    class NcoMainLayout extends Marionette.LayoutView
        template    : require "jade!./view"

        regions     :
            comment    : ".NcoComments"

        ui          : null

        events      : null

        onShow      : ->
            @comment.show new CommentCollectionView


    return NcoMainLayout
