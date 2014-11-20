define (require, exports, module) ->
    $           = require "jquery"
    _           = require "underscore"
    Backbone    = require "backbone"
    Marionette  = require "marionette"

    NcoAPI      = require "cs!nco/nco"

    MyListItemView  = require "cs!./MylistItemView"
    MyListIndexView = require "cs!./MylistIndexView"

    class RequestLayoutView extends Marionette.LayoutView
        template    : require "jade!./view"
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


        _collections:
            mylist      : new Backbone.Collection
            movies      : new Backbone.Collection


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

            indexView.on "itemSelected", @onItemSelected
            itemsView.on "requested", @close


        onItemSelected  : (mylistId) ->
            @mylistItems.currentView.changeItemsTo mylistId


        onClickClose    : ->
            @close()

        open        : ->
            @$el.addClass "show"
            @mylistIndex.currentView.open()
            return


        close       : ->
            @$el.removeClass "show"

    module.exports = RequestLayoutView
