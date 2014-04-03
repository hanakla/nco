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
 *  - movie:Object -- 動画情報
 *      - id:string -- 動画ID
 *      - title:string -- 動画タイトル
 *      - length:number -- 動画の長さ（秒）
 *      - thumbnail:string -- サムネイル画像のURL
 *      
 *      - groupType:string -- 不明
 *      - lastResponse:string -- 最近投稿されたコメントの一部
 *      - isDeleted:boolean -- 削除されているか
 *      
 *      - updateTime:Date -- この情報の最終更新日時（？）
 *      - firtsRetrieve:Date -- 動画投稿日
 *      
 *      - count:Object -- カウンタ系の情報が詰められたオブジェクト
 *          - view:number -- 再生数
 *          - comments:number -- コメント数
 *          - mylist:number -- マイリスト数
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
            var item = obj.item_data;
            
            return {
                id: obj.item_id|0,
                type: obj.item_type|0,
                description: obj.description,
                watch: obj.watch,
                
                createTime: new Date(obj.create_time * 1000),
                updateTime: new Date(obj.update_time),
                
                movie: {
                    id: item.video_id,
                    
                    title: item.title,
                    length: item.length_seconds|0, // 秒数
                    thumbnail: item.thumbnail_url,
                    
                    groupType: item.group_type,
                    lastResponse: item.last_res_body,
                    isDeleted: item.deleted !== "0",
                    
                    updateTime: new Date(item.update_time * 1000),
                    firtsRetrieve: new Date(item.first_retrieve * 1000),
                    
                    count: {
                        view: item.view_counter|0,
                        comments: item.num_res|0,
                        mylist: item.mylist_counter|0
                    }
                }
            };
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