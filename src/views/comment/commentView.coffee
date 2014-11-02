define (require, exports, module) ->
    Marionette  = require "marionette"

    commentViewTemplate = require "jade!./commentView"

    class CommentView extends Marionette.ItemView
        template    : commentViewTemplate

    return CommentView
