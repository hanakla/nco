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
        
        events: {
            "focusin .nco-comment-form-group textarea": "onFormFocus",
            "focusout .nco-comment-form-group textarea": "onFormFocus",
            "click [nco-action='comment-multiline']": "openMultiline",
            "keydown [name='comment']": "onFormKeydown",
            
            "submit": "onPostComment"
        },
        
        initialize: function () {
            _.bindAll(this, "onFormFocus", "onFormKeydown",
                "openMultiline", "onPostComment");
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
                $comment = this.$el.find("[name='comment']");
            
            var iyayo = this.$el.find("[name='184']")[0].checked,
                comment = $comment.val(),
                command = (iyayo ? "184" : null);
            
            ChannelManager.pushComment(comment, command)
                .done(function () {
                    $comment.val("");
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
        alert: function (message, duration) {
            var $a = this.$alert;
            duration = duration !== void 0 ? duration : 3000;
            
            $a.text(message).addClass("show");
            setTimeout(function () { $a.removeClass("show"); }, duration);
        }
    });
    
    AppInit.htmlReady(function () {
        _instance = new CommentPostView({el: $("#nco-comment-form")});
    });
});