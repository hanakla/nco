module.exports =
class CommentCollectionView extends Marionette.View
    tagName     : "ul"
    className   : "NcoComments"

    _contextMenu : [
        {
            label   : "ログを保存"
            command : "service:logger:export"
            enabled : false
        }
    ]


    initialize  : ->
        app.contextMenu.add ".NcoComments", @_contextMenu

        app.nsenStream.onDidChangeStream =>
            # Enable "Save log" menu when stream initialized
            @_contextMenu[0].enabled = true

        app.command.on "comments:add", (content, classList = []) =>
            @_addComment {content, classList}

        app.command.on "comments:clear", =>
            @$el.empty()


    scrollToBottom  : ->
        #@$el.


    _addComment : (options) ->
        {content, classList} = _.defaults options, {classList: []}

        $comment = $("<li class='NcoComments_item'>").addClass(classList.join(" ")).append content
        @$el.append $comment

        if (@el.scrollHeight - (@el.scrollTop + @el.clientHeight)) < 200
            @$el.animate {scrollTop: @el.scrollHeight}, 10
