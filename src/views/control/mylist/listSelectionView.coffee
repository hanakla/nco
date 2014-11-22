define (require, exports, module) ->
    _           = require "underscore"
    Marionette  = require "marionette"

    NcoAPI          = require "cs!nco/nco"
    ChannelManager  = require "cs!nco/ChannelManager"
    listSelectionTemplate   = require "jade!./listSelection"

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

            NcoAPI.request("nicoApi").then (api) ->
                api.mylist.fetchMyListsIndex()
                    .then (mylists) ->
                        defList = _.last mylists
                        mylists = _.without mylists, defList
                        mylists.unshift defList

                        # マイリストの一覧を更新
                        innerHtml = mylists.map (item) ->
                            "<option value='#{item.get("id")}'>#{item.get("name")}"

                        self.ui.selectionList.html innerHtml
                        return
                    , (msg) ->
                        console.error msg
                return


            self = this
            $(window).on "keydown", (e) ->
                if e.keyCode is 27
                    self.close()

            return


        onClickSubmit   : ->
            self    = @
            video   = ChannelManager.getCurrentVideo()
            listId  = @ui.selectionList.val()

            @ui.selectionList.attr("disabled", "")

            unless video?
                @showMessage "再生中の動画がありません。"
                @close 3000
                return

            NcoAPI.request("nicoApi").then (api) ->
                api.mylist.fetchMyList listId
                    .then (mylist) ->
                        mylist.add video.get("id")
                    .then ->
                        # Mylist Add done
                        self.showMessage "追加しました。"
                        self.close 3000
                        return
                    , (err) ->
                        self.showMessage "追加できませんでした。#{err}"
                        self.close 3000
                        return

            return


        onClickClose    : ->
            @close()
            return


        showMessage     : (msg, showTimeSec = 3000, status = "error") ->
            $alert = @ui.alert
                .addClass "show"
                .addClass status
                .text msg

            return


        close           : (time = 0) ->
            if time is 0
                @$el.removeClass "show"
            else
                self = @
                setTimeout ->
                    self.$el.removeClass "show"
                , time

            return


        open            : ->
            @ui.alert.removeClass "show success error"
            @ui.selectionList.removeAttr("disabled", "")

            @$el.addClass "show"
            return

    module.exports = ListSelectionView
