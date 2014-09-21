/*
 * solrdex
 * https://github.com/sackio/solrdex
 *
 * Copyright (c) 2014 Ben Sack
 * Licensed under the MIT license.
 */

'use strict';

var Request = require('request')
  , _ = require('underscore')
  , Belt = require('jsbelt')
  , Async = require('async')
;

module.exports = function(O){
  var M = {};
  M.settings = Belt.extend({
    'host': '127.0.0.1'
  , 'port': '8080'
  , 'core': ''
  , 'path': '/solr'
  }, O);

  /*
    Throttle requests to Solr through this queue
  */
  M._client = Async.queue(function(task, cb){
    return Request(task.request, function(){
      task.callback.apply(this, arguments);
      return cb();
    });
  }, 1);

  /*
    Add / update documents
  */
  M['add'] = function(docs, options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      'commit': true
    });

    var d = Belt.toArray(docs);

    return M._client.push({'request': {
                             'method': 'POST'
                           , 'json': d
                           , 'url': M.settings.host + ':' + M.settings.port + M.settings.path + '/update'
                           , 'qs': {'commit': a.o.commit}
                           }
                         , 'callback': function(err, response, body){
                             return a.cb(err, body);
                           }
                          });
  };

  M['update'] = M.add; //alias of add

  /*
    Remove documents with ids (accepts single id or array)
  */
  M['delete'] = function(ids, options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      'commit': true
    });

    var i = Belt.toArray(ids);

    return M._client.push({'request': {
                             'method': 'POST'
                           , 'json': {'delete': i}
                           , 'url': M.settings.host + ':' + M.settings.port + M.settings.path + '/update'
                           , 'qs': {'commit': a.o.commit}
                           }
                         , 'callback': function(err, response, body){
                             return a.cb(err, body);
                           }
                          });
  };

  /*
    Query docs with a focus on flexible full-text searching
  */
  M['textSearch'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      'query_params': ['defType', 'sort', 'start', 'rows', 'fq', 'fl', 'timeAllowed'
                      , 'wt', 'cache', 'q', 'qf', 'mm', 'qs', 'pf', 'ps', 'pf2', 'ps2'
                      , 'pf3', 'ps3', 'bq', 'bf', 'tie', 'uf']
    , 'defType': 'edismax'
    , 'sort': 'score+desc'
    , 'wt': 'json'
    , 'cache': true
    , 'mm': '33%'
    });

    return M._client.push({'request': {
                             'method': 'GET'
                           , 'url': M.settings.host + ':' + M.settings.port + M.settings.path + '/select'
                           , 'qs': _.pick(a.o, a.o.query_params)
                           , 'json': true
                           }
                         , 'callback': function(err, response, body){
                             return a.cb(err, Belt._get(body, 'response.docs') || []);
                           }
                          });
  };

  return M;
};
