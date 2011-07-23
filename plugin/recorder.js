
// add the main panel to contact the log server
chrome.experimental.devtools.panels.create(
    "Recorder", 
    "recorder.png", 
    "recorder-gui.html", 
    function(panel) { 
    }
);

