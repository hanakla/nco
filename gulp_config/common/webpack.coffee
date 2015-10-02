webpack = require "webpack"
option  = require "./gulp.coffee"

module.exports =
    watchDelay  : 500

    output      :
        filename            : "[name].js"
        sourceMapFilename   : "map/[file].map"
        publicPath          : "/js/"

    devtool     : "#source-map"

    target      : "atom"

    resolve     :
        root            : [
            "#{option.sourceDir}/renderer/scripts"
        ]
        extensions      : ["", ".coffee", ".js"]
        modulesDirectories  : [
            "bower_components"
            "node_modules"
        ]
        alias               :
            bower   : "bower_components"

    module                  :
        loaders     : [
            {test: /\.html$/,   loader: "html-loader"}
            {test: /\.coffee$/, loader: "coffee-loader"}
            {test: /\.jade$/,   loader: "jade-loader"}
            {test: /\.styl$/,   loader: "css-loader!stylus-loader"}
            {test: /\.cson$/,   loader: "cson-loader"}
            {test: /\.json$/,   loader: "json-loader"}
        ]

    plugins         : [
        new webpack.ResolverPlugin(new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("package.json", [ "main" ]))
        new webpack.ResolverPlugin(new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", [ "main" ]))
        new webpack.ResolverPlugin(new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("component.json", [ "main" ]))
        new webpack.optimize.AggressiveMergingPlugin
        new webpack.optimize.DedupePlugin
    ]
