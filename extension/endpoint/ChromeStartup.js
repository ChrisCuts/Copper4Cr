/*******************************************************************************
 * Copyright (c) 2016, Institute for Pervasive Computing, ETH Zurich.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the Institute nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE INSTITUTE AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE INSTITUTE OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 * 
 * This file is part of the Copper (Cu) CoAP user-agent.
 ******************************************************************************/
 
Copper.ChromeStartup = function(){
};

Copper.ChromeStartup.resolvePortAndCoapEndpoint = function(clientId, finalDisconnectHandler, callback){
	let appId = "mbighlecbopknoggoappifafoffcnocc";
	let port = Copper.ComponentFactory.createPort(chrome.runtime.connect(appId), clientId);

	let resolveEndpointFunction = function(){
		Copper.ChromeStartup.resolveCoapEndpoint(clientId, port, finalDisconnectHandler, callback);
	};
    let firstTimeout = Copper.TimeUtils.setTimeout(resolveEndpointFunction, 350);

    port.registerDisconnectCallback(function(){
        // app not started
        Copper.Log.logFine("Starting application");
        Copper.TimeUtils.clearTimeout(firstTimeout);
        Copper.TimeUtils.setTimeout(resolveEndpointFunction, 750)
        Copper.OverlayAdapter.addTitleTextOverlay("Starting...", "Try to start the Copper Application");
        chrome.management.launchApp(appId, function(){
            port = Copper.ComponentFactory.createPort(chrome.runtime.connect(appId), clientId);
            port.registerDisconnectCallback(function(){
                // app was not started
                port = undefined;
            });
        });
    });
};

Copper.ChromeStartup.resolveCoapEndpoint = function(clientId, port, finalDisconnectHandler, callback){
    if (port === undefined){
        Copper.OverlayAdapter.addTitleTextOverlay("Copper App not installed", "This extension needs the Copper application to send Coap-Messages. Please install the app and reload.");
    }
    else {
        port.registerDisconnectCallback(finalDisconnectHandler);

        let search = window.location.search;
        let uri = undefined;
        if (search && search.startsWith("?")){
            uri = Copper.StringUtils.parseUri(decodeURIComponent(search.substr(1)));
        }
        if (uri === undefined){
            Copper.OverlayAdapter.addInputOverlay("Enter Endpoint", "Enter the URL of the Coap Endpoint", undefined, "coap://", "OK", function(value, errorCallback){
                uri = Copper.StringUtils.parseUri(value);
                if (uri === undefined){
                    errorCallback("Please enter a valid URL");
                }
                else {
                    window.location.search = "?" + encodeURIComponent((uri.protocol ? uri.protocol + "://" : "coap://") + uri.address + ":" + (uri.port ? uri.port : Copper.CoapConstants.DEFAULT_PORT) + 
                        (uri.path ? ("/" + uri.path) : "") + (uri.query ? ("?" + uri.query) : ""));
                }
            });
        }
        else {
            callback(clientId, port, uri.address, uri.port ? uri.port : Copper.CoapConstants.DEFAULT_PORT, uri.path, uri.query);
        }
    }
};