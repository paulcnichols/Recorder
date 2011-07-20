function layout() {

    // create controls
    var log_server = INPUT({style:'width:200', valid:false, value:'http://localhost:3000'});
    var session_name = INPUT({style:'width:200', value: new Date().getTime()});
    var button = BUTTON({recording:false}, "Validate Server");

    // create message passing channel to extension
    var port = chrome.extension.connect({name: "devtools-gui"})
    port.onMessage.addListener(function(rsp) {
        // log server validated
        if (rsp.msg == 'connected_log_server') {
            log_server.valid = true;
            log_server.disabled = true;
            setStyle(log_server, {color:'black'});
            replaceChildNodes(button, "START");
            setStyle(button, {color:'green'});

            // hook into the all powerful onFinished event to get the HAR entry
            chrome.experimental.devtools.resources.onFinished.addListener(function(resource) {
                if (button.recording) {
                    resource.getContent(function (content, encoding) {
                        if (!content) content = '';
                        if (!encoding) encoding = '';
                        port.postMessage({msg:'har_ready',
                                          session_name:session_name.value, 
                                          har:resource, 
                                          content:content, 
                                          encoding:encoding});
                    });
                }
            });
        }
        // failed to validate log_server or disconnected mid-stream
        else if (rsp.msg == 'bad_log_server') {
            log_server.valid = false;
            log_server.disabled = false;
            setStyle(log_server, {color:'red'});
            session_name.disabled = false;
            button.recording = false;            
            replaceChildNodes(button, "Validate Server");

            // remove hook to avoid bogging down chrome
            chrome.experimental.devtools.resources.onFinished.removeListener();
        }
    });

    // hook up hot key to validate server
    connect(log_server, "onkeyup", function (k) {
        if (!k || k.key().string != 'KEY_ENTER') 
            return;

        port.postMessage({msg:'validate_log_server', server:log_server.value});
    });


    // hook up button to start logging
    connect(button, "onclick", function () {
        // currently recording, stop it
        if (button.recording) {
            replaceChildNodes(button, "START");
            setStyle(button, {color:'green'});
            button.recording = false;
            session_name.disabled = false;
        }
        // not recording... either start or validate server
        else {
            if (log_server.valid) {
                replaceChildNodes(button, "STOP");
                setStyle(button, {color:'red'});
                button.recording = true;
                session_name.disabled = true;
            }
            else {
                port.postMessage({msg:'validate_log_server', server:log_server.value});
            }
        }
    });

    // create layout
    var tbl = TABLE({},
                TR({},
                    TD({}, STRONG({}, "Log Server:")),
                    TD({}, log_server)),
                TR({},
                    TD({}, STRONG({}, "Session Name:")),
                    TD({}, session_name)),
                TR({},
                    TD(),
                    TD({}, button)));

    // add the layout to the main body
    document.body.appendChild(tbl);
}

