/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ生放送のコメント情報モデル。
 * Backbone.Modelを継承しています。
 * 
 * !このクラスは直接インスタンス化できません。
 * !LiveComment.fromPlainXmlメソッドを通してインスタンス化を行います。
 * 
 * Methods
 *  - LiveComment.fromPlainXml(xml:string) -- 生レスポンスからLiveCommentインスタンスを生成します。
 *  - isControl():boolean -- コメントが運営の制御コメントか判定します。
 *  - isDistributorPost():boolean -- コメントが配信者のものか判定します。
 *  - isMyPost():boolean -- コメントが自分で投稿したものか判定します。
 *  + Backbone.Model メソッド
 * 
 * Properties
 *  - threadId:number -- コメントサーバー内のスレッドID
 *  - date:Date -- コメント投稿日時
 *  - locale:string -- 投稿元国情報("ja-jp", "jp"など、詳細不明)
 *  - command:string -- コメント投稿時に設定されたコマンド(184など)
 *  - isMyPost -- 自分で投稿したコメントか
 *  - user:Object -- 投稿したユーザー情報
 *      - id:number|string -- ユーザー番号(匿名コメントの場合は文字列）
 *      - score:number -- このユーザーのNGスコア
 *      - accountType:number -- アカウント種別(0:一般, 1:プレミアム, 3:配信者)
 *      - isPremium:boolean -- プレミアム会員かどうか
 *      - isAnonymous:boolean -- 匿名コメントかどうか
 */
define(function (require, exports, module) {
    "use strict";
    
    var Backbone = require("thirdparty/backbone");
    
    var REGEXP_LT = /</g,
        REGEXP_GT = />/g;
    
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
                "accountType": -1,
                "isPremium": false,
                "isAnonymous": false
            }
        },
        
        isControl: function () {
            var userid = this.get("user").id,
                accountType = this.get("user").accountType;
            
            return userid === 900000000 || userid === 0 || accountType === 6;
        },
        
        isDistributorPost: function () {
            return this.get("user").accountType === 3;
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
            comment: $xml.text().replace(REGEXP_GT, ">").replace(REGEXP_LT, "<"),
            
            isMyPost: $xml.attr("yourpost") === "1",

            user: {
                id: $xml.attr("user_id"),
                score: $xml.attr("score")|0,
                accountType: $xml.attr("premium")|0,
                isPremium: ($xml.attr("premium")|0) > 0,
                isAnonymous: $xml.attr("anonymity")|0 !== 0
            }
        };
        
        if (obj.user.id .match(/^[0-9]*$/)) {
            obj.user.id = obj.user.id|0;
        }
        
        return new LiveComment(obj);
    }
    
    exports.fromPlainXml = _fromPlainXml;
});