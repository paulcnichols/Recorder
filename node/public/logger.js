function logger(args) {
    // set members
    if (!args || !args.server)
        throw "server required!";
    this.server = args.server;
    if (args.onconnect)
        this.onconnect = args.onconnect;
    else
        this.onconnect = function () {};
    if (args.ondisconnect)
        this.ondisconnect = args.ondisconnect;
    else
        this.ondisconnect = function () {};
    if (args.onmessage)
        this.onmessage = args.onmessage;
    else
        this.onmessage = function () {};

    // connect function
    this.connect = function () {
        var self = this;
        
        // connect to socket
        this.socket = io.connect(args.server);

        // setup onconnect
        this.socket.on('connect', function (arg) { 
           self.connected = true;
           self.onconnect(arg);
        });
        
        // setup ondisconnect
        this.socket.on('disconnect', function (arg) {
            self.connected = false;
            self.ondisconnect(arg);
        });

        // setup on message;
        this.socket.on('message', function (arg) { 
            self.onmessage(arg);
        });
        
        return this;
    }

    // data function
    this.send = function(msg) {
        this.socket.send(msg);
    };
    
    this.connect(args);
}
