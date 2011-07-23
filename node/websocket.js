//
// set up the application
//
var express = require("express");
var app = express.createServer();

app.configure(
    function() {
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        //app.set('view options', {layout:false});
        app.use(express.static(__dirname + '/public'));
    }
);

app.get('/setup', function(req, res) {
    res.send(JSON.stringify({includes:['/socket.io/socket.io.js',
                                       '/logger.js']}), 200);
});

app.get('*', function(req, res) {
    res.send('What are you looking for?', 404);
});

app.post("*", function(req, res) {
    res.send('What are you looking for?', 404);
});

app.listen(3000);

/* Someday this code below will hook into the classify Websense URL classify tool.

//
// function to classify a url
//
var net = require('net');

function classify(port, server, url, header, body, callback) {
    var bin = require('binary');    
    var socket = new net.createConnection(port, server);

    // connection finished, write request
    socket.on('connect', function () {
        
        // hdr
        var msg = bin.put();
        msg.word32be(0);            // err
        msg.word32be(3);            // msg - R_MSG_CONTENT_SCAN_REQ
        msg.word32be(0);            // size (not used)
        msg.word32be(0);            // version (not used)
        msg.word32be(0);            // rsv

        // msg
        msg.word32be(0);            // cat
        msg.word16be(url.length);   // url-len
        msg.put(url);               // url        
        msg.word32be(header.length);// header-len
        msg.pad(header);            // header
        msg.word32be(body.length);  // body-len
        msg.pad(body);              // body
        msg.word8be(1);             // rtcc
        msg.word8be(1);             // rtss
        msg.word8be(1);             // ad_ar
        msg.word8be(1);             // ae
        for (var i=0; i < 12; ++i)  // reserved
            msg.word8be(1);

        msg.write(socket);
    });

    // setup reading the response        
    var stream = bin.stream(socket);
    stream
    .word32bu('rc')
    .word32bu('cmd')
    .word32bu('size')
    .word32bu('version')
    .word32bu('rsv')
    .word32bu('cat')
    .word16bu('url-len')
    .tap(function (vars) {
    });
}

//
// set up the web socket
//
var fs = require('fs');
var crypto = require('crypto');
var io = require('socket.io').listen(app);

// setup listening socket
io.sockets.on('connection', function (socket) {
    socket.on('message', function (data) {

        // data received
        try {
            var obj = JSON.parse(data);
            if (!obj) return;
            if (!obj.session) obj.session = 'default';
            if (!obj.stamp) obj.stamp = (new Date()).getTime();

            // create a connection to wsl classify to scan content
            
            });
            
        } catch (err) {
            console.log(err);
        }
    });
});

*/

/* Code below is for logging content bodies.  */

// create initial directory for session data
var SESSION_ROOT = '/tmp/recorder/'
fs.mkdir(SESSION_ROOT, 0777, function (err) {
    if (err && err.code != 'EEXIST') {
        console.log(err);
        throw "Failed to create root session directory!";
    }

    // setup listening socket
    io.sockets.on('connection', function (socket) {
        socket.on('message', function (data) {

            // data received
            try {
                var obj = JSON.parse(data);
                if (!obj) return;
                if (!obj.session) obj.session = 'default';
                if (!obj.stamp) obj.stamp = (new Date()).getTime();

                // make session directory
                var SESSION_DIR = SESSION_ROOT + obj.session;
                fs.mkdir(SESSION_DIR, 0777, function (err) {
                    if (err && err.code != 'EEXIST') {
                        console.log(err);
                        throw "Failed to create directory for session: " + obj.session;
                    }

                    // take hash of url
                    var hash = crypto.createHash('sha1').update(obj.url).digest('hex');
                    
                    // append to the log file
                    fs.createWriteStream(SESSION_DIR + '/log', {'flags': 'a'}).write(
                        [obj.stamp, hash, obj.direction, obj.url].join("\t") + "\n"
                    );

                    // write the header
                    var hdr = SESSION_DIR + '/' + [obj.stamp, hash, obj.direction, 'hdr'].join('.');
                    fs.writeFile(hdr, obj.hdr, 'binary');
                    
                    // write the body
                    var bdy = SESSION_DIR + '/' + [obj.stamp, hash, obj.direction, 'bdy'].join('.');
                    fs.writeFile(bdy, new Buffer(obj.bdy, obj.bdy_encoding));
                    
                });
            } catch (err) {
                console.log('Unexpected crash!');
                console.log(err);
            }
        });

        socket.on('disconnect', function (c) {
            console.log(' is disconnecting...');
        });
    });
});



