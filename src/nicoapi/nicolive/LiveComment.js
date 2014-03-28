/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */
define(function (require, exports, module) {
    "use strict";
    
    var Backbone = require("thirdparty/backbone");
    
    var LiveComment = Backbone.Model.extend({
        defaults : {
            "threadId": null,
            
            "date": null,
            "locale": null,
            "command": null,
            "comment": null,
            
            "isMyPost": null,
            
            "user": {
                "id": null,
                "score": 0,
                "isPremium": false,
                "isAnonymous": false
            }
        },
        
        isControl: function () {
            return this.get("user").id === 900000000;
        },
        
        isMyPost: function () {
            return this.get("isMyPost");
        },
        
        parse: function () {},
        fetch: function () {},
        sync: function () {},
        save: function () {},
        destroy: function () {}
    });
    
    /**
     * 規定の形式のXMLからLiveCommentモデルを生成します。
     * ニコ生サーバーから配信されてくる以下のような形式のコメント（１行）を第１引数に渡してください。
     * <chat thread="###" vpos="###" date="###" date_usec="###" user_id="###" premium="#" locale="**">コメント内容</chat> 
     * @param {string} xml ニコ生コメントサーバーから受信したXMLコメントデータ
     */
    function _fromPlainXml(xml) {
        var $xml = $(xml),
            obj;

        obj = {
            threadId: $xml.attr("thread"),

            date: new Date($xml.attr("date")|0 * 1000),
            locale: $xml.attr("locale"),
            command: $xml.attr("mail"),
            comment: $xml.text(),
            
            isMyPost: $xml.attr("yourpost") === "1",

            user: {
                id: $xml.attr("user_id")|0,
                score: $xml.attr("score")|0,
                accountType: $xml.attr("premium"),
                isPremium: ($xml.attr("premium")|0) > 0,
                isAnonymous: $xml.attr("anonymity")|0 !== 0
            }
        };

        return new LiveComment(obj);
    }
    
    LiveComment.fromPlainXml = _fromPlainXml;
    module.exports = LiveComment;
});