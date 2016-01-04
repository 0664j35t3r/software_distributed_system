(function(exports)
{
    exports.dbsize = 100
    exports.authors = []
    exports.authors[0] = {}
    exports.authors[0].matNr     = ''
    exports.authors[0].firstName = ''
    exports.authors[0].lastName  = ''
    exports.authors[1] = {}
    exports.authors[1].matNr     = ''
    exports.authors[1].firstName = 'config.js must contain'
    exports.authors[1].lastName  = ''
    exports.authors[2] = {}
    exports.authors[2].matNr     = ''
    exports.authors[2].firstName = ''
    exports.authors[2].lastName  = 'matNr, firstname and lastname'
    exports.server = {}
    exports.server.wsport          = 1336
    exports.server.httpport        = 1337
    exports.server.requestProgress = 0.05
    exports.client = {}
    exports.client.reconnectIntervall = 300
    exports.client.overallTimeout   = 7000
    //exports.client.ttfbTimeout        = 500
    exports.client.responseTimeout    = 500
    //exports.client.cancelTimeout      = 500
    exports.client.requestProgress    = 0.02
    exports.client.highlightTime      = 1000    
    exports.colors = {}
    exports.colors.idle            = 'orange'
    exports.colors.requests        = '#FFD900' //'orange'
    exports.colors.delegates       = '#A5F7B8'
    exports.colors.canceling       = '#EAB0F1' //'#E1A0E8' //'orange'
    exports.colors.recovering      = '#FFD900'
    exports.colors.found           = '#80CCE6'
    exports.colors.compared        = '#A5F7B8'
    exports.colors.ok              = '#00CC66'
    exports.colors.canceled        = '#D167DE' //'#A9DA13'  //'#00CC66'
    exports.colors.fatal           = 'red'
    exports.colors.recoverable     = 'red'
    exports.colors.failed          = 'red'
    exports.colors.timeout         = 'red'
    exports.colors.entityInRange   = '#FFFFb0'
    exports.colors.entity          = '#fefefe'
    exports.colors.entityLoading   = 'red'
    exports.colors.disabledIcon    = 'lightgray'
    exports.colors.enabledIcon     = '#00CC66'

    exports.client.defaultSimConfig = {}
    //exports.client.defaultSimConfig.ignore     = { active:false, icon:'🖕',  text:'ignore cancel request'                                }
    exports.client.defaultSimConfig.net     = { active:true, icon:'☍',  text:'log network messages (net)'     } //ⶨ
    exports.client.defaultSimConfig.own     = { active:false, icon:'⥂',  text:'log your own log category messages ()\n...'    } //⇌
    exports.client.defaultSimConfig.app     = { active:true, icon:'⥴',   text:'log application messages (app)\nlogs when a search is started or requested' } //⚘

    exports.client.defaultSimConfig.delayed    = { active:true,  icon:'⏰', text:'visitRange works slowly',              value:50                          } //🐌⌛
    exports.client.defaultSimConfig.stopWork   = { active:false, icon:'☠',  text:'visitRange stops',                     pof:'atWork'       }
    exports.client.defaultSimConfig.exception  = { active:false, icon:'⚡',  text:'throw an exception',       value:'fatal', pof:'atWork'       }
    exports.client.defaultSimConfig.disconnect = { active:false, icon:'↛',  text:'disconnect',                  pof:'onRequest' }

    exports.server.defaultSimConfig = {}
    exports.server.defaultSimConfig.net     = { active:true, icon:'☍',  text:'log network messages (net)'     } //ⶨ
    exports.server.defaultSimConfig.own     = { active:false, icon:'⥂',  text:'log your own log category messages ()\n...'    } //⇌
    exports.server.defaultSimConfig.app     = { active:true, icon:'⥴',   text:'log application messages (app)\nlogs when a search is started or requested' } //⚘

    exports.server.defaultSimConfig.exception  = { active:false, icon:'⚡',  text:'throw an exception',       value:'fatal', pof:'atWork'       }

})
(typeof exports === 'undefined' ? this['config']={} : exports)
