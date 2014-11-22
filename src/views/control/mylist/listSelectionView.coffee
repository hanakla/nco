define (require, exports, module) ->
    Marionette  = require "marionette"

    NcoAPI      = require "cs!nco/nco"
    listSelectionTemplate   = require "jade!./listSelection"

    class ListSelectionView extends Marionette.LayoutView
        template    : listSelectionTemplate
        className   : "NcoMylist"

        ui          :
            close           : ".NcoMylist_closing"
            selectionList   : ".NcoMylist_list"

        events      :
            "click @ui.close"   : "onClickClose"

        onShow      : ->
            self = @

            NcoAPI.request("nicoApi").then (api) ->
                api.mylist.fetchMyListsIndex()
                    .then (mylists) ->
                        # マイリストの一覧を更新
                        innerHtml = mylists.map (item) ->
                            "<option value='#{item.get("id")}'>#{item.get("name")}"
                        self.ui.selectionList.html innerHtml
                        return
                    .catch (msg) ->
                        console.error msg
                return


            self = this
            $(window).on "keydown", (e) ->
                if e.keyCode is 27
                    self.close()

            return


        onClickClose    : ->
            @close()

        close           : ->
            @$el.removeClass "show"

        open            : ->
            @$el.addClass "show"

    module.exports = ListSelectionView
