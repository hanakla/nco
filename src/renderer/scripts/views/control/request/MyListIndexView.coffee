_ = require "lodash"

itemViewTemplate = require "./myListIndexView.jade"

module.exports =
class MylistIndexView extends Marionette.View
    tagName     : "ul"
    className   : "NcoRequest_mylists_list"

    events      :
        "click li" : "onItemSelected"

    onItemSelected : (e) ->
        @$("li").removeClass "selected"
        $t = $(e.target).addClass "selected"
        mylistId = $t.attr("data-mylist-id")
        @trigger "listSelected", mylistId
        return


    open : ->
        app.getSession()?.mylist.fetchOwnedListIndex()
        .then (lists) =>
            @$el.empty()
            @$el.append """
            <li class="NcoRequest_mylists_item NcoRequest_mylists_item-inputMovieId" data-mylist-id="inputMovieId">動画IDを入力</li>
            """
            @$el.append lists.map((list) => itemViewTemplate({list})).join("")

    clear : ->
        @$el.empty()
