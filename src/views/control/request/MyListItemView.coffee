define (require, exports, module) ->
    _           = require "underscore"
    Backbone    = require "backbone"
    Marionette  = require "marionette"

    NcoAPI              = require "cs!nco/nco"
    ChannelManager      = require "cs!nco/ChannelManager"
    itemViewTemplate    = require "jade!./MyListItemView"

    class MyListItemView extends Marionette.ItemView
        template    : itemViewTemplate
        tagName     : "li"
        className   : "NcoRequest_movies_item"

        events      :
            "click"     : "onClicked"

        templateHelpers : ->
            self    = @

            return {
                attr    : (attr) ->
                    attrSp = attr.split "."
                    val = self.model.get attrSp.shift()

                    while key = attrSp.shift()
                        if val[key]?
                            val = val[key]
                        else
                            val = null

                    return val
            }


        initialize  : ->
            @$el
                .attr "data-movieid", @model.get("movie").id


        onClicked   : ->
            @trigger "select"


    class MylistItemCompositeView extends Marionette.CompositeView
        template    : ->
        tagName     : "ul"
        className   : "NcoRequest_movies_list"

        childView   : MyListItemView

        childEvents :
            "select"    : "onItemClicked"

        _lastSelectedId : null

        initialize      : ->
            @collection = new Backbone.Collection


        onItemClicked   : (view) ->
            self = @
            $el = view.$el
            selectedId = $el.attr "data-movieid"

            if @_lastSelectedId is selectedId
                @_lastSelectedId = null

                $el.removeClass "selected"
                ChannelManager.pushRequest selectedId
                    .done ->
                        self.trigger "requested"

            else
                @children.each (view) ->
                    view.$el.removeClass "selected"

                $el.addClass "selected"
                @_lastSelectedId = selectedId


        changeItemsTo   : (mylistId) ->
            self = @

            NcoAPI.request "nicoApi"
                .then (api) ->
                    api.mylist.fetchMyList mylistId
                        .then (mylist) ->
                            # マイリストの一覧を更新
                            self.collection.reset _.map mylist.models, (item) -> item.toJSON()
                            return
                        .catch (msg) ->
                            console.error msg
            return

    module.exports = MylistItemCompositeView
