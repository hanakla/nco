_ = require "lodash"
listSelectionTemplate   = require "./listSelection.jade"

Colors = require "colors"

module.exports =
class ListSelectionView extends Marionette.LayoutView
    template    : listSelectionTemplate
    className   : "NcoMylist"

    ui          :
        alert           : ".NcoMylist_alert"
        close           : ".NcoMylist_closing"
        selectionList   : ".NcoMylist_list"
        submit          : ".NcoMylist_btnAdd"

    events      :
        "click @ui.submit"  : "onClickSubmit"
        "click @ui.close"   : "onClickClose"


    onShow      : ->
        self = @

        # NcoAPI.request("nicoApi").then (api) ->
        #     api.mylist.fetchMyListsIndex()
        #         .then (mylists) ->
        #             defList = _.last mylists
        #             mylists = _.without mylists, defList
        #             mylists.unshift defList
        #
        #             # マイリストの一覧を更新
        #             innerHtml = mylists.map (item) ->
        #                 "
        #
        #             self.ui.selectionList.html innerHtml
        #             return
        #         , (msg) ->
        #             console.error msg
        #     return


        self = this
        $(window).on "keydown", (e) ->
            if e.keyCode is 27
                self.close()

        return


    onClickSubmit   : ->
        return unless (stream = app.nsenStream.getStream())?

        video = stream.getCurrentVideo()
        listId = @ui.selectionList.val()
        @ui.selectionList.attr("disabled", "")

        unless video?
            @showMessage "再生中の動画がありません。"
            @close 3000
            return

        console.info "%c[MylistSelectionView] Add movie(#{video.id}) into MyList(#{listId})", Colors.text.info

        app.getSession()?.mylist.getHandlerFor(listId)
        .then (listHandler) ->
            listHandler.addMovie(video)

        .then =>
            console.info "%c[MylistSelectionView] Add movie to MyList(#{listId}) successful.", Colors.text.success

            @showMessage "追加しました。"
            @close 1000
            return

        .catch (e) =>
            console.error "%c[MylistSelectionView] Failed to add movie to MyList(#{listId})", Colors.text.danger, e
            @showMessage "追加できませんでした。<br>（#{e.message}）"
            @close 2000

        return


    onClickClose    : ->
        @close()
        return


    showMessage     : (msg, showTimeSec = 3000, status = "error") ->
        $alert = @ui.alert
            .addClass "show"
            .addClass status
            .html msg

        return

    isOpened : ->
        @$el.is ".show"


    close           : (time = 0) ->
        if time is 0
            @$el.removeClass "show"
        else
            setTimeout (=> @$el.removeClass "show"), time

        return


    open            : ->
        @ui.selectionList.empty()

        app.getSession()?.mylist.fetchOwnedListIndex()
        .then (list) =>
            @ui.selectionList.html do =>
                _.map(list, (item) -> "<option value='#{item.get("id")}'>#{item.get("name")}").join("")

            @ui.alert.removeClass "show success error"
            @ui.selectionList.removeAttr "disabled", ""

            @$el.addClass "show"
        return
