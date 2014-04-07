/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */
/*global $, define*/
define(function (require, exports, module) {
    "use strict";
    
    var _                 = require("thirdparty/lodash"),
        AppInit             = require("utils/AppInit"),
        Backbone            = require("thirdparty/backbone"),
        NicoMyListApi       = require("nicoapi/NicoApi").MyList,
        ChannelManager      = require("appcore/ChannelManager"),
        requestSelection    = require("text!htmlContent/request-selection.html");
    
    var mylistTmpl = _.template("<li><a href='#' data-mylist-id='<%= id %>'><%= name %></a></li>"),
        itemTmpl = _.template(
            "<a href='#' class='nco-mylist-item col-xs-6 col-sm-4 col-md-3' nco-movieid='<%= movie.id %>'>" +
                "<img class='media-object' src='<%= movie.thumbnail %>'>" +
                "<p><%= movie.title %></p>" +
            "</a>"),
        _instance;
    
    var RequestSelectionModal = Backbone.View.extend({
        el: null, // 後から渡される
        
        omittedMylistGroups: null,
        lastSelectItem: null,
        
        $mylistGroups: null,
        $mylistContents: null,
        
        events: {
            "click [nco-request-close]": "onClose",
            "click .nco-mylist-selector a": "onSelectMylist",
            "click .nco-mylist-contents>a": "onMovieSelect",
        },
        
        initialize: function () {
            _.bindAll(this, "onSelectMylist", "onMovieSelect", "onClose");
            
            // 内部にコンテンツを挿入
            this.$el.html(requestSelection);
            
            this.$mylistGroups = this.$el.find(".nco-mylist-selector");
            this.$mylistContents = this.$el.find(".nco-mylist-contents");
        },
        
        // マイリストを選んだ時
        onSelectMylist: function (e) {
            var id = e.currentTarget.getAttribute("data-mylist-id");
            this.showVideoList(id);
            
            // マイリスト一覧が隠れきるまでホバーで出現させない
            this.$mylistGroups.addClass("no-hover")
                .one("mouseleave", function () {
                    $(this).removeClass("no-hover");
                });
        },
        
        // 動画が選択された時
        onMovieSelect: function (e) {
            var $el = $(e.currentTarget);
            
            if (this.lastSelectItem === $el[0]) {
                // 同じアイテムが２度クリックされたら
                var id = $el.attr("nco-movieid");
                
                $el.removeClass("nco-mylist-item-selection")
                    .addClass("nco-mylist-item-selection-wait");
                
                ChannelManager.pushRequest(id)
                    .done(function () {
                        console.log("done");
                        $el.removeClass("nco-mylist-item-selection-wait")
                            .addClass("nco-mylist-item-selection-done");
                    })
                    .fail(function (err) {
                        console.log("fail");
                        $el.attr("nco-fail-reason", err.message);
                        $el.removeClass("nco-mylist-item-selection-wait")
                            .addClass("nco-mylist-item-selection-fail");
                    });
                
                console.log(e.currentTarget);
            } else {
                if (this.lastSelectItem) {
                    // 選択済みのアイテムの選択状態を解除
                    this.lastSelectItem.classList.remove("nco-mylist-item-selection");
                }
                
                $el.addClass("nco-mylist-item-selection");
                this.lastSelectItem = $el[0];
            }
        },
        
        // 閉じるボタンが押された時
        onClose: function () {
            this.close();
        },
        
        
        //
        // ビューメソッド
        //
        
        // セレクターを表示
        show: function () {
            var self = this;
            
            this.$el.addClass("show");
            
            NicoMyListApi.getMyListIndex(true)
                .done(function (groups) {
                    self.omittedMylistGroups = groups;
                    
                    _.each(groups, function (list) {
                        var c = mylistTmpl(list.toJSON());
                        self.$mylistGroups.append(c);
                    });
                    
                    self.$mylistGroups.prepend(mylistTmpl({id:"default", name:"とりあえずマイリスト"}));
                });
        },
        
        // セレクターを隠す
        close: function () {
            this.$el.removeClass("show");
            this.clear();
        },
        
        // コンテンツをクリア
        clear: function () {
            this.$mylistContents.empty();
            this.$mylistGroups.empty();
        },
        
        // マイリスセレクタの表示切り替え
        toggleSelectionView: function (state) {
            this.$mylistGroups.toggleClass("show", state === "mylist" );
            this.$mylistContents.toggleClass("show", state === "contents");
        },
        
        // 動画セレクタを表示
        showVideoList: function (id) {
            this.toggleSelectionView("contents");
            
            id !== "default" && (id = id|0);
            
            var self = this;
            var mylist = _.find(this.omittedMylistGroups, function (mylist) {
                return (mylist.id === id);
            });
            
            NicoMyListApi.getMyListGroup(mylist)
                .done(function (mylist) {
                    self.$mylistContents.empty();
                    
                    _.each(mylist.models, function (item) {
                        self.$mylistContents.append(itemTmpl(item.toJSON()));
                    });
                });
        }
    });
    
    
    AppInit.htmlReady(function () {
        _instance = new RequestSelectionModal({el: $("#nco-dialog-request-selection")});
    });
    
    exports.show = function () {
        _instance && _instance.show();
    };
});