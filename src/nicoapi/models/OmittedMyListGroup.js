/*jslint node: true, devel: true, indent: 4, nomen: true, vars: true, plusplus: true, expr: true, eqnull:true, maxerr: 50 */
/*global define */

/**
 * マイリストグループ（一つのリスト）のモデルです。
 * このモデル自体はマイリストを操作することはできません。
 * 
 * Methods
 *  - attr(attr:string) -- 指定したプロパティの値を取得します。
 *  - isDefaultList():boolean -- このリストが"とりあえずマイリスト"か判定します。
 *  - getMyListGroup():MyListGroup -- オブジェクトと対応するMyListGroupインスタンスを取得します。
 *  - toJSON():Object -- インスタンスのプロパティを複製します。
 * 
 * Events
 *  イベントはありません。
 * 
 * Properties
 *  attrメソッドを介して取得します。（とりあえずマイリストの場合,idとname以外設定されません。）
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
    
    var _ = require("thirdparty/underscore");
    
    /**
     * 簡略なMyList情報モデル
     * @param {Object} groupInfo マイリスト情報（MylistAPI形式）
     * @param {function(OmittedMyListGroup)} fnGetMyListGroup
     *    MyListGroupインスタンスを取得するための関数。
     * @constructor
     */
    function OmittedMyListGroup(groupInfo, fnGetMyListGroup) {
        var attr;
        
        if (groupInfo) {
            attr = _.defaults({
                id: groupInfo.id|0,
                name: groupInfo.name,
                description: groupInfo.description,
                public: (groupInfo.public|0) === 1,

                iconId: groupInfo.icon_id|0,
                defaultSort: groupInfo.default_sort|0,
                sortOrder: groupInfo.sort_order|0,
                userId: groupInfo.user_id|0,

                createTime: new Date(groupInfo.create_time * 1000),
                updateTime: new Date(groupInfo.update_time * 1000)
            }, this.defaults);
        } else {
            attr =_.defaults({id: "default", name: "とりあえずマイリスト"}, this.defaults);
        }
        
        this._attributes = attr;
        this.getMyListGroup = fnGetMyListGroup.bind(null, this);
        this.id = attr.id;
    }
    
    // extend
    /*
    MyListGroup.prototype = Object.create(Backbone.Model.prototype);
    MyListGroup.prototype.constructor = MyListGroup;
    MyListGroup.prototype.parentClass = Backbone.Model.prototype;
    */
    
    // デフォルトプロパティ
    OmittedMyListGroup.prototype.defaults = {
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
    /**
     * 指定したプロパティの値を取得します。
     * @param {string} attr プロパティ名
     */
    OmittedMyListGroup.prototype.get = function (attr) {
        return this._attributes[attr];
    };
    
    /**
     * このマイリストが"とりあえずマイリスト"か検証します。
     * @return {boolean} とりあえずマイリストならtrueを返します。
     */
    OmittedMyListGroup.prototype.isDefaultList = function () {
        return this.attr("id") === "default";
    };
    
    /**
     * オブジェクトと対応するMyListGroupインスタンスを取得します。
     * @return {$.Promise}
     */
    OmittedMyListGroup.prototype.getMyListGroup = function () {
        // インスタンス化する時に実装される
        throw new Error("getMyListGroupメソッドが実装されていません");
    };
    
    /**
     * インスタンスのプロパティを複製します。
     * @return {Object}
     */
    OmittedMyListGroup.prototype.toJSON = function () {
        return _.clone(this._attributes);
    };
    
    module.exports = OmittedMyListGroup;
});