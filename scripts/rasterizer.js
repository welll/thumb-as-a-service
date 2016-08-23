/*
 * phantomjs rasteriser server
 *
 * Usage:
 *   phantomjs rasterizer.js [basePath] [port] [defaultViewportSize]
 *
 * This starts an HTTP server waiting for screenshot requests
 */

var system = require('system');

//http://phantomjs.org/api/fs
var fs = require('fs');


if (system.args.length !== 4) {
    console.log('Usage: phantomjs rasterize.js temp_path port size');
    console.log('  temp_path examples: "C:/temp" or /opt/mobiliza/temp');
    console.log('  port examples: 3001');
    console.log('  size "800x600"');
    phantom.exit(1);
}

console.log("Script initialized with: %j", system.args);

var basePath = system.args[1];
var port = system.args[2];

var defaultViewportSize = system.args[3];

defaultViewportSize = defaultViewportSize.split('x');

defaultViewportSize = {
    width: ~~defaultViewportSize[0] || 1024,
    height: ~~defaultViewportSize[1] || 600
};

var pageSettings = ['javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled', 'userAgent', 'userName', 'password'];

var server, service;

server = require('webserver').create();


service = server.listen(port, { keepAlive: false },  function (request, response) {

    var temp = request.url.split('?');
    var route = temp[0];


    console.log('Handling Route:'+ route);


    if (route === '/health-check') {
        response.statusCode = 200;
        response.write('Ok =)');
        response.close();
        return;
    }

    if (route === '/url') {

        var fileName = temp[1];
        var page = new WebPage();

        var path = basePath + fileName.replace(new RegExp('https?://'), '').replace(/\//g, '.') + '_' + Date.now() + '_.png';
        var url = basePath + fileName;

        var format = 'png';
        var quality = -1;

        //@DIOGO, aqui setamos o content, mas nada eh feito pra indicar que deu
        //certo o carregamento, talvez eu deveria injetar um script na pagina

        //page.setContent(body);
        console.log('URL: ' + url);
        console.log('Path:' + path);

        page.onResourceError = function (resourceError) {
            page.error_reason = resourceError.errorString;
        };

        page.onLoadFinished = function(status) {
            console.log('onLoadFinished - Status: ' + status);


            // Do other things here...
        };

        // http://phantomjs.org/api/webpage/method/open.html
        // pens the url and loads it to the page. Once the page is loaded,
        // the optional callback is called using page.onLoadFinished,
        // and also provides the page status
        // to the function ('success' or 'fail').


        page.open(url, function (status) {

            console.log('Page.Open - callback');
            console.log('Page.Open -  Args status: ' + status);

            if (status === 'success') {

                console.log('Page.Open - Calling page.render');
                page.render(path);

                console.log('Page.Open - Calling page.release');
                page.release();

                console.log('Page.Open - Calling fs.exists');
                if (!fs.exists(path)) {
                    response.statusCode = 500;
                    response.write('Error');
                    response.close();
                    return;
                }

                //TEMPORARIO
                console.log('path:', path);
                response.statusCode = 200;
                response.write(path);
                response.close();

                /*

                 Diogo, isso aqui nao roda na versao do node do servidor :(,
                 mas estou vendo isso


                 console.log('Page.Open - Calling fs.size');

                 var size = fs.size(path);
                 console.log('Page.Open - size: ', size);


                 //response.encoding = 'binary';
                 response.statusCode = 200;

                 response.headers = {
                    'Content-Type': 'image/'+format,
                    'Content-Disposition': 'inline',
                    'Content-Length': size
                 };

                 //console.log('Headers: %j', response.headers);

                /*page.onLoadStarted = function () {  */

                 //console.log('Page loaded page...');
                 /*var readStream = fs.open(path, 'r');

                 while(!readStream.atEnd()) {
                    var line = readStream.readLine();
                    response.write(line);
                 }

                 readStream.close();
                 response.close();
                 page.release();
                 */

                /*};*/

            } else {
                response.statusCode = 500;
                response.write('Error: Url returned status ' + status + ' - ' + page.error_reason + "\n");
                response.close();
            }


        });

        return;

    }

    if (route === '/body') {

        var page = new WebPage();

        if(!request.post && request.method !== 'POST'){
            response.statusCode = 500;
            response.write('Error - Body is mandatory');
            response.close();
            return;
        }

        //TODO dar warning se nao for content-type: www-url-encoded

        //var decoder = new StringDecoder('utf8');
        //decoder.write(request.post);
        //var body = request.post.toString('utf8'); /*
        /*var i = 0;

        for(var x in request.post){
            if(request.post.hasOwnProperty(x)){
                console.log('i: ', i++);

                var line = request.post[x];
                console.log('line: ', line);

                body += line;
            }
        }*/

        var body = request.postRaw;//.toString('utf8');
        console.log('Request Post: ', JSON.stringify(body) );

        var path = basePath + '_' + Date.now() + '_.png';

        var format = 'png';
        var quality = -1;

        console.log('Calling setContent');
        console.log('Path:' + path);

        var expectedLocation = 'http://www.mobiliza.com.br/';
        page.setContent(body, expectedLocation);


        console.log('Page.Open - callback');
        console.log('Page.Open -  Args status: ' + status);


        console.log('Page.Open - Calling page.render');
        page.render(path);

        console.log('Page.Open - Calling page.release');
        page.release();

        console.log('Page.Open - Calling fs.exists');

        if (!fs.exists(path)) {
            response.statusCode = 500;
            response.write('Error');
            response.close();
            return;
        }

        //TEMPORARIO
        console.log('path:', path);
        response.statusCode = 200;
        response.write(path);
        response.close();
        return;
    }

    response.statusCode = 500;
    response.write('Error - Path not found');
    response.close();
    // must start the response now, or phantom closes the connection
    //response.statusCode = 200;
    //response.write('');
});