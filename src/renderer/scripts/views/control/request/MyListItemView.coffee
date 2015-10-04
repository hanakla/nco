_ = require "lodash"
Nico = global.require "node-nicovideo-api"

itemViewTemplate    = require "./MyListItemView.jade"

module.exports =
class MylistItemView extends Marionette.View
    # template    : itemViewTemplate
    tagName     : "ul"
    className   : "NcoRequest_movies_list"

    # childView   : MyListItemView
    # emptyView   : MyListItemEmptyView

    events :
        "click li" : "onItemClicked"

    _lastSelectedId : null

    initialize      : ->
        # @collection = new Backbone.Collection


    onItemClicked   : (e) ->
        $el = $(e.currentTarget)
        movieId = $el.attr "data-movie-id"

        return if $el.is(".requested")

        if @_selectedMovieId isnt movieId
            $el.addClass "selected"
            @_selectedMovieId = movieId
            return

        $el.removeClass("selected").addClass("requesting")
        @_selectedMovieId = null

        app.nsenStream.getStream()?.pushRequest(movieId)
        .then =>
            $el.removeClass "requesting"
            @trigger "requested"

        .catch (e) =>
            switch e.code
                when Nico.Nsen.RequestError.NO_LOGIN
                    message = "ログインしていません。"
                when Nico.Nsen.RequestError.CLOSED
                    message = "現在リクエストを受け付けていません。"
                when Nico.Nsen.RequestError.REQUIRED_TAG
                    message = "リクエストに必要なタグが登録されていません。"
                when Nico.Nsen.RequestError.TOO_LONG
                    message = "動画が長過ぎます。"
                when Nico.Nsen.RequestError.REQUESTED
                    message = "この動画はリクエストされたばかりです。"

            $el.removeClass("requesting")
            .data("powertip", (-> message))
            .powerTip({smartPlacement: true, manual: true})

            $.powerTip.show($el)
            setTimeout (-> $.powerTip.hide($el)), 1500


    displayItemList : (mylistId) ->
        # console.log mylistId
        app.getSession()?.mylist.getHandlerFor(mylistId)
        .then (list) =>
            @$el.empty().append list.items.map((item) => itemViewTemplate({item})).join("")

            movie = app.nsenStream.getStream()?.getRequestedMovie()
            return unless movie?
            @$("li[data-movie-id='#{movie.id}']").addClass "requested"

        return

    clear : ->
        @$el.empty()
