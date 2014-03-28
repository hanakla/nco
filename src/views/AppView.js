/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        
        AppModel    = require("models/AppModel"),
        NicoApi     = require("nicoapi/NicoApi"),
        NicoLiveApi = require("nicoapi/NicoLiveApi"),
        
        nsenChannels = require("text!nicoapi/NsenChannels.json"),
        htmlMainView = require("text!htmlContent/main-view.html"),
        
        doc = document,
        write = doc.write.bind(doc);
    
    try {
        nsenChannels = JSON.parse(nsenChannels);
    } catch (e) {
        console.error("NsenChannels.json の読み込みに失敗しました。 " + e.message);
        write("NsenChannels.json の読み込みに失敗しました。 " + e.message);
        return;
    }
    
    var $mainView = $(_.template(htmlMainView)({nsenChannels: nsenChannels}));
    
    // メインビューを表示
    $("body").append($mainView);
    
    var AppView = Backbone.View.extend({
        el: $mainView,
        
        events: {
            "focusin .nco-comment-group input": "formFocus",
            "focusout .nco-comment-group input": "formFocus",
            
            "click #channel-switcher a[data-ch]": "channelChange",
            "submit #comment-poster": "postComment"
        },
        
        initialize: function () {
            var self = this;
            
            _.bindAll(this, "formFocus", "channelChange", "postComment");
            
            
            NicoApi.on("login", function () {
                if (AppModel.get("currentCh") === null) {
                    self.$el.find("[data-ch-selecter] > a")
                        .one("hidden.bs.tooltip", function () { $(this).tooltip('destroy'); })
                        .tooltip({title: "チャンネルを選択しましょう"})
                        .tooltip("show");
                }
            });
            
            this.render();
            AppInit._triggerHtmlReady();
        },
        
        render: function () {
            var ch = AppModel.get("currentCh");
            
            if (ch) {
                this.$el.find("#channel-switcher li a")
                    .each(function () {
                        if ($(this).attr("data-ch") === ch) {
                            $(this).parent().addClass("active");
                        }
                    });
            }
        },
        
        onlogin: function () {
            
        },
        
        formFocus: function () {
            this.$el.find(".nco-comment-group").toggleClass("focus");
        },
        
        channelChange: function (e) {
            var $parent = this.$el.find("#channel-switcher").parent(),
                $item = $(e.target);
            
            // 他のチャンネルのアクティブを無効化
            $parent.find("#channel-switcher li").removeClass("active");
            
            // 選択されたチャンネルにクラスを付加
            $item.parent().addClass("active");
            
            // チャンネルを変更
            var ch = $item.attr("data-ch");
            AppModel.set("currentCh", ch);
            
            $parent.find(">a").dropdown("toggle");
            return false;
        },
        
        postComment: function () {
            var ch = AppModel.get("currentCh"),
                $comment = $mainView.find("#comment-poster [name='comment']"),
                provider;
            
            NicoLiveApi.getLiveInfo(ch)
                .done(function (info) {
                    provider = NicoLiveApi.getCommentProvider(info);
                    provider.postComment($comment.val());
                    $comment.val("");
                });
            
            return false;
        }
        
    });
    
    
    module.exports = new AppView();
});