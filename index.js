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
    'x-forward': 'x'
  },
  boolean: ['ssl', 'x-forward']
});

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
if (argv.Header) {
  argv.Header.split('&').forEach(function (x) {
    var array = x.split('=');
    if (array.length == 2) {
      headers['x-forwarded-' + array[0]] = array[1];
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
proxy.listen(argv.port);

console.log('http' + (argv.ssl ? 's' : '')  + ' proxy started on http' + (argv.ssl ? 's' : '') + '://localhost:' + argv.port);
