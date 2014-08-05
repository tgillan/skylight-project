/**
 * file.js represents a list of Node.js filesystem utility functions
 * author: Tony Gillan
 * version: 0.1
 * date: 27/05/14
 * requires: 
 */
var fs = require('fs');

var writeFileAsync = function(filename, text) {
	var output = null;
	if (filename!==undefined && filename!==null && text!==undefined && text!==null) {
		fs.writeFile(filename, text, function(err) {
			if (err) {
				console.log('> writeFileAsync() error: %s', err);
			} else {
				console.log('> writeFileAsync() complete.');
			}
		});
	}
	return output;
};


/**
 * make functions public to node
 */
module.exports.writeFileAsync = writeFileAsync;


