
var crypto = require('crypto');


exports.md5 = function(str) {
  return crypto
      .createHash('md5')
      .update(str)
      .digest('hex');
};

/**
 * Imply "http://" for `url`.
 */

exports.url = function(url){

  if (~url.indexOf('://')) {
    return url;
  }

  return 'http://' + url;
};
/**
 * MD5 the given `str`.
 */