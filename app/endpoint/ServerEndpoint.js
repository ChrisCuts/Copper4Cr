/* 
*  Server Endpoint for one given client (e.g. extension or page)
*
*  The following state transitions are legal
*
*     STATE_CONNECTED            (Register)
*          |  Λ
* register |  | unregister
*          V  |
*  STATE_UDP_SOCKET_READY        (Send, Receive, Unregister, Disconnect)
*             |
* disconnect  |
*             V
*   STATE_DISCONNECTED
*/
Copper.ServerEndpoint = function(port, id){
	if (!port || !Number.isInteger(id)){
		throw new Error("Illegal Arguments");
	}
	this.port = port;
	this.id = id;
	
	let thisRef = this;

	this.eventCallback = function(event){
		return thisRef.dispatchEvent(event);
	};
	Copper.Event.registerCallback(this.eventCallback);

	this.state = Copper.ServerEndpoint.STATE_CONNECTED;
	Copper.Log.logFine("Server Endpoint " + this.id + " created");
};

/* State constants */
Copper.ServerEndpoint.STATE_CONNECTED = 0;
Copper.ServerEndpoint.STATE_UDP_SOCKET_READY = 1;
Copper.ServerEndpoint.STATE_DISCONNECTED = 2;

/* prototype */
Copper.ServerEndpoint.prototype.port = undefined;
Copper.ServerEndpoint.prototype.id = undefined;
Copper.ServerEndpoint.prototype.state = undefined;
Copper.ServerEndpoint.prototype.udpClient = undefined;
Copper.ServerEndpoint.prototype.eventCallback = undefined;

Copper.ServerEndpoint.prototype.dispatchEvent = function(event){
	if (!Number.isInteger(event.type)){
		throw new Error("Illegal Arguments");
	}
	if (event.receiver === this.id){
		try {
			switch(event.type){
				case Copper.Event.TYPE_ERROR:
					Copper.Log.logError("Error on endpoint " + this.id + ": " + event.data.errorMessage);
					return true;
				case Copper.Event.TYPE_CLIENT_DISCONNECTED:
					return this.onDisconnect();
				case Copper.Event.TYPE_REGISTER_CLIENT:
					return this.onRegisterClient(event.data.remoteAddress, event.data.remotePort, event.sender);
				case Copper.Event.TYPE_UNREGISTER_CLIENT:
					return this.onUnregisterClient(event.sender);

				case Copper.Event.TYPE_SEND_COAP_MESSAGE:
					return this.onClientSendCoapMessage(event.data.coapMessage, event.sender);

				case Copper.Event.TYPE_CLIENT_REGISTERED:
				case Copper.Event.TYPE_COAP_MESSAGE_RECEIVED:
					return false;

				default:
					Copper.Log.logWarning("Unknown event type " + event.type);
					return false;
			}
		} catch (exception) {
			this.onServerEndpointException(exception, event.sender);
			return true;
		}
		return true;
	}
};

Copper.ServerEndpoint.prototype.onServerEndpointException = function(exception, receiver){
	Copper.Log.logError("Error on endpoint " + this.id + ": " + exception.message);
	this.port.sendClientMessage(Copper.Event.createErrorEvent(exception.message, false, receiver, this.id));
	this.onDisconnect();
};

Copper.ServerEndpoint.prototype.onDisconnect = function(){
	if (this.state !== Copper.ServerEndpoint.STATE_DISCONNECTED){
		this.state = Copper.ServerEndpoint.STATE_DISCONNECTED;
		if (this.udpClient !== undefined){
			this.udpClient.close();
			this.udpClient = undefined;
		}
		Copper.Event.removeEventsForReceiver(this.id);
		Copper.Event.unregisterCallback(this.eventCallback);
		Copper.Log.logFine("Server Endpoint " + this.id + " closed");
		this.port.disconnect();
		this.port = undefined;
	}
	return true;
};

Copper.ServerEndpoint.prototype.onRegisterClient = function(remoteAddress, remotePort, receiver){
	if (this.state !== Copper.ServerEndpoint.STATE_CONNECTED){
		this.port.sendClientMessage(Copper.Event.createErrorEvent("Illegal State", this.state === Copper.ServerEndpoint.STATE_UDP_SOCKET_READY, receiver, this.id));
	}
	else if (this.udpClient !== undefined){
		// we are already connecting
		this.port.sendClientMessage(Copper.Event.createErrorEvent("Illegal State", true, receiver, this.id));
	}
	else {
		this.udpClient = this.port.createUdpClient(remoteAddress, remotePort);
		let thisRef = this;
		this.udpClient.bind(function(bindSuccessful){
								if (bindSuccessful){
									thisRef.state = Copper.ServerEndpoint.STATE_UDP_SOCKET_READY;
									thisRef.port.sendClientMessage(Copper.Event.createClientRegisteredEvent(receiver, thisRef.id));
								}
								else {
									thisRef.port.sendClientMessage(Copper.Event.createErrorEvent("Error creating the socket", false, receiver, thisRef.id))
								}
							},
							function(datagram, remoteAddress, remotePort){
								thisRef.onReceiveDatagram(datagram, remoteAddress, remotePort);
							},
							function(socketOpen){
								thisRef.onReceiveDatagramError(socketOpen);
							}
		);
	}
	return true;
};

Copper.ServerEndpoint.prototype.onUnregisterClient = function(receiver){
	if (this.state !== Copper.ServerEndpoint.STATE_UDP_SOCKET_READY){
		this.port.sendClientMessage(Copper.Event.createErrorEvent("Illegal State", false, receiver, this.id));
	}
	else {
		if (this.udpClient !== undefined){
			this.udpClient.close();
			this.udpClient = undefined;
		}
		this.state === Copper.ServerEndpoint.STATE_CONNECTED;
		Copper.Log.logFine("Server Endpoint " + this.id + ": Client unregistered");
	}
	return true;
};

Copper.ServerEndpoint.prototype.onClientSendCoapMessage = function(coapMessage, receiver){
	if (this.state !== Copper.ServerEndpoint.STATE_UDP_SOCKET_READY){
		this.port.sendClientMessage(Copper.Event.createErrorEvent("Illegal State", false, receiver, this.id));
	}
	else {
		this.udpClient.send(Copper.CoapMessageSerializer.serialize(coapMessage));
	}
};

// -------- UDP Socket -----------
Copper.ServerEndpoint.prototype.onReceiveDatagram = function(datagram, remoteAddress, remotePort){
	let result = Copper.CoapMessageSerializer.deserialize(datagram);
	this.port.sendClientMessage(Copper.Event.createReceivedCoapMessageEvent(result.message, result.warnings, result.error, remoteAddress, remotePort, datagram.byteLength, 0, this.id));
};

Copper.ServerEndpoint.prototype.onReceiveDatagramError = function(socketOpen){
	this.port.sendClientMessage(Copper.Event.createErrorEvent("Receive Error", socketOpen, 0, this.id));
	if (!socketOpen){
		this.onDisconnect();
	}
};