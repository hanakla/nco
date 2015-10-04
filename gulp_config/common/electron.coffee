path    = require "path"
config  = require "./gulp"
pjson   = require path.join(__dirname, "../../package.json")

module.exports =
    dir         : config.buildDir
    name        : pjson.name
    platform    : "darwin"
    arch        : "all"
    version     : "0.33.4"

    out                 : "publish/"
    icon                : null
    "app-bundle-id"     : null
    "app-version"       : pjson.version
    "helper-bundle-id"  : null
    ignore              : null
    prune               : true
    overwrite           : true
    asar                : false
    "sign"              : null
    "version-string"    :
        CompanyName         : pjson.author
        LegalCopyright      : null
        FileDescription     : null
        OriginalFilename    : null
        FileVersion         : pjson.version
        ProductVersion      : pjson.version
        ProductName         : pjson.productName
        InternalName        : null
