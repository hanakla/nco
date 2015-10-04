
$           = require "jquery"
_           = require "underscore"
Backbone    = require "backbone"
Marionette  = require "marionette"

MyListItemView  = require "./MyListItemView"
MyListIndexView = require "./MyListIndexView"

module.exports =
class RequestLayoutView extends Marionette.LayoutView
    template    : require "./view.jade"
    className   : "NcoRequest"

    ui          : {}

    events      :
        #"click .NcoRequest_mylists_item" : "onListSelected"
        #"click .NcoRequest_movies_item" : ""
        "keydown" : "onKeyDown"
        "click .NcoRequest_header_closing" : "onClickClose"

    regions     :
        mylistIndex : ".NcoRequest_mylists"
        mylistItems : ".NcoRequest_movies"


    # _collections:
    #     mylist      : new Backbone.Collection
    #     movies      : new Backbone.Collection


    initialize  : ->
        _.bindAll @, "onItemSelected", "close"

        self = this
        $(window).on "keydown", (e) ->
            if e.keyCode is 27
                self.close()


    onShow      : ->
        indexView = new MyListIndexView
        itemsView = new MyListItemView

        @mylistIndex.show indexView
        @mylistItems.show itemsView

        indexView.on "listSelected", @onItemSelected
        itemsView.on "requested", @close


    onItemSelected  : (mylistId) ->
        @mylistItems.currentView.displayItemList mylistId


    onClickClose    : ->
        @close()

    open        : ->
        @mylistIndex.currentView.open().then =>
            $(".NcoComments").addClass "NcoComments-request-opened"
            @$el.addClass "show"

        return


    close       : ->
        @$el.removeClass "show"
        $(".NcoComments").removeClass "NcoComments-request-opened"
        @mylistIndex.currentView.clear()
        @mylistItems.currentView.clear()
