/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, document, define*/
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        ChannelManager = require("appcore/ChannelManager"),
        Global      = require("utils/Global");
    
    var _instance;
    
    var CommentPostView = Backbone.View.extend({
//        el: $("#comment-poster") // インスタンス化するときに注入される
        
        $comment: null,
        
        lastPost: null,
        
        events: {
            "focusin .nco-comment-form-group textarea": "onFormFocus",
            "focusout .nco-comment-form-group textarea": "onFormFocus",
            "click [nco-action='comment-multiline']": "openMultiline",
            "keydown [name='comment']": "onFormKeydown",
            
            "submit": "onPostComment"
        },
        
        initialize: function () {
            _.bindAll(this, "onFormFocus",
                "onFormKeydown", "onPostComment");
            
            this.$comment = this.$el.find("[name='comment']");
            this.$alert = this.$el.find(".nco-comment-error");
        },
        
        // 投稿フォームがクリックされた時
        onFormFocus: function (e) {
            var cmgroup = this.$el.find(".nco-comment-form-group"),
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
        
        // コメント入力欄で何かキーが押された時
        onFormKeydown: function (e) {
            if (e.keyCode === 13 && e.shiftKey === false) {
                // シフトキーを押さずにエンターが押されたら送信
                this.onPostComment();
                return false;
            }
        },
        
        // コメントを投稿した時
        onPostComment: function () {
            var self = this,
                $comment = this.$comment;
            
            var iyayo = this.$el.find("[name='184']")[0].checked,
                comment = $comment.val(),
                command = (iyayo ? "184" : null);
            
            if (this.lastPost === comment) {
                this.alert("同じメッセージを連続で送信できません。", 2400);
                return;
            }
            
            this.alert("送信中...");
            
            ChannelManager.pushComment(comment, command)
                .done(function () {
                    $comment.val("");
                    self.alert(false);
                    self.lastPost = comment;
                })
                .fail(function (err) {
                    var message = err.message,
                        showTime = 2400;
                    
                    // 空コメントで送ったらすぐわかるから短く表示
                    if (message.indexOf("空コメント") === 0) {
                        showTime = 800;
                    }
                    
                    self.alert(message, showTime);
                });
            return false;
        },
        
        //
        // メソッド
        //
        // フォームを有効にする
        enabled: function () {
            this.$comment.removeAttr("disabled");
            this.$el.find("button").removeAttr("disabled");
            this.$comment[0].focus();
        },
        
        // フォームを無効にする
        disabled: function () {
            this.$comment.attr("disabled", "");
            this.$el.find("button").attr("disabled", "");
        },
        
        // エラーメッセージを表示
        alert: function (message, duration) {
            var self = this,
                $a = this.$alert;
            
            if (message === false) {
                $a.removeClass("show");
                this.enabled();
                return;
            }
            
            this.disabled();
            $a.text(message).addClass("show");
            
            typeof duration === "number" &&
                setTimeout(function () {
                    $a.removeClass("show");
                    self.enabled();
                }, duration);
        }
    });
    
    AppInit.htmlReady(function () {
        _instance = new CommentPostView({el: $("#nco-comment-form")});
    });
});