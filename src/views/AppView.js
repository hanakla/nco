/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true, eqnull: true */
/*global document, $, define*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Global      = require("utils/Global"),
        Backbone    = require("thirdparty/backbone"),
        
        ChannelManager = require("appcore/ChannelManager"),
        NicoApi     = require("nicoapi/NicoApi"),
        
        NodeWebkit  = Global.require("nw.gui"),
        nativeWindow = NodeWebkit.Window.get(),
        
        nsenChannels = require("text!nicoapi/NsenChannels.json"),
        htmlMainView = require("text!htmlContent/main-view.html"),
        mylistItemTpl = _.template((function () {/*
            <% _.each(lists, function (list) { %>
                <li data-id='<%= list.get("id") %>'><a href='#'><%= list.get("name") %></a></li>
            <% }) %>
        */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1].replace(/\n/g, ""));
    
    /**
     * 初期化
     */
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
    
    // プラットフォーム判別クラスを付与
    $(document.body).addClass("platform-" + Global.nco.platform);
    
    // メインビューを用意
    var $mainView = $(_.template(htmlMainView)({nsenChannels: nsenChannels}));
    
    $mainView.find("[data-tooltipin]")
                .tooltip({container:"body"});
    
    // 外部リンクをデフォルトブラウザで開く
    $(document).on("click", "a", function () {
        if (/https?:\/\//.test(this.href)) {
            NodeWebkit.Shell.openExternal(this.href);
        }
        return false;
    });
    
    
    // メインビューを表示
    $("body").append($mainView);
    
    
    /**
     * イベントリスナーとか
     */
    var AppView = Backbone.View.extend({
        el: $mainView,
        _isPinned: false,
        
        events: {
            "click #channel-switcher a[data-ch]": "channelSelected",
            "click [data-send-skip]" : "clickSkip",
            "click [data-send-good]" : "clickGood",
            "click [data-add-mylist]": "clickAddMylist",
            
            "click [data-action='close']": "_onClickClose",
            "click [data-action='minimize']": "_onClickMinimize",
            "click [data-action='pin']": "_onClickPin",
            "click [data-add-mylist] .dropdown-menu li": "_addMylist"
        },
        
        initialize: function () {
            var self = this;
            
            _.bindAll(this, "channelSelected", "clickSkip", "clickGood",
                "skipDisabled", "skipEnabled", "someoneSayGood",
                "_onClickClose", "_onClickMinimize", "_onClickPin", "_addMylist");
            
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
            
            // マイリスト一覧を表示
            var self = this;
            NicoApi.MyList.getMyListIndex()
                .done(function (groups) {
                    self.$el.find("[data-add-mylist] ul").append(mylistItemTpl({lists:groups}));
                });
            
        },
        
        
        //
        // GUIイベントリスナ
        //
        
        // クローズボタンが押された時
        _onClickClose: function () {
            nativeWindow.close();
        },
        
        _onClickMinimize: function () {
            nativeWindow.minimize();
        },
        
        _onClickPin: function () {
            if (this._isPinned) {
                nativeWindow.setAlwaysOnTop(false);
                this.$el.find("[data-action='pin']")
                    .removeClass("lock");
            } else {
                nativeWindow.setAlwaysOnTop(true);
                this.$el.find("[data-action='pin']")
                    .addClass("lock");
            }
            
            this._isPinned = !this._isPinned;
        },
        
        _addMylist: function (e) {
            var self = this,
                id = e.currentTarget.getAttribute("data-id"),
                video = ChannelManager.getCurrentVideo();
            
            if (video == null) {
                return;
            }
            
            NicoApi.MyList.getMyListGroup(id)
                .then(function (mylist) {
                    return mylist.add(video);
                })
                .done(function () {
                    self.mylistAdded(true);
                })
                .fail(function () {
                    self.mylistAdded(false);
                });
            
            this.$el.find("[data-add-mylist] a").dropdown("toggle");
            return false;
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
        
        // マイリストを光らせる
        mylistAdded: function (result) {
            var $el = this.$el.find(".custom-nav-mylist .response-indicator");
            
            $el.addClass("active " + (result ? "success" : "fail"))
            
            if ($el.attr("data-timerid") !== void 0) {
                clearTimeout($el.attr("data-timerid")|0);
            }
            
            var id = setTimeout(function () {
                $el.removeClass("active success fail"); $el[0].__timer = null;
            }, 1300);
            $el.attr("data-timerid", id);
        },
        
        
        // グッドを光らせる
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