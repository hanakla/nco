_ = require "lodash"

itemView = require "./myListIndexItemView.jade"

module.exports =
class MylistIndexView extends Marionette.View
    tagName     : "ul"
    className   : "NcoRequest_mylists_list"

    events      :
        "click li" : "onItemSelected"

    initialize  : ->
        # @collection = new Backbone.Collection


    onItemSelected : (e) ->
        @$("li").removeClass "selected"
        $t = $(e.target).addClass "selected"
        mylistId = $t.attr("data-mylist-id")
        @trigger "listSelected", mylistId
        return


    open : ->
        app.getSession()?.mylist.fetchOwnedListIndex()
        .then (lists) =>
            @$el.empty().append lists.map((list) => itemView({list})).join("")

    clear : ->
        @$el.empty()
