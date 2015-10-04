define (require, exports, module) ->
    _           = require "underscore"
    Backbone    = require "backbone"
    Marionette  = require "marionette"

    #myListIndexTemplate = require "jade!./mylistIndexView"
    NcoAPI      = require "cs!nco/nco"

    class MylistIndexItemView extends Marionette.ItemView
        template    : ->
        tagName     : "li"
        className   : "NcoRequest_mylists_item"

        events      :
            "click"     : "onClick"

        initialize  : ->
            @$el
                .attr "data-listId", @model.get("id")
                .text @model.get("name")


        onClick     : ->
            @$el.addClass "selected"
            @trigger "selected", @model.get("id")


    class MylistIndexCompositeView extends Marionette.CompositeView
        template    : -> #myListIndexTemplate
        tagName     : "ul"
        className   : "NcoRequest_mylists_list"

        childView    : MylistIndexItemView
        #childViewContainer   : ".NcoRequest_mylists"
        # childView   : MylistIndexItemView

        childEvents :
            "selected"    : "onItemSelected"

        initialize  : ->
            @collection = new Backbone.Collection


        onItemSelected : (itemView, mylistId)->
            @children.each (view) ->
                view.$el.removeClass "selected"

            itemView.$el.addClass "selected"
            @trigger "itemSelected", mylistId
            return


        open        : ->
            self = @

            NcoAPI.request "nicoApi"
                .then (api) ->
                    dfd = api.mylist.fetchMyListsIndex()
                    dfd
                        .then (lists) ->
                            # マイリストの一覧を更新
                            self.collection.reset _.map lists, (item) ->
                                item.toJSON()
                            return

                        .catch (msg) ->
                            console.error msg


    module.exports = MylistIndexCompositeView
