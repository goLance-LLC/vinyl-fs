'use strict';

var path = require('path');
var os = require('os');

var fs = require('graceful-fs');
var pumpify = require('pumpify');
var through = require('through2');
var valueOrFunction = require('value-or-function');
var koalas = require('koalas');
var lead = require('lead');
var mkdirpStream = require('fs-mkdirp-stream');

var fo = require('../file-operations');
var prepare = require('./prepare');

var number = valueOrFunction.number;
var boolean = valueOrFunction.boolean;

var isWindows = (os.platform() === 'win32');

function symlink(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  function linkFile(file, enc, callback) {
    // Fetch the path as it was before prepare.dest()
    var srcPath = file.history[file.history.length - 2];

    var isDirectory = file.isDirectory();

    // This option provides a way to create a Junction instead of a
    // Directory symlink on Windows. This comes with the following caveats:
    // * NTFS Junctions cannot be relative.
    // * NTFS Junctions MUST be directories.
    // * NTFS Junctions must be on the same file system.
    // * Most products CANNOT detect a directory is a Junction:
    //    This has the side effect of possibly having a whole directory
    //    deleted when a product is deleting the Junction directory.
    //    For example, JetBrains product lines will delete the entire
    //    contents of the TARGET directory because the product does not
    //    realize it's a symlink as the JVM and Node return false for isSymlink.
    var useJunctions = koalas(boolean(opt.useJunctions, file), (isWindows && isDirectory));

    var symDirType =  useJunctions ? 'junction' : 'dir';
    var symType = isDirectory ? symDirType : 'file';
    var isRelative = koalas(boolean(opt.relative, file), false);

    // This is done inside prepareWrite to use the adjusted file.base property
    if (isRelative && !useJunctions) {
      srcPath = path.relative(file.base, srcPath);
    }

    // Because fs.symlink does not allow atomic overwrite option with flags, we
    // delete and recreate if the link already exists and overwrite is true.
    if (file.flag === 'w') {
      // TODO What happens when we call unlink with windows junctions?
      fs.unlink(file.path, onUnlink);
    } else {
      fs.symlink(srcPath, file.path, symType, onSymlink);
    }

    function onUnlink(unlinkErr) {
      if (fo.isFatalUnlinkError(unlinkErr)) {
        return callback(unlinkErr);
      }
      fs.symlink(srcPath, file.path, symType, onSymlink);
    }

    function onSymlink(symlinkErr) {
      if (fo.isFatalOverwriteError(symlinkErr, file.flag)) {
        return callback(symlinkErr);
      }
      callback(null, file);
    }
  }

  function dirpath(file, callback) {
    var dirMode = number(opt.dirMode, file);

    callback(null, file.dirname, dirMode);
  }

  var stream = pumpify.obj(
    prepare(outFolder, opt),
    mkdirpStream.obj(dirpath),
    through.obj(linkFile)
  );

  // Sink the stream to start flowing
  return lead(stream);
}

module.exports = symlink;
