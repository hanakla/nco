/*jslint node: true, devel: true, indent: 4, nomen: true, vars: true, plusplus: true, expr: true, eqnull:true, maxerr: 50 */
/*global $, define */

/**
 * マイリストマイリストグループ（一つのリスト）のコレクションです。
 * Backbone.Collectionを継承しています。
 * 
 * Methods
 *  - attr(attr:string) -- マイリストの属性（プロパティ）を取得します。
 *  - isDefaultList():boolean -- このリストが"とりあえずマイリスト"か判定します。
 *  - add(movie:NicoVideoInfo|string) -- マイリストに動画を追加します。
 *      引数には動画IDを指定することができます。（Backbone.Collection#addは実行されません。）
 * 
 * Events
 *  - Backbone.Collection で発生するイベント
 * 
 * Properties
 *  attrメソッドを介して取得します。（とりあえずマイリストの場合、属性は一切設定されません。）
 *      Ex. mylist.attr("id") // -> マイリストIDを取得
 *  - id:number -- マイリストID
 *  - name:string -- リスト名
 *  - description:string -- マイリストの説明
 *  - public:boolean -- 公開マイリストかどうか
 *  - iconId:number -- マイリストのアイコンID
 *  - defaultSort:number -- 標準のソート方法（？）
 *  - sortOrder:number -- ソート方式（？）
 *  - userId:number -- ユーザー番号
 *  - createTime:Date -- マイリストの作成日
 *  - updateTime:Date -- マイリストの更新日
 */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        NicoUrl     = require("../impl/NicoUrl"),
        NicoMyListApi = require("../impl/NicoMyListApi"),
        MyListItem  = require("./MyListItem"),
        OmittedMyListGroup = require("./OmittedMyListGroup"),
        StringUtil  = require("utils/StringUtil");
    
    var _instances = {};
    
    /**
     * マイリストマイリストグループ（一つのリスト）のコレクションです。
     * Backbone.Collectionを継承しています。
     * @param {OmittedMyListGroup} groupInfo マイリスト情報を持つ
     *    OmittedMyListGroupのインスタンス。
     */
    function MyListGroup(omitted) {
        this._attributes = omitted.toJSON();
        
        // 既存のインスタンスがあればそれを返す。
        if (_instances[this._attributes.id]) {
            return _instances[this._attributes.id];
        }
        
        // 適切なAPIのURLを注入する
        this._urlSet = this.isDefaultList() ?
                            NicoUrl.MyList.DefList :
                            NicoUrl.MyList.Normal;
        
        Backbone.Collection.apply(this);
    }
    
    // extend
    MyListGroup.prototype = Object.create(Backbone.Collection.prototype);
    MyListGroup.prototype.constructor = MyListGroup;
    MyListGroup.prototype.parentClass = Backbone.Collection.prototype;
    
    
    // デフォルトプロパティ
    MyListGroup.prototype._attributes = {
        id: -1,
        name: null,
        description: null,
        public: null,
        
        iconId: -1,
        defaultSort: -1,
        sortOrder: -1,
        userId: -1,
        
        createTime: null,
        updateTime: null,
    };
    
    //
    // メソッド
    //
    MyListGroup.prototype.initialize = function () {
        this.fetch();
    };
    
    MyListGroup.prototype.fetch = function (options) {
        var self = this,
            dfd = $.Deferred(),
            url;
        
        // "通常のマイリスト" か "とりあえずマイリスト"でパラメータが変わるけど
        // "とりあえずマイリスト"は、パラメータがなくなるだけだからこのままでおｋ
        url = StringUtil.format(this._urlSet.LIST, this.attr("id"));
        
        $.ajax({url:url, dataType:"json"})
            .done(function (resp) {
                if (resp.status !== "ok") {
                    dfd.reject(this.id + " 不明なエラー");
                }
                
                _.each(resp.mylistitem.reverse, function (item) {
                    var m = MyListItem.fromApiResult(item);
                    self.set(m, _.extend({merge: false}, options, {add: true, remove: false}));
                });
                
                dfd.resolve();
            });
        
        return dfd.promise();
    };
    
    MyListGroup.prototype.attr = function (attr) {
        return this._attributes[attr];
    };
    
    /**
     * マイリストに動画を追加します。
     * @param {NicoVideoInfo|string} movie 追加する、動画情報か動画ID
     * @param {?string} desc マイリストの動画メモの内容
     * @return {$.Promise} 動画の追加に成功すればresolve、失敗した時はエラーメッセージとともにrejectされます。
     */
    MyListGroup.prototype.add = function (movie, desc) {
        var self = this,
            dfd = $.Deferred(),
            id;
        
        // movieが文字列じゃない上に、オブジェクトじゃないとか、idプロパティがない場合
        if (typeof movie !== "string" && (!movie || movie.id == null)) {
            return $.Deferred().reject("動画IDが正しくありません").promise();
        } else {
            id = typeof movie === "string" ? movie : movie.id;
        }
        
        //-- 送信データを準備
        var data = {
            item_type:0,
            item_id: id,
            token: null,
            description: desc,
            group_id: this.attr("id")
        };
        
        // 不要なデータを削除
        typeof desc !== "string" && (delete data.description);
        this.isDefaultList() && (delete data.group_id);
        
        
        //-- APIと通信
        // アクセストークンを取得
        NicoMyListApi._fetchToken()
            // 通信エラー
            .fail(function (jqxhr, status, error) {
                dfd.reject(error);
            })
            
            // 受信成功
            .then(function (token) {
                data.token = token;
                return $.ajax({url: self._urlSet.ADD, type:"POST", data:data, dataType:"json"});
            })
            // APIの実行結果受信
            .done(function (res) {
                if (res.status === "ok") {
                    dfd.resolve();
                    window.list = self;
                } else {
                    dfd.reject(res.error.description);
                }
            });
        
        dfd.done(function () {
            // APIを叩き終わったら最新の情報に更新
            self.fetch();
        });
        
        return dfd.promise();
    };
    
    /**
     * このマイリストが"とりあえずマイリスト"か検証します。
     * @return {boolean} とりあえずマイリストならtrueを返します。
     */
    MyListGroup.prototype.isDefaultList = function () {
        return this.attr("id") === "default";
    };
    
    module.exports = MyListGroup;
});