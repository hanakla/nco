_ = require "lodash"
Nico = global.require "node-nicovideo-api"

currentRequestTemplate = require "./currentRequestView.jade"
movieIdFormTemplate = require "./movieIdPutView.jade"
itemViewTemplate = require "./myListItemView.jade"

module.exports =
class MylistItemView extends Marionette.View
    # template    : itemViewTemplate
    tagName     : "ul"
    className   : "NcoRequest_movies_list"

    # childView   : MyListItemView
    # emptyView   : MyListItemEmptyView

    events :
        "click li" : "onItemClicked"
        "submit .NcoForm" : "onPutMovieId"

    _lastSelectedId : null

    initialize      : ->
        # @collection = new Backbone.Collection

    _humanizeRequestError : (code) ->
        return switch code
            when Nico.Nsen.RequestError.NO_LOGIN
                "ログインしていません。"
            when Nico.Nsen.RequestError.CLOSED
                "現在リクエストを受け付けていません。"
            when Nico.Nsen.RequestError.REQUIRED_TAG
                "リクエストに必要なタグが登録されていません。"
            when Nico.Nsen.RequestError.TOO_LONG
                "動画が長過ぎます。"
            when Nico.Nsen.RequestError.REQUESTED
                "この動画はリクエストされたばかりです。"

    onPutMovieId : ->
        $input = @$("[name='movieId']")
        movieId = $input.val()
        movieId = /((?:sm|nm)[0-9]+$)/.exec(movieId)?[1]

        unless movieId?
            @$(".NcoForm_message").text "正しい動画IDを入力してください"

        app.nsenStream.getStream()?.pushRequest(movieId)
        .then =>
            @trigger "requested"

        .catch (e) =>
            message = @_humanizeRequestError(e.code)

            @$(".NcoForm_message").text message

            $.powerTip.show($input)
            setTimeout (-> $.powerTip.hide($input)), 1500

        false


    onItemClicked   : (e) ->
        $el = $(e.currentTarget)
        movieId = $el.attr "data-movie-id"

        if $el.is(".requested")
            $el.addClass("alreadyRequested")
            setTimeout (=> @trigger "requested"), 2000
            return

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
            message = @_humanizeRequestError(e.code)

            $el.removeClass("requesting")
            .data("powertip", (-> message))
            .powerTip({smartPlacement: true, manual: true})

            $.powerTip.show($el)
            setTimeout (-> $.powerTip.hide($el)), 1500

    _displayMovieIdPutForm : ->
        @$el.empty().html movieIdFormTemplate()

    displayItemList : (mylistId) ->
        if mylistId is "inputMovieId"
            @_displayMovieIdPutForm()
            return

        # console.log mylistId
        app.getSession()?.mylist.getHandlerFor(mylistId)
        .then (list) =>
            @$el.empty().append list.items.map((item) => itemViewTemplate({item})).join("")

            movie = app.nsenStream.getStream()?.getRequestedMovie()
            return unless movie?
            @$("li[data-movie-id='#{movie.id}']").addClass "requested"

        return

    index : ->
        nsenCh = app.nsenStream.getStream()

        if nsenCh?
            movie = nsenCh.getRequestedMovie()
            @$el.empty().html currentRequestTemplate({movie})
        return

    clear : ->
        @$el.empty()
