###*
# Nsenのチャンネル状態などを管理します。
#
# Objects
#  - エラーオブジェクト: {message:string}
#      このAPIのメソッドで返されたjQuery.Promiseオブジェクトがrejectされた時
#      この形式のオブジェクトを必ず返します。(resultプロパティはそのうち削除する）
#      messageにエラーメッセージが格納されています。
#
# Methods
#  - changeChannel(chId:string):$.Promise
#      チャンネルを変更します。chIdは"nsen/***"形式のチャンネルIDです。
#
#  - getCurrentVideo():NicoVideoInfo|null
#      現在再生中の動画情報を取得します。
#      （基本的にはこのメソッドを用いず、"videoChanged"イベントをリスニングしてください）
#
#  - getChannelType():string|null
#      チャンネルの種別を取得します。（nsen/***の"***"の部分だけ）
#
#  - getComments():Array.<LiveComment>|null
#      受信済みのコメントを全て取得します。
#
#  - pushRequest(video:NicoVideoInfo|string):$.Promise
#      リクエストを送信します。リクエストの送信が成功すればresolveされます。
#      失敗すればエラーオブジェクトとともにrejectされます。
#
#  - cancelRequest():$.Promise
#      リクエストをキャンセルします。
#      リクエストが送信されていない、もしくはキャンセルに失敗した場合はエラーオブジェクトとともにrejectされます。
#
#  - postComment(message:string, command:?string):$.Promise
#      コメントを送信します。messageにはコメントを渡し、commandには"184"などのコマンドを指定できます。
#
#  - pushGood():$.Promise
#      Goodを送信します。
#
#  - pushSkip():$.Promise
#      SkipRequestを送信します。
#
#  - isSkipRequestable():boolean
#      SkipRequestが送信できるか確認できます。
#      (スキップリクエストが利用可能になったことをを通知する"skipAvailable"イベントを利用できます。）
#
#  - moveToNextLive():$.Promise
#      次の配信の情報を受け取っていれば、次の配信へ切り替えを行います。
#
# Events
#  - channelChanged:(viewName:string, id:string, ch: NsenChannel)
#      チャンネルが変更された時に発火します。
#      viewName - チャンネル名
#      id - チャンネルID (nsen/***)
#      ch - 新しくアクティブ化されたチャンネルのハンドラオブジェクト
#
#  # Nsen
#   - streamChanged:(newLive:NicoLiveInfo)
#      午前４時過ぎ以降、内部で接続している放送が切り替えられたときに発火します。
#
#  - videoChanged:(next:NicoVideoInfo|null, before:NicoVideoInfo|null, ch:NsenChannel)
#      再生中の動画が変わった時に発火します。
#      第２引数に変更後の動画の情報が渡され、
#      第３引数には変更前の動画の情報が渡されます。
#
#  - skipAvailable: ()
#      スキップリクエストが利用可能になったことを通知します。
#
#  # コメント
#  - receiveComment:(comment:LiveComment)
#      コメントを受信した際に発火します。
#
#  - receiveRawXml:(response:String)
#      コメントサーバーからレスポンスを受け取った際に発火します。
#      XMLノードの文字列が渡されます。
#
#  # リクエスト
#  - sendRequest:(video: NicoVideoInfo)
#      リクエストが完了した時に発火します。第１引数にリクエストされた動画の情報が渡されます。
#
#  - cancelRequest:(video: NicoVideoInfo)
#      リクエストがキャンセルされた時に発火します。第１引数にキャンセルされた動画の情報が渡されます。
#
#  # Good & Skip
#  - sendGood:(ch:NsenChannel)
#      Goodが送信された時に発火します。
#
#  - sendSkip:(ch:NsenChannel)
#      SkipRequestが送信された時に発火します。
#
#  - receiveGood:(ch:NsenChannel)
#      誰かがGoodを送信した時に発火します。
#
#  - receiveMyList:(ch:NsenChannel)
#      誰かが動画をマイリストに追加した時に発火します。
#
#  # 切断
#  - closing:(liveId:string, ch:NsenChannel)
#      午前４時くらいから送られ始める、更新リクエストを受け取った時に発火します。
#      第２引数は移動先の放送IDです。
#
#  - closed:(ch:NsenChannel)
#      配信が終了した時に発火します。
###
define (require, exports, module) ->
    $           = require "jquery"
    _           = require "underscore"
    Global      = require "utils/Global"
    Backbone    = require "backbone"
    NicoApi     = global.require "node-nicovideo-api"

    nsenChannels = JSON.parse require "text!./NsenChannels.json"
    _instance = null


    class ChannelMediator
        _.extend @::, Backbone.Events


        _api             : null

        ###*
        # 現在アクティブなチャンネルの配信情報オブジェクト
        # @type {NicoLiveInfo}
        ###
        _live               : null

        ###*
        # 現在アクティブなチャンネルのCommentProvider
        # @type {CommentProvider}
        ###
        _commentProvider    : null

        ###*
        # 現在アクティブなNsenチャンネルハンドラ
        # @type {NsenChannel}
        ###
        _nsenChannel        : null

        ###*
        # 各オブジェクトへのイベントリスナ
        # @type {Object}
        ###
        _listeners  :
            # NicoLiveInfo object event listeners
            live        :
                sync        : ->
                    console.log "live info sync"

            # CommentProvider object event listeners
            comment     :
                add         : (comment) ->
                    @trigger "receiveComment", comment

                receive     : (response) ->
                    @trigger "receiveRawXML",  response

            # NsenChannel object event listeners
            nsen    :
                ###*
                # 配信が切り替えられた時のリスナ
                # 古い関連オブジェクトと関係を切り、新しい関連オブジェクトと関係を繋ぎます。
                ####
                streamChanged   : () ->
                    # 前の配信のイベントリスナを切断
                    #@_stopListening()
                    #delete @_listeners

                    ## オブジェクトを差し替え
                    #@_listeners         = {}
                    #@_live              = @_nsenChannel.getLiveInfo()
                    #@_commentProvider   = @_live.getCommentProvider()

                    ## 新しい配信のイベントをリスニング
                    #@_startListening()

                    ## イベントを発火
                    #@trigger "streamChanged", @_live

                videochanged    : (before, after) ->
                    @trigger "videoChanged", before, after

                sendRequest     : (video) ->
                    @trigger "sendRequest", video

                cancelRequest  : (video) ->
                    @trigger "cancelRequest", video

                sendGood        : ->
                    #@trigger "sendGood", @_nsenChannel

                sendSkip        : ->
                    #@trigger "sendSkip", @_nsenChannel

                receiveGood     : ->
                    #@trigger "receiveGood", @_nsenChannel

                receiveMyList   : ->
                    #@trigger "receiveMyList", @_nsenChannel

                skipAvailable   : ->
                    #@trigger "skipAvailable", @_nsenChannel

                closing         : ->
                    @trigger "closing", @_nsenChannel

                ended           : ->
                    #@trigger "closed", @_nsenChannel


        dispose         : () ->
            delete @_live
            delete @_commentProvider
            delete @_nsenChannel


        ###*
        # 関係オブジェクトのイベントをリスニングします。
        ###
        _startListening     : () ->
            console.info "ChannelManager: リスナーを接続します"

            _.each ChannelMediator::_listeners.live, (fn, event) ->
                 @_listeners.live[event] = fn = _.bind fn, @
                 @_live.on event, fn
                 return
            , @

            _.each ChannelMediator::_listeners.comment, (fn, event) ->
                @_listeners.comment[event] = fn = _.bind fn, @
                @_commentProvider.on event, fn
                return
            , @

            _.each ChannelMediator::_listeners.nsen, (fn, event) ->
                @_listeners.nsen[event] = fn = _.bind fn, @
                @_nsenChannel.on event, fn
                return
            , @

            console.info "ChannelManager: リスナーを接続しました"


        ###*
        # 関係オブジェクトのイベントリスニングを停止します。
        ###
        _stopListening      :  ->
            console.info "ChannelManager: リスナーを切断します。"
            if @_live?
                _.each @_listeners.live, (fn, ev) ->
                    @_live.off ev, fn
                    return
                , @

            if @_commentProvider?
                _.each @_listeners.comment, (fn, ev) ->
                    @_commentProvider.off ev, fn
                    return
                , @

            if @_nsenChannel?
                _.each @_listeners.nsen, (fn, ev) ->
                    @_nsenChannel.off ev, fn
                    return
                , @

            console.info "ChannelManager: リスナーを切断しました。"


        setApi          : (api) ->
            @_api = api


        ###*
        # チャンネルを変更します。
        # @param {string} chId チャンネルID(nsen/***)
        # @return {$.Promise}
        ###
        changeChannel       : (chId) ->
            self    = @
            dfd     = $.Deferred()
            ch      = _.findWhere nsenChannels, {id: chId}

            if not ch
                console.error "存在しないチャンネルです。(id: %s)", chId
                return dfd.reject("存在しないチャンネルです。(id: " + chId + ")").promise()

            unless @_api?
                console.error "ログインされていません"
                return dfd.reject("ログインしていません").promise()

            @_api.live.getLiveInfo ch.id
                .then (liveInfo) ->
                    self._stopListening() # 前のチャンネルのイベントリスニングを停止

                    self._live               = liveInfo
                    self._commentProvider    = liveInfo.commentProvider()
                    self._nsenChannel        = self._api.live.getNsenChannelHandlerFor self._live

                    self._startListening() # 現在のチャンネルをイベントリスニング

                    dfd.resolve()
                    self.trigger "channelChanged", ch.name, ch.id, self._nsenChannel

                    console.info "ChannelManager: チャンネルの変更に成功しました"

                , (err) ->
                    console.info "生放送情報の取得に失敗しました。", err

            return dfd.promise()


        ###*
        # 現在再生中の動画を取得します。
        # チャンネルが選択されていない場合などでnullを返すことがあります。
        # 基本的にはこのメソッドを用いず、代わりに"videoChanged"イベントをリスニングしてください。
        # @return {?NicoVideoInfo}
        ###
        getCurrentVideo     : () ->
            if not @_nsenChannel?
                return null

            return @_nsenChannel.getCurrentVideo()


        #
        # チャンネルの種別を取得します。（nsen/***の"***"の部分だけ）
        # @param {?string}
        #
        getChannelType      : () ->
            if not @_nsenChannel?
                return null

            return @_nsenChannel.getChannelType()


        #
        #  受信済みのコメントを全て取得します。
        # @param {?Array.<LiveComment>}
        #
        getComments         : () ->
            if not @_nsenChannel?
                return null

            return _.clone @_commentProvider.models


        #
        # リクエストを送信します。
        # @param {NicoVideoInfo|string} movie リクエストする動画の動画情報か、動画ID
        # @return {$.Promise}
        #
        pushRequest         : (movie) ->
            if not @_nsenChannel?
                m = "チャンネルが選択されていません"
                return $.Deferred().reject(m).promise()

            self    = @
            waiter  = null

            if typeof movie is "string"
                waiter = $.Deferred()

                self._api.video.getVideoInfo movie
                    .then (videoInfo) ->
                        self._nsenChannel.pushRequest videoInfo
                            .then waiter.resolve
                            .catch waiter.reject

                    .catch waiter.reject

            else if movie.isCorrect?()
                waiter = @_nsenChannel.sendRequest movie
            else
                console.error("不正な引数です。読み込み済みNicoVideoInfoか、動画IDである必要があります。", movie)

                waiter = $.Deferred()
                    .reject "不正な引数です。読み込み済みNicoVideoInfoか、動画IDである必要があります。"
                    .promise()

            return waiter.promise()


        #
        # リクエストをキャンセルします。
        # @return {$.Promise}
        #
        cancelRequest       : () ->
            if not @_nsenChannel?
                m = "チャンネルが選択されていません"
                return $.Deferred().reject(m).promise()

            return @_nsenChannel.cancelRequest()


        #
        # コメントを送信します。
        # @param {string} message 送信するコメント
        # @param {?string} command 同時に送るコマンド(184, shitaなど)
        # @return {$.Promise}
        #
        postComment         : (message, command) ->
            if not @_nsenChannel?
                m = "チャンネルが選択されていません"
                return $.Deferred().reject(m).promise()

            dfd = $.Deferred()

            @_commentProvider.postComment(message, command)
                .then ->
                    dfd.resolve()
                , (err) ->
                    dfd.reject err

            return dfd.promise()

        #
        # Goodを送信します。
        # @return {$.Promise}
        #
        pushGood            : () ->
            if not @_nsenChannel?
                m = "チャンネルが選択されていません"
                return $.Deferred().reject(m).promise()

            console.log "send good"

            return @_nsenChannel.pushGood().then ->
                console.log "done"
            , ->
                console.error "fail", arguments

        #
        # Skipを送信します。
        # @return {$.Promise}
        #
        pushSkip            : () ->
            if not @_nsenChannel?
                m = "チャンネルが選択されていません"
                return $.Deferred().reject(m).promise()

            return @_nsenChannel.pushSkip()


        #
        # スキップを再送信可能か調べます。
        # @param {boolean}
        #
        isSkipRequestable   : () ->
            return !!(@_nsenChannel && @_nsenChannel.isSkipRequestable())


        #
        # 次のチャンネル情報を受信していれば、その配信へ移動します。
        # @return {jQuery.Promise} 成功すればresolveされ、失敗した時にrejectされます。
        #
        moveToNextLive      : () ->
            if not @_nsenChannel?
                m = "チャンネルが選択されていません"
                return $.Deferred().reject(m).promise()

            return @_nsenChannel.moveToNextLive()


    module.exports = new ChannelMediator()
