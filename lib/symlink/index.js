'use strict';

var through2 = require('through2');
var fs = require('graceful-fs');
var prepareWrite = require('../prepare-write');

function symlink(outFolder, opt) {
  function linkFile(file, enc, cb) {
    var srcPath = file.path;
    var symType = (file.isDirectory() ? 'dir' : 'file');
    prepareWrite(outFolder, file, opt, function(err) {
      if (err) {
        return cb(err);
      }
      fs.symlink(srcPath, file.path, symType, function(err) {
        if (err && err.code !== 'EEXIST') {
          return cb(err);
        }
        cb(null, file);
      });
    });
  }

  var stream = through2.obj(opt, linkFile);
  // TODO: option for either backpressure or lossy
  stream.resume();
  return stream;
}

module.exports = symlink;
