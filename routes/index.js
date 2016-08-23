var utils = require('../lib/utils');
var join = require('path').join;
var fs = require('fs');
var path = require('path');
var request = require('request');

module.exports = function(app, useCors) {

    var rasterizerService = app.settings.rasterizerService;
    var fileCleanerService = app.settings.fileCleanerService;

    // routes
    app.post('/', function(req, res, next) {

        if (!req.rawBody){
            res.writeHead(400);
            res.end('Bad Request');
            return;
        }
        var body = req.rawBody;
        console.log('Raw Body: ', body);

        // required options

        var fileName = '_temp_html_' + Date.now() + '_.html';
        var filePath = join(rasterizerService.getPath(), fileName);

        var options = {
            uri: 'http://localhost:' + rasterizerService.getPort() + '/url?'+fileName
        };


        console.log('Request for %s - Rasterizing it', filePath);


        fs.writeFile(filePath, body, function(err) {

            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");

            callRasterizer(options, function(error, imagePath) {

                if (error){
                    res.writeHead(500);
                    res.end('Internal Server Error');
                    return;
                }

                console.log('Sending image in response');

                if (useCors) {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Expose-Headers", "Content-Type");
                }

                res.sendfile(imagePath, function(err) {

                    if(err){
                        console.log('Fail to send: ', imagePath);
                        return;
                    }

                    console.log('Sended the image: ', imagePath);

                });
            });

        });


    });



    var callRasterizer = function(rasterizerOptions, callback) {

        console.log('callRasterizer - request.get');

        request.get(rasterizerOptions, function(error, response, body) {

            console.log('callRasterizer - callback');

            if (error || response.statusCode !== 200) {

                //if(error) {
                //    console.log('Error while requesting the rasterizer: %s', error.message);
                //}
                //rasterizerService.restartService();

                return callback(new Error(body));

            }

            console.log('Body from response:', body);

            /*else if (body.indexOf('Error: ') === 0) {

                var errmsg = body.substring(7);
                console.log('Error while requesting the rasterizer: %s', errmsg);

                return callback(new Error(errmsg));
            }*/

            callback(null, body);
        });
    };


};
