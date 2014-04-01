/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        
        AppModel    = require("models/AppModel"),
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
            
            _.bindAll(this, "formFocus", "channelSelected", "submitComment",
                "clickSkip", "clickGood", "someoneSayGood");
            
            // 初めてログインした時のガイドを表示
            NicoApi.Auth.on("login", function () {
                if (AppModel.get("currentCh") === null) {
                    self.$el.find("[data-ch-selecter] > a")
                        .one("hidden.bs.tooltip", function () { $(this).tooltip('destroy'); })
                        .tooltip({title: "チャンネルを選択しましょう"})
                        .tooltip("show");
                }
            });
            
            // アプリケーションのHTML初期化完了を通知
            this.render();
            AppInit._triggerHtmlReady();
            
            // NsenAPIを準備
            if (!AppModel.get("currentCh")) {
                return;
            }
            
            this._onChannelChange();
        },
        
        render: function () {
            var ch = AppModel.get("currentCh");
            
            if (ch) {
                // 今選択されているチャンネルの表示を強調する
                this.$el.find("#channel-switcher li a")
                    .each(function () {
                        if ($(this).attr("data-ch") === ch) {
                            $(this).parent().addClass("active");
                        }
                    });
            }
        },
        
        
        //
        // ウラカタイベントリスナ
        //
        
        // AppModelのチャンネルが変わった時
        _onChannelChange: function () {
            var self = this;
            
            NicoApi.Live.getLiveInfo(AppModel.get("currentCh"))
                .done(function (live) {
                    if (self._nsenChannel) {
                        self._nsenChannel.off("videochanged", self.skipEnable);
                    }
                    
                    var nsen = live.asNsen();
                    self._live = live;
                    self._nsenChannel = nsen;
                    
                    // イベントリスニング
                    nsen
                        .on("videochanged", self.skipEnable)
                        .on("goodcall", self.someoneSayGood);
                });
        },
        
        //
        // GUIイベントリスナ
        //
        
        // 投稿フォームがクリックされた時
        formFocus: function () {
            this.$el.find(".nco-comment-group").toggleClass("focus");
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
            AppModel.set("currentCh", ch);
            
            $parent.find(">a").dropdown("toggle");
            return false;
        },
        
        // コメントを投稿した時
        submitComment: function () {
            var ch = AppModel.get("currentCh"),
                $comment = $mainView.find("#comment-poster [name='comment']"),
                provider;
            
            if (this._live) {
                provider = this._live.getCommentProvider();
                
                provider.postComment($comment.val())
                    .done(function () {
                        $comment.val("");
                    })
                    .fail(function () { /* TODO: エラー表示 */ });
            }
            
            return false;
        },
        
        // スキップリクエストをクリックした時
        clickSkip: function () {
            if (this._nsenChannel && this._nsenChannel.isSkipRequestable()) {
                this._nsenChannel.pushSkip();
            } else {
                return;
            }
            
            this.$el.find(".custom-nav-skip").addClass("disabled");
            
            var $el = this.$el.find(".custom-nav-skip .response-indicator").addClass("active");
            if ($el.attr("data-timerid") !== void 0) {
                clearTimeout($el.attr("data-timerid")|0);
            }
            $el.attr("data-timerid", setTimeout(function () { $el.removeClass("active"); $el[0].__timer = null; }, 200));
        },
        
        // Goodをクリックした時
        clickGood: function () {
            if (this._nsenChannel) {
                this._nsenChannel.pushGood();
            }
            
            this.someoneSayGood();
        },
        
        //
        // メソッド
        //
        
        // スキップが有効にできるかチェック
        skipEnable: function () {
            if (this._nsenChannel && this._nsenChannel.isSkipRequestable()) {
                this.$el.find(".custom-nav-skip").removeClass("disabled");
            }
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