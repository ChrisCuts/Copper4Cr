/* Implementation of the UDP Client interface for the Copper Chrome Application. 
*
*  Should be used in the following cycle:
*  1. let udp = new Copper.ChromeUdpClient(string remotehost, number remoteport, Copper.Options options)
*  2. udp.bind(function onReady, function onReceive, function onError)
*  3. udp.send(ArrayBuffer datagram, function callback)
*  4. udp.shutdown()
*/

Copper.ChromeUdpClient = function(remotehost, remoteport){
	if (typeof(remotehost) !== "string" || !Number.isInteger(remoteport) || remoteport <= 0x0 || remoteport > 0xFFFF) {
		throw new Error("Illegal Arguments");
	}
	this.remotehost = remotehost;
	this.remoteport = remoteport;
	this.state = Copper.ChromeUdpClient.STATE_CREATED;
}

/* State Constants */
Copper.ChromeUdpClient.STATE_CREATED = 0;
Copper.ChromeUdpClient.STATE_READY = 1;
Copper.ChromeUdpClient.STATE_STOPPED = 2;

/* Properties */
Copper.ChromeUdpClient.prototype.remotehost = undefined;
Copper.ChromeUdpClient.prototype.remoteport = undefined;
Copper.ChromeUdpClient.prototype.state = undefined;

/* Callbacks */
Copper.ChromeUdpClient.prototype.onReceiveCallback = undefined;
Copper.ChromeUdpClient.prototype.onReceiveErrorCallback = undefined;

/* SocketId (set while socket is bind) */
Copper.ChromeUdpClient.prototype.socketId = undefined;

/* Binds the socket to a local port. Calls onBind function once the socket is bound.
*  @arg function onBind(boolean successful)
*  @arg function onReceive(ArrayBuffer datagram, string remoteAddress, int remotePort)
*  @arg function onReceiveError(boolean socketOpen)
*/
Copper.ChromeUdpClient.prototype.bind = function(onBind, onReceive, onReceiveError){
	if ((onBind !== undefined && typeof(onBind) !== "function") || (onReceive !== undefined && typeof(onReceive) !== "function") 
		|| (onReceiveError !== undefined && typeof(onReceiveError) !== "function")){
		throw new Error("Illegal Arguments");
	}

	let thisRef = this;

	chrome.sockets.udp.create(null, function(createInfo){
		thisRef.socketId = createInfo.socketId;

		chrome.sockets.udp.onReceive.addListener(function(info){
			thisRef.onReceive(info);
		});
		chrome.sockets.udp.onReceiveError.addListener(function(info){
			thisRef.onReceiveError(info);
		});
		
		chrome.sockets.udp.bind(createInfo.socketId, "0.0.0.0", 0, function(resultCode){
			if (resultCode >= 0){
				thisRef.state = Copper.ChromeUdpClient.STATE_READY;
				thisRef.onReceiveCallback = onReceive;
				thisRef.onReceiveErrorCallback = onReceiveError;
			}
			else {
				Copper.Log.logError("Error " + resultCode + " while binding udp socket.");
			}
			if (onBind !== undefined){
				onBind(resultCode >= 0);
			}
		});
	});
};

/**
* Sends a datagram 
* @arg datagram: array buffer to send
* @arg onSent(boolean successful, int bytesSent)
*/
Copper.ChromeUdpClient.prototype.send = function(datagram, onSent){
	if (!(datagram instanceof ArrayBuffer)){
		throw new Error("Illegal Arguments");
	}
	if (this.state !== Copper.ChromeUdpClient.STATE_READY){
		throw new Error("Socket not ready");
	}
	let thisRef = this;
	chrome.sockets.udp.send(this.socketId, datagram, this.remotehost, this.remoteport, function(sendInfo) {
		if (sendInfo.resultCode < 0){
			Copper.Log.logError("Error " + sendInfo.resultCode + " while sending data on udp socket.");
		}
		else {
			Copper.Log.logInfo("Sent " + sendInfo.bytesSent + " bytes to " + thisRef.remotehost + ":" + thisRef.remoteport);	
		}
		if (typeof(onSent) === "function"){
			onSent(sendInfo.resultCode >= 0, sendInfo.bytesSent);
		}
	});
};

/* Closes the socket, releases resources */
Copper.ChromeUdpClient.prototype.shutdown = function() {
	this.state = Copper.ChromeUdpClient.STATE_STOPPED;
	if (this.socketId !== undefined){
		chrome.sockets.udp.close(this.socketId, function(){
			this.socketId = undefined;
		});
	}
};


/* ------ Implementation -------- */
Copper.ChromeUdpClient.prototype.onReceive = function(info){
	if (info.socketId === this.socketId){
		Copper.Log.logInfo("Received " + info.data.byteLength + " bytes from " + info.remoteAddress + ":" + info.remotePort);
		if (this.onReceiveCallback !== undefined){
			this.onReceiveCallback(info.data, info.remoteAddress, info.remotePort);
		}
	}
};

Copper.ChromeUdpClient.prototype.onReceiveError = function(info){
	if (info.socketId === this.socketId){
		Copper.Log.logError("Error " + info.resultCode + " while receiving data on udp socket.");
		let thisRef = this;
		chrome.sockets.udp.getInfo(info.socketId, function(socketInfo){
			if (!(socketInfo.localPort > 0)) {
				thisRef.shutdown();
			}
			if (thisRef.onReceiveErrorCallback !== undefined){
				thisRef.onReceiveErrorCallback(thisRef.state === Copper.ChromeUdpClient.STATE_READY);
			}
		});
	}
};