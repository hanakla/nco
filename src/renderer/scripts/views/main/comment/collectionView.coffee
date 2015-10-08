module.exports =
class CommentCollectionView extends Marionette.View
    tagName     : "ul"
    className   : "NcoComments"


    initialize  : ->
        app.command.on "comments:add", (content, classList = []) =>
            @_addComment {content, classList}

        app.command.on "comments:clear", =>
            @$el.empty()

        app.contextMenu.add "body", [
             {
                label   : 'コピー',
                role    : 'copy'
            }
        ]


    scrollToBottom  : ->
        #@$el.


    _addComment : (options) ->
        {content, classList} = _.defaults options, {classList: []}

        $comment = $("<li class='NcoComments_item'>").addClass(classList.join(" ")).append content
        @$el.append $comment

        if (@el.scrollHeight - (@el.scrollTop + @el.clientHeight)) < 200
            @$el.animate {scrollTop: @el.scrollHeight}, 10
