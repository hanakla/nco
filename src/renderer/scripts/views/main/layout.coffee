Marionette  = require "marionette"

CommentCollectionView   = require "./comment/collectionView"
NotifyView = require "./notify/NotifyView"

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
        @notify.show new NotifyView
