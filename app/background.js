﻿chrome.app.runtime.onLaunched.addListener(function() {
	
	Copper.Log.registerLogger(Copper.ConsoleLogger.log);

	let endpointId = 1;
	chrome.runtime.onConnectExternal.addListener(function(port) {
		let externalid = undefined;
		if (port.sender){
			externalid = port.sender.id ? port.sender.id : port.sender.url;
		}
		Copper.Log.logFine("new connection from extension, app or website" + (externalid !== undefined ? (" (" + externalid + ")") : ""));
		let newEndpointId = endpointId++;
		new Copper.ServerEndpoint(new Copper.ChromeServerPort(port, newEndpointId), newEndpointId);
	});

	Copper.Log.logFine("Listening for new connection...");
});