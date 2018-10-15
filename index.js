#!/usr/bin/env node

'use strict';

var fs = require('fs'),
  minimist = require('minimist'),
  proxy = require('http-proxy').createProxyServer();

var argv = minimist(process.argv.slice(2), {
  alias: {
    target: 't',
    port: 'p',
    header: 'h',
    Header: 'H',
    'x-forward': 'x',
    'x-forward-head': 'X',
    'access-control': 'a',
    'access-control-head': 'A'
  },
  boolean: ['ssl', 'x-forward', 'access-control']
});

if (argv.help) {
  showHelpMessage();
  return;
}

if (!argv.target) {
  console.error('target is empty');
  process.exit(-1);
}

if (!argv.port) {
  console.error('port is empty');
  process.exit(-2);
}

var headers = {};
if (argv.header) {
  argv.header.split('&').forEach(function (x) {
    var array = x.split('=');
    if (array.length == 2) {
      headers[array[0]] = array[1];
    }
  });
}
if (argv['x-forward-head']) {
  argv['x-forward-head'].split('&').forEach(function (x) {
    var array = x.split('=');
    if (array.length == 2) {
      headers['x-forwarded-' + array[0]] = array[1];
    }
  });
}

var Headers;
if (argv['access-control']) {
  Headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'get, post, put, delete, patch, head, options'
  }
  var webPass = require('http-proxy/lib/http-proxy/passes/web-incoming');
  var webStream = webPass.stream;
  webPass.stream = function (req, res) {
    if (req.method !== 'OPTIONS' || req.url !== '/') {
      return webStream.apply(webPass, arguments);
    }
    for (var x in Headers) {
      res.setHeader(x, Headers[x]);
    }
    res.setHeader('content-length', '0');
    res.statusCode = 204;
    res.end();
  }
}
if (argv['access-control-head']) {
  Headers = Headers || {};
  argv['access-control-head'].split('&').forEach(function (x) {
    var array = x.split('=');
    if (array.length == 2) {
      Headers['access-control-' + array[0]] = array[1];
    }
  });
}
if (argv.Header) {
  Headers = Headers || {};
  argv.Header.split('&').forEach(function (x) {
    var array = x.split('=');
    if (array.length == 2) {
      Headers[array[0]] = array[1];
    }
  });
}

var ssl;
if (argv.ssl) {
  ssl = {};
  if (!argv['ssl-key'] || !fs.existsSync(argv['ssl-key'])) {
    console.error('ssl key is not found');
    process.exit(-3);
  }
  else {
    ssl.key = fs.readFileSync(argv['ssl-key']);
  }

  if (!argv['ssl-cert'] || !fs.existsSync(argv['ssl-cert'])) {
    console.error('ssl cert is not found');
    process.exit(-4);
  }
  else {
    ssl.cert = fs.readFileSync(argv['ssl-cert']);
  }
}

if (process.env.http_proxy) {
  require('global-tunnel-ng').initialize();
}

var http = require('http');
var proxy = require('http-proxy').createProxyServer({
  target: argv.target,
  headers: headers,
  ssl: ssl,
  xfwd: argv['x-forward'],
  agent: http.globalAgent
});
if (Headers) {
  proxy.on('proxyRes', function (proxyRes) {
    for (var x in Headers) {
      proxyRes.headers[x] = Headers[x];
    }
  })
}
proxy.listen(argv.port);

console.log('http' + (argv.ssl ? 's' : '')  + ' proxy started on http' + (argv.ssl ? 's' : '') + '://localhost:' + argv.port);

function showHelpMessage() {
  console.log('Usage: proxy -p <port> -t <target> [options...]');
  console.log();
  console.log('Options:');
  console.log('  -a, --access-control      Auto add Access-Control-* headers to response (Allow-Origin/Allow-Methods)');
  console.log('  -A, --access-control-head Add Access-Controll-* headers to response');
  console.log('  -h, --head                Add headers to request');
  console.log('  -H, --Head                Add headers to response');
  console.log('  -p, --port                Set listening port');
  console.log('  -t, --target              Set target url');
  console.log('  -x, --x-forward           Auto add X-Forwarded-* headers to request (For/Proto/Host/Port)');
  console.log('  -X, --x-forward-head      Add X-Forwarded-* headers to request');
}
