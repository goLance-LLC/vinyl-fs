'use strict';

var path = require('path');

var fo = require('../../file-operations');

function writeSymbolicLink(file, optResolver, onWritten) {
  var srcPath = file.symlink;

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
  var useJunctions = optResolver.resolve('useJunctions', file);

  var symDirType =  useJunctions ? 'junction' : 'dir';
  var symType = isDirectory ? symDirType : 'file';
  var isRelative = optResolver.resolve('relative', file);

  // This is done inside prepareWrite to use the adjusted file.base property
  if (isRelative && !useJunctions) {
    srcPath = path.relative(file.base, srcPath);
  }

  var flag = optResolver.resolve('flag', file);

  var opts = {
    flag: flag,
    type: symType,
  };

  fo.symlink(srcPath, file.path, opts, onWritten);
}

module.exports = writeSymbolicLink;
