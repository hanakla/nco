/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * マイリストの項目モデルです。
 * Backbone.Modelを継承しています。
 * Properties
 *  - id:number -- マイリスト項目ID
 *  - type:number -- 項目の種類（動画、静画など）
 *  - description:string -- マイリストコメント
 *  - createTime:Date -- 追加日
 *  - updateTime:Date -- 更新日（？）
 *  - watch:number -- 不明
 *  - movie:NicoVideoInfo -- 動画情報
 */
define(function (require, exports, module) {
    "use strict";
    
    var _               = require("thirdparty/lodash"),
        NicoVideoInfo   = require("./NicoVideoInfo");
    
    var ItemType = {
        movie: 0,
        seiga: 5
    };
    
    var MyListItem = Backbone.Model.extend({
        defaults: {
            id: -1,
            type: -1,
            description: null,
            createTime: null,
            updateTime: null,
            watch: 0,
            
            movie: null,
        },
        parse: function (obj) {
            var movie = new NicoVideoInfo(obj.item_data.watch_id);
            movie.fetch();
            
            return {
                id: obj.item_id|0,
                type: obj.item_type|0,
                description: obj.description,
                createTime: new Date(obj.create_time * 1000),
                updateTime: new Date(obj.update_time),
                watch: obj.watch,
                movie: movie
            }
        },
        
        fetch: _.noop,
        sync: _.noop,
        save: _.noop,
        destroy: _.noop
    },{
        fromApiResult: function (obj) {
            var m = new MyListItem(obj, {parse: true});
            return m;
        },
        ItemType: ItemType
    });
    
    module.exports = MyListItem;
});