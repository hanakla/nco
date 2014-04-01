/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        AppModel    = require("models/AppModel"),
        
        NicoApi     = require("nicoapi/NicoApi");
    
    var commentListView;
    
    function heredoc(fn) {
        return fn.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];
    }
   
    var CommentView = Backbone.View.extend({
        tpl: _.template(heredoc(function () {/*
            <tr data-userid="<%=user.id%>" data-premium="<%=user.isPremium%>"
                data-date="<%=date.getTime()%>" data-score="<%=user.score%>"
                data-command="<%=command%>" <%=isMyPost?"data-mypost":""%>>
                <td><%=comment%></td>
            </tr>
        */
        })),
        
        initialize: function () {
            _.bindAll(this, "render", "_applyFilters", "_dispatchGenerators");
            this.render();
        },
        
        render: function () {
            var content = this.model.toJSON();
            
            content.comment = (content.comment || "").replace(/\n/g, "<br>");
            
            this.$el = $(this.tpl(content));
            this._dispatchGenerators()
                ._applyFilters();
            return this;
        },
        
        _applyFilters: function () {
            var self = this,
                filters = CommentView.filters;
            
            _.each(filters, function (fn, filterId) {
                try {
                    fn(self.model.toJSON(), self.$el[0]);
                } catch (e) {
                    Global.console.error("コメントフィルタ適用中にエラー %s: %s", filterId, e.message);
                }
            });
            
            return this;
        },
        
        _dispatchGenerators: function () {
            var self = this,
                gs = CommentView.generators;
            
            _.each(gs, function (fn, genId) {
                var $td = $("<td>"),
                    ret;
                
                $td.attr("data-col-id", genId)
                    .appendTo(self.$el);
                
                // fnに呼び出す関数が入っているのでそいつを呼び出す
                // 関数がなにかしらの値を変えせばそれをtd要素の中身にセットする
                try {
                    ret = fn(self.model.toJSON(), $td[0]);
                    (ret !== void 0) && $td.text(ret);
                } catch (e) {
                    $td.remove();
                    Global.console.error("コメント列生成中にエラー %s: %s", fn.id, e.message);
                    return;
                }
            });
            
            return this;
        },
    },
    {
        generators: {},
        filters: {}
    });
    
    
    var CommentListView = Backbone.View.extend({
        el: $("#comment-view"),
        
        commentProvider: null,
        
        initialize: function () {
            var self = this;
            _.bindAll(this, "_chChange", "_onAddComment");
            
            this.listenTo(AppModel, "change:currentCh", this._chChange);
            
            if (!AppModel.get("currentCh")) {
                return;
            }

            self.changeProvider(AppModel.get("currentCh"));
        },
        
        render: function () {
            var self = this;
            
            this.$el.empty();
            
            if (this.commentProvider) {
                this.commentProvider.each(function (model) {
                    self._onAddComment(model, null, {noScroll: true});
                });
                
                setTimeout(function () {
                    var $c = $("#content");
                    $c.stop(false, true).animate({scrollTop: $c[0].scrollHeight}, 500);
                }, 1000);
            }
        },
        
        _chChange: function () {
            this.changeProvider(AppModel.get("currentCh"));
        },
        
        _onAddComment: function (model, collection, options) {
            // 制御コメントは表示しない
            if (model.isControl()) {
                return;
            }
            
            var $cont = $("#content"),
                content = $cont[0],
                scroll = false;
            
            // 要素を追加すると計算結果が乱れるので
            // 先に最下部判定しておく
            if (content.scrollHeight === $cont.scrollTop() + $cont.height()) {
                scroll = true;
            }
            
            var view = new CommentView({model: model});
            this.$el.append(view.$el);
            
            options.noAnim || view.$el.hide().fadeIn(200);
            // ページ最下部にいる時だけ自動スクロールする
            options.noScroll || (scroll && $(content).stop(false, true).animate({scrollTop: content.scrollHeight}, 200));
        },
        
        changeProvider: function (liveId) {
            var self = this,
                old = this.commentProvider;
            
            if (old) {
                old.off("add", this._onAddComment);
            }
            
            NicoApi.Live.getLiveInfo(liveId)
                .done(function (info) {
                    self.commentProvider = info.getCommentProvider(info);
                    self.commentProvider.on("add", self._onAddComment);
                    self.render();
                })
                .fail(function (msg) {
                    self.$el.empty().append("<tr><td>" + msg + "</td></tr>");
                });
        }
    });
    
    // メインビューが初期化されたらインスタンス化
    AppInit.htmlReady(function () {
        commentListView = new CommentListView({el: $("#comment-view")});
    });
    
    
    /**
     * コメントリストに新しい列を生成するジェネレータ関数を登録します。
     * ジェネレータ関数は２つの引数と一緒に呼び出されます。
     *      1. {Object} 受信したコメントの情報(LiveComment.toJSONの結果)
     *      2. {HTMLTableCellElement} コメントリストに追加される列(td要素)
     *  
     * ジェネレータ関数は表示したいデータを返す事ができます。
     * データが返された場合は、それをtd要素の内容として表示します。
     * 非同期にデータを返したい場合は直接td要素を操作してください。
     * 
     * 生成されたtd要素には data-col-id属性が付与され、ジェネレータIDが設定されます。
     * 
     * @param {string} colId ジェネレータID
     * @param {Function(Object, HTMLTableCellElement)} generator 列の内容を生成する関数
     */
    function _registColGenerator(colId, generator) {
        if (CommentView.generators[colId]) {
            Global.console.error("このIDのカスタム列は登録済みです(%s)", colId);
            return;
        }
        
        CommentView.generators[colId] = generator;
    }
    
    /**
     * コメントのフィルタ関数を登録します。
     * フィルタ関数はコメントがリストへ追加されるたびに２つの引数とともに呼び出されます。
     *      1. {Object} 受信したコメントの情報(LiveComment.toJSONの結果)
     *      2. {HTMLTableRowElement} コメントリストに追加される行(tr要素)
     * 
     * @param {string} filterId フィルタID
     * @param {function(Object, HTMLTableRowElement)} filter フィルタ関数
     */
    function _registFilter(filterId, filter) {
        if (CommentView.filters[filterId]) {
            Global.console.error("このIDのフィルターは登録済みです(%s)", filterId);
            return;
        }
        
        CommentView.filters[filterId] = filter;
    }
    
    exports.registColGenerator = _registColGenerator;
    exports.registFilter = _registFilter;
});