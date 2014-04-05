/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
/*global $, define */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        ContentsManager = require("appcore/ContentsManager");
    
    var commentListView;
    
    // 制御系コメントを非表示にするフィルタを登録
    ContentsManager.addFilter("nco-control-hide", function (tr, comment) {
        return !comment.isControl();
    });
    
    var CommentListView = Backbone.View.extend({
        el: null,
        
        initialize: function () {
            _.bindAll(this, "_onClearRequest", "_onAddRow");
            
            var self = this;
            ContentsManager
                .on("_clear", this._onClearRequest)
                .on("init", function () {
                    self.render();
                    this.on("_addRow", self._onAddRow);
                });
        },
        
        render: function () {
            var self = this,
                els = ContentsManager.getRows();
            
            _.each(els, function (el) {
                self._onAddRow(el, {scroll:false});
            });
            
            setTimeout(function () {
                var $c = $("#content");
                $c.stop(false, true).animate({scrollTop: $c[0].scrollHeight}, 200);
            }, 400);
        },
        
        _onClearRequest: function () {
            this.$el.empty();
        },
        
        _onAddRow: function (element, opt) {
            var $cont = $("#content"),
                $row = $(element),
                content = $cont[0],
                scroll = false;
            
            // 要素を追加すると計算結果が乱れるので
            // 先に最下部判定しておく
            if (content.scrollHeight - ($cont.scrollTop() + $cont.height()) < 100) {
                scroll = true;
            }
            
            this.$el.append(element);
            
            $row.hide().fadeIn(200);
            // ページ最下部にいる時だけ自動スクロールする
            if (!opt || opt.scroll !== false) {
                scroll && $(content).stop(false, true).animate({scrollTop: content.scrollHeight}, 200);
            }
        }
    });
    
    // メインビューが初期化されたらインスタンス化
    AppInit.htmlReady(function () {
        commentListView = new CommentListView({el: $("#comment-view")});
    });
});