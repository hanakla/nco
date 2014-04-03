/*jslint node: true, vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, expr: true */

/**
 * ニコニコ動画APIのURLを定義しています。
 */
define(function (require, exports, module) {
    "use strict";
   
    exports.Auth = {
        LOGIN: "https://secure.nicovideo.jp/secure/login?site=niconico",
        LOGOUT: "https://secure.nicovideo.jp/secure/logout",
        LOGINTEST: "http://live.nicovideo.jp/api/getplayerstatus/nsen/vocaloid"
    };
    
    exports.Live = {
        // URL + 放送ID
        GET_PLAYER_STATUS: "http://live.nicovideo.jp/api/getplayerstatus/",
        
        // パラメータ: コメントスレッドID
        GET_POSTKEY: "http://live.nicovideo.jp/api/getpostkey?thread=%s",
        
        // パラメータ: 放送ID, 動画ID
        NSEN_REQUEST: "http://live.nicovideo.jp/api/nsenrequest?v=%s&id=%s",
        // パラメータ: 放送ID
        NSEN_REQUEST_CANCEL: "http://live.nicovideo.jp/api/nsenrequest?v=%s&mode=cancel",
        // パラメータ: 放送ID
        NSEN_REQUEST_SYNC: "http://live.nicovideo.jp/api/nsenrequest?v=%s&mode=requesting",
        // パラメータ: 放送ID
        NSEN_GOOD: "http://ow.live.nicovideo.jp/api/nsengood?v=%s",
        // パラメータ: 放送ID
        NSEN_SKIP: "http://ow.live.nicovideo.jp/api/nsenskip?v=%s"
    };
    
    exports.Video = {
        // URL + 動画ID
        GET_VIDEO_INFO: "http://ext.nicovideo.jp/api/getthumbinfo/"
    };
    
    exports.MyList = {
        FETCH_TOKEN: "http://www.nicovideo.jp/my/mylist",
        GET_GROUPS: "http://www.nicovideo.jp/api/mylistgroup/list",
        
        DefList: {
            LIST: "http://www.nicovideo.jp/api/deflist/list",
            
            // フォームデータ: item_type, item_id, token, ?description
            ADD: "http://www.nicovideo.jp/api/deflist/add",
        },
        
        Normal: {
            // パラメータ: マイリストID
            LIST: "http://www.nicovideo.jp/api/mylist/list?group_id=%s",
            
            ADD: "http://www.nicovideo.jp/api/mylist/add",
        }
    };
});