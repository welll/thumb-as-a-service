/*
 * phantomjs rasteriser server
 *
 * Usage:
 *   phantomjs rasterizer.js [basePath] [port] [defaultViewportSize]
 *
 * This starts an HTTP server waiting for screenshot requests
 */

var system = require('system');

if (system.args.length !== 4) {
  console.log('Usage: phantomjs rasterize.js temp_path port size');
  console.log('  temp_path examples: "C:/"');
  console.log('  port examples: 3001');
  console.log('  size "800x600"');
  phantom.exit(1);
}

console.log("Script initialized with: %j", system.args);

var basePath = system.args[1];

var port  = system.args[2];

var defaultViewportSize = system.args[3];
defaultViewportSize = defaultViewportSize.split('x');
defaultViewportSize = {
  width: ~~defaultViewportSize[0] || 1024,
  height: ~~defaultViewportSize[1] || 600
};

var pageSettings = ['javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled', 'userAgent', 'userName', 'password'];

var server = require('webserver').create();

/*
 * Screenshot service
 *
 * Generate a screenshot file on the server under the basePath
 *
 * Usage:
 * GET /
 * url: http://www.google.com
 *
 * Optional headers:
 * filename: google.png
 * width: 1024
 * height: 600
 * clipRect: { "top": 14, "left": 3, "width": 400, "height": 300 }
 *
 * If path is omitted, the service creates it based on the url, removing the
 * protocol and replacing all slashes with dots, e.g
 * http://www.google.com => www.google.com.png
 *
 * width and height represent the viewport size. If the content exceeds these
 * boundaries and has a non-elastic style, the screenshot may have greater size.
 * Use clipRect to ensure the final size of the screenshot in pixels.
 *
 * All settings of the WebPage object can also be set using headers, e.g.:
 * javascriptEnabled: false
 * userAgent: Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+
 */


var page = new WebPage();

page.onResourceError = function(resourceError) {
  page.error_reason = resourceError.errorString;
};

var service = server.listen(port, function(request, response) {
  
  if (request.url === '/healthCheck') {

    console.log('healthCheck');

    response.statusCode = 200;
    response.write('up');
    response.close();
    return;
  }
  
  if (!request.headers.url) {

    response.statusCode = 400;
    response.write('Error: Request must contain an url header' + "\n");
    response.close();
    return;
  }

  var body = '<html><head><link rel="stylesheet" type="text/css" href="//s3-sa-east-1.amazonaws.com/mobiliza-prod-static/clients-nocache/01bd766/mobiliza/padraoClean/./css/geral.css"> \
      </head> \
      <body> \
      <div class="wrapper"> \
      <div id="slider" class="middle" style="width: 980px; height: 540px;"> \
      <div class="swipe-wrap" style="width: 980px;"><div style="width: 980px; height: 540px; left: 0px; "> \
      <div class="resource"><div class="imagem" id="57a33d648151e9ce08206e79" style="position: absolute; top: 237px; left: 194px; height: 212px; width: 283px; z-index: 3; opacity: 1;"> \
      <div class="trow"> \
      <div class="tcell"> \
      <div id="imageWrapper" class=""> \
      <img src=" http://s3-sa-east-1.amazonaws.com/mobiliza-apl/clients/mobiliza/courses/57a21ee48151e9ce08206814/snp/57a21ef18151e9ce08206817/57a21f018151e9ce08206818/r57a33d648151e9ce08206e79/57a33d648151e9ce08206e79_src.jpg?update=1470315903648  "> \
      <span class="glyphicon glyphicon-picture"></span> \
      </div> \
      </div> \
      </div> \
      </div></div><div class="resource"><div class="imagem" id="57a21f038151e9ce0820681a" style="position: absolute; top: 219px; left: 565px; height: 212px; width: 283.043px; z-index: 2; opacity: 1;"> \
      <div class="trow"> \
      <div class="tcell"> \
      <div id="imageWrapper" class=""> \
      <img src=" http://s3-sa-east-1.amazonaws.com/mobiliza-apl/clients/mobiliza/courses/57a21ee48151e9ce08206814/snp/57a21ef18151e9ce08206817/57a21f018151e9ce08206818/r57a21f038151e9ce0820681a/57a21f038151e9ce0820681a_src.jpg?update=1470250544175  "> \
      <span class="glyphicon glyphicon-picture"></span> \
      </div> \
      </div> \
      </div> \
      </div></div><div class="resource"><div id="57a21f028151e9ce08206819" class="texto normal semFundo" style="position: absolute; width: 284px; top: 103px; left: 75px; z-index: 1; opacity: 1;"> \
      <div class="pontaBalao"></div> \
      <div class="tagP" style=""> \
      Lorem ipsum Aliqua nostrud occaecat anim elit culpa ut magna velit esse deserunt. \
      </div> \
      </div></div></div></div> \
      </div></div></body></html>';

  var url = request.headers.url;
  var path = basePath + (request.headers.filename || (url.replace(new RegExp('https?://'), '').replace(/\//g, '.') + '.png'));

  var delay = request.headers.delay || 0;
  
  try {

    page.viewportSize = {
      width: request.headers.width || defaultViewportSize.width,
      height: request.headers.height || defaultViewportSize.height
    };

    if (request.headers.clipRect) {
      page.clipRect = JSON.parse(request.headers.clipRect);
    }

    for (name in pageSettings) {
      if (value = request.headers[pageSettings[name]]) {
        value = (value == 'false') ? false : ((value == 'true') ? true : value);
        page.settings[pageSettings[name]] = value;
      }
    }

  } catch (err) {
    response.statusCode = 500;
    response.write('Error while parsing headers: ' + err.message);
    return response.close();
  }


  page.setContent(body, function(){

    page.render(path);
    response.write('Success: Screenshot saved to ' + path + "\n");
    page.release();
    response.close();
   
  });


  /*page.open(url, function(status) {

    console.log('page.open - ' + status);
    console.log('path: ' + path);

    if (status == 'success') {

      window.setTimeout(function () {
        page.render(path);
        response.write('Success: Screenshot saved to ' + path + "\n");
        page.release();
        response.close();
      }, delay);

    } else {

      response.write('Error: Url returned status ' + status + ' - ' + page.error_reason + "\n");
      page.release();
      response.close();

    }

  });*/
  
  // must start the response now, or phantom closes the connection
  response.statusCode = 200;
  response.write('');
});
