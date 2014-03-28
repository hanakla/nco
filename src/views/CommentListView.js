/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        AppInit     = require("utils/AppInit"),
        Backbone    = require("thirdparty/backbone"),
        Global      = require("utils/Global"),
        AppModel    = require("models/AppModel"),
        
        NicoApi     = require("nicoapi/NicoApi"),
        NicoLiveApi = require("nicoapi/NicoLiveApi");
    
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
            this.render();
        },
        
        render: function () {
            var content = _.clone(this.model.toJSON());
            
            content.comment = (content.comment || "").replace(/\n/g, "<br>");
            
            this.$el = $(this.tpl(content));
            return this;
        }
    });
    
    
    var CommentListView = Backbone.View.extend({
        el: $("#comment-view"),
        
        commentProvider: null,
        
        initialize: function () {
            var self = this;
            _.bindAll(this, "chChange", "changeProvider", "onAddComment");
            
            this.listenTo(AppModel, "change:currentCh", this.chChange);
            
            if (!AppModel.get("currentCh")) {
                return;
            }
            
            NicoApi.isLogin()
                .done(function () {
                    self.changeProvider(AppModel.get("currentCh"));
                })
                .fail(function () {
                    NicoApi.once("login", function () {
                        self.changeProvider(AppModel.get("currentCh"));
                    });
                })
        },
        
        render: function () {
            var self = this;
            
            this.$el.empty();
            
            if (this.commentProvider) {
                this.commentProvider.each(function (model) {
                    self.onAddComment(model, null, {noScroll: true});
                });
                
                setTimeout(function () {
                    var $c = $("#content");
                    $c.stop(false, true).animate({scrollTop: $c[0].scrollHeight}, 500);
                }, 1000);
            }
        },
        
        chChange: function () {
            this.changeProvider(AppModel.get("currentCh"));
        },
        
        changeProvider: function (liveId) {
            var self = this,
                old = this.commentProvider;
            
            if (old) {
                old.off("add", this.onAddComment);
            }
            
            NicoLiveApi.getLiveInfo(liveId)
                .then(function (info) {
                        self.commentProvider = NicoLiveApi.getCommentProvider(info);
                        self.commentProvider.on("add", self.onAddComment);
                        self.render();
                    },
                    function (msg) {
                        self.$el.empty().append("<tr><td>" + msg + "</td></tr>");
                    });
        },
        
        onAddComment: function (model, collection, options) {
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
        }
    });
    
    
    AppInit.htmlReady(function () {
        CommentListView.$el = $("#comment-view");
    });
    
    module.exports = new CommentListView();
});