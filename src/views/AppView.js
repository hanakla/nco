/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global document, define*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        
        ChannelManager = require("appcore/ChannelManager"),
        NicoApi     = require("nicoapi/NicoApi"),
        
        nsenChannels = require("text!nicoapi/NsenChannels.json"),
        htmlMainView = require("text!htmlContent/main-view.html");
        
    var doc = document,
        write = doc.write.bind(doc),
        instance;
    
    try {
        nsenChannels = JSON.parse(nsenChannels);
    } catch (e) {
        console.error("NsenChannels.json の読み込みに失敗しました。 " + e.message);
        write("NsenChannels.json の読み込みに失敗しました。 " + e.message);
        return;
    }
    
    // メインビューを用意
    var $mainView = $(_.template(htmlMainView)({nsenChannels: nsenChannels}));
    
    $mainView.find("[data-send-good], [data-send-skip]")
                .tooltip();
    
    // メインビューを表示
    $("body").append($mainView);
    
    var AppView = Backbone.View.extend({
        el: $mainView,
        
        _live: null,
        _nsenChannel: null,
        
        events: {
            "focusin .nco-comment-group input": "formFocus",
            "focusout .nco-comment-group input": "formFocus",
            
            "click #channel-switcher a[data-ch]": "channelSelected",
            "click [data-send-skip]" : "clickSkip",
            "click [data-send-good]" : "clickGood",
            "submit #comment-poster": "submitComment"
        },
        
        initialize: function () {
            var self = this;
            
            _.bindAll(this, "formFocus", "channelSelected",
                "submitComment", "clickSkip", "clickGood",
                "skipDisabled", "skipEnabled", "someoneSayGood");
            
            
            // 初めてログインした時のガイドを表示
            NicoApi.Auth.on("login", function () {
                if (ChannelManager.getChannelType() === null) {
                    self.$el.find("[data-ch-selecter] > a")
                        .one("hidden.bs.tooltip", function () { $(this).tooltip('destroy'); })
                        .tooltip({title: "チャンネルを選択しましょう"})
                        .tooltip("show");
                }
            });
            
            // Nsenのイベントをリスニング
            ChannelManager
                .on("skipin", this.skipDisabled)
                .on("skipAvailable", this.skipEnabled)
                .on("goodcall", this.someoneSayGood)
                .once("channelChanged", this._render);
            
            // アプリケーションのHTML初期化完了を通知
            this.render();
            AppInit._triggerHtmlReady();
        },
        
        render: function () {
            var ch = ChannelManager.getChannelType();
            
            if (ch) {
                // 今選択されているチャンネルの表示を強調する
                this.$el.find("#channel-switcher li a[data-ch='nsen/" + ch + "']") 
                    .parent().addClass("active");
            }
        },
        
        
        //
        // GUIイベントリスナ
        //
        
        // 投稿フォームがクリックされた時
        formFocus: function (e) {
            var cmgroup = this.$el.find(".nco-comment-group"),
                fn;
            
            if (e.type === "focusin") {
                $(document).on("click", fn = function (e) {
                    if (cmgroup.find(e.target).length === 0)  {
                        cmgroup.removeClass("focus");
                    }
                });
            }
            
            cmgroup.addClass("focus");
        },
        
        // チャンネルが選ばれた時
        channelSelected: function (e) {
            var $parent = this.$el.find("#channel-switcher").parent(),
                $item = $(e.target);
            
            // 他のチャンネルのアクティブを無効化
            $parent.find("#channel-switcher li").removeClass("active");
            
            // 選択されたチャンネルにクラスを付加
            $item.parent().addClass("active");
            
            // チャンネルを変更
            var ch = $item.attr("data-ch");
            ChannelManager.changeChannel(ch);
            
            $parent.find(">a").dropdown("toggle");
            return false;
        },
        
        // コメントを投稿した時
        submitComment: function () {
            var $form =  $mainView.find("#comment-poster"),
                $comment = $form.find("[name='comment']");
            
            var iyayo = $form.find("[name='184']")[0].checked ? "184" : null,
                command = (iyayo ? "184" : null);
            
            ChannelManager.pushComment($comment.val(), command)
                .done(function () {
                    $comment.val("");
                })
                .fail(function () {
                    // TODO
                });
            return false;
        },
        
        // スキップリクエストをクリックした時
        clickSkip: function () {
            if (ChannelManager.isSkipRequestable()) {
                ChannelManager.pushSkip();
            } else {
                return;
            }
        },
        
        // Goodをクリックした時
        clickGood: function () {
            ChannelManager.pushGood();
            this.someoneSayGood();
        },
        
        //
        // メソッド
        //
        // スキップを無効にする
        skipDisabled: function () {
            this.$el.find(".custom-nav-skip").addClass("disabled");
            this.$el.find(".custom-nav-skip").addClass("disabled");
            
            var $el = this.$el.find(".custom-nav-skip .response-indicator").addClass("active");
            if ($el.attr("data-timerid") !== void 0) {
                clearTimeout($el.attr("data-timerid")|0);
            }
            $el.attr("data-timerid", setTimeout(function () { $el.removeClass("active"); $el[0].__timer = null; }, 200));
        },
        
        // スキップを有効にする
        skipEnabled: function () {
            this.$el.find(".custom-nav-skip").removeClass("disabled");
        },
        
        // （メソッド兼ウラカタイベントリスナ）グッドを光らせる
        someoneSayGood: function () {
            var $el = this.$el.find(".custom-nav-good .response-indicator").addClass("active");
            if ($el.attr("data-timerid") !== void 0) {
                clearTimeout($el.attr("data-timerid")|0);
            }
            $el.attr("data-timerid", setTimeout(function () { $el.removeClass("active"); $el[0].__timer = null; }, 200));
        }
    });
    
    instance = new AppView();
});