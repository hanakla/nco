/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * マイリストマイリストグループ（一つのリスト）のコレクションです。
 * Backbone.Collectionを継承しています。
 * 
 * Methods
 *  - attr(attr:string) -- マイリストの属性（プロパティ）を取得します。
 * Events
 * Properties
 *  attrメソッドを介して取得します。（とりあえずマイリストの場合、属性は一切設定されません。）
 *      Ex. mylist.attr("id") // -> マイリストIDを取得
 *  - id:number -- マイリストID
 *  - name:string -- リスト名
 *  - description:string -- マイリストの説明
 *  - public:boolean -- 公開マイリストかどうか
 *  - iconId:number
 *  - defaultSort:number 
 *  - sortOrder:number
 *  - userId:number -- ユーザー番号
 *  - createTime:Date -- マイリストの作成日
 *  - updateTime:Date -- マイリストの更新日
 */
define(function (require, exports, module) {
    "use strict";
    
    var _           = require("thirdparty/lodash"),
        Backbone    = require("thirdparty/backbone"),
        NicoUrl     = require("../impl/NicoUrl"),
        MyListItem  = require("./MyListItem"),
        StringUtil  = require("utils/StringUtil");
    
    function MyListGroup(groupInfo) {
        Backbone.Collection.apply(this);
        
        if (groupInfo) {
            this._attributes = {
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
            };
        }
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
        console.log(this);
        this.fetch();
    };
    
    MyListGroup.prototype.attr = function (attr) {
        return this._attributes[attr];
    };
    
    MyListGroup.prototype.fetch = function () {
        var self = this,
            dfd = $.Deferred(),
            url;
        
        // "通常のマイリスト" か "とりあえずマイリスト"か
        // （URLが違うけどレスポンス形式は同じ）
        if (this.attr("id") !== -1) {
            url = StringUtil.format(NicoUrl.MyList.GET_GROUP_CONTENTS, this.attr("id"));
        } else {
            url = NicoUrl.MyList.DefList.GET_CONTENTS;
        }
        
        $.ajax({url:url, dataType:"json"})
            .done(function (resp) {
                if (resp.status !== "ok") {
                    dfd.reject();
                }
                
                _.each(resp.mylistitem, function (item) {
                    self.add(MyListItem.fromApiResult(item));
                });
            });
        
        return dfd.promise();
    };
    
    module.exports = MyListGroup;
});