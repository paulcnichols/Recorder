
// instance of a websocket to logging server
var lgr;

// requests to pages outside of devtool panel are not allowed from devtools page.  
// work around is to message the background page and then reply
chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(req) {
    
        // request to validate the log server
        if (req.msg == 'validate_log_server') {
        
            // must have valid server
            if (!req.server) 
                return;

            // make async request to load the resources
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {

                        // save the logging server
                        lgr_server = req.server;
            
                        // pull in sources
                        var includes = JSON.parse(xhr.responseText).includes;
                        var included = [];

                        var n = 0;
                        for (var i=0; i < includes.length; ++i) {
                            
                            // dynamically create script tags 
                            var head= document.getElementsByTagName('head')[0];
                            var script= document.createElement('script');
                            script.type= 'text/javascript';
                            script.src= req.server + includes[i];
                            script.onload = function () {
                                if (++n == includes.length) {
                                    // when the last script loads, instantiate a logger instance    
                                    var lgr_args = {
                                        server:req.server,
                                        onconnect:function() {
                                            port.postMessage({msg:'connected_log_server'});
                                        },
                                        ondisconnect:function() {
                                            port.postMessage({msg:'bad_log_server'});
                                        }
                                    }
                                    lgr = new logger(lgr_args);
                                }
                            };
                            head.appendChild(script);
                        }
                    }
                    else {
                        port.postMessage({msg:'bad_log_server'});
                    }
                }
            }
            xhr.open("GET", req.server + '/setup', true);
            xhr.send();
        }
        // forward har record to log server
        else if (req.msg == 'har_ready') {
                
            var hreq = req.har.request;
            var hrsp = req.har.response;

            // format request headers
            var hreq_hdr = [];
            hreq_hdr.push(hreq.method + ' ' + hreq.url + ' HTTP/1.1');
            for (var i=0; i < hreq.headers.length; ++i) {
                hreq_hdr.push(hreq.headers[i].name + '=' + hreq.headers[i].value);
            }
            hreq_hdr.push('');
            var hreq_hdr_str = hreq_hdr.join("\r\n");
            
            // send the outbound request
            lgr.send(JSON.stringify({
                session:req.session_name ? req.session_name : 'default',
                direction:'out',
                url:hreq.url,
                hdr:hreq_hdr_str,
                bdy:(hreq.method == 'POST') ? hreq.postData.text : '',
                bdy_encoding:''
            }));

            // format response headers
            var hrsp_hdr = [];
            hrsp_hdr.push('HTTP/1.1 ' + hrsp.status + ' ' + hrsp.statusText);
            for (var i=0; i < hrsp.headers.length; ++i) {
                hrsp_hdr.push(hrsp.headers[i].name + '=' + hrsp.headers[i].value);
            }
            hrsp_hdr.push('');
            var hrsp_hdr_str = hrsp_hdr.join("\r\n");
            
            // send the inbound response
            lgr.send(JSON.stringify({
                session:req.session_name ? req.session_name : 'default',
                direction:'in',
                url:hreq.url,
                hdr:hrsp_hdr_str,
                bdy:req.content,
                bdy_encoding:req.encoding
            }));
        }
    });
});

