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
 
window.onload = function(){
	Copper.ComponentFactory = Copper.ChromeComponentFactory;
    Copper.Log.registerLogger(Copper.ConsoleLogger.log);

    let clientId = 1;
    // resolve port, remoteAddress:port in a browser dependent way
    Copper.ComponentFactory.resolvePortAndCoapEndpoint(clientId, Copper.Session.onPortDisconnect, Copper.Session.registerClient);
};

Copper.Session = function(){
};

Copper.Session.clientId = undefined;
Copper.Session.protocol = undefined;
Copper.Session.remoteAddress = undefined;
Copper.Session.remotePort = undefined;
Copper.Session.path = undefined;
Copper.Session.query = undefined;

Copper.Session.profileName = undefined;
Copper.Session.settings = undefined;
Copper.Session.options = undefined;
Copper.Session.profiles = undefined;

Copper.Session.clientEndpoint = undefined;
Copper.Session.localPort = undefined;


Copper.Session.guiAdapters = [
        Copper.MessageLogAdapter,
        Copper.PacketHeaderAdapter,
        Copper.PacketOptionsAdapter,
        Copper.PayloadAdapter,
        Copper.ToolbarAdapter,
        Copper.ResourceViewAdapter,
        Copper.DebugOptionsAdapter,
        Copper.PopupWindowAdapter,
        Copper.ProfilesAdapter
    ];

// setup session
// register client
// bind HTML to javascript
Copper.Session.registerClient = function(clientId, port, protocol, remoteAddress, remotePort, path, query){
    Copper.Session.clientId = clientId;
    Copper.Session.protocol = protocol;
    Copper.Session.remoteAddress = remoteAddress;
    Copper.Session.remotePort = remotePort;
    Copper.Session.path = path;
    Copper.Session.query = query;

    Copper.Session.settings = new Copper.Settings();
    Copper.Session.options = new Copper.Options();
    Copper.Session.profiles = new Copper.Profiles();


    let registeredCallback = function(event){
        switch (event.type){
            case Copper.Event.TYPE_CLIENT_REGISTERED:
                Copper.Event.unregisterCallback(registeredCallback, clientId);
                Copper.OverlayAdapter.removeOverlay();

                Copper.Session.clientEndpoint = new Copper.ClientEndpoint(port, clientId);
                Copper.Session.localPort = event.port;

                Copper.Session.loadAllProfilesAndSelect();
                Copper.Session.startExtension();
                break;
            case Copper.Event.TYPE_ERROR_ON_SERVER: 
                Copper.OverlayAdapter.addTitleTextOverlay("Error", "Error " + event.data.errorType + ": " + event.data.errorMessage);
                break;
            default:
                Copper.OverlayAdapter.addTitleTextOverlay("Error: Invalid Event", "Received invalid event(" + event.type + ") from app. Please restart the extension.");
                break;
        }
        return true;
    };
    Copper.Event.registerCallback(registeredCallback, clientId);
    port.sendMessage(Copper.Event.createRegisterClientEvent(remoteAddress, remotePort, Copper.Session.settings, clientId));
};

Copper.Session.startExtension = function(){
    let guiAdapters = Copper.Session.guiAdapters;
    
    // init
    for (let i=0; i<guiAdapters.length; i++){
        if (typeof(guiAdapters[i].init) === "function"){
            guiAdapters[i].init();
        }
    }

    // event callback
    Copper.Event.registerCallback(function(event){
        for (let i=0; i<guiAdapters.length; i++){
            if (typeof(guiAdapters[i].onEvent) === "function"){
                guiAdapters[i].onEvent(event);
            }
        }
        switch (event.type){
            case Copper.Event.TYPE_ERROR_ON_SERVER:
                Copper.Session.showErrorMessage(event.data.errorType, event.data.errorMessage);
                break;
        }
        return true;
    }, Copper.Session.clientId);
};

Copper.Session.showErrorMessage = function(errorNo, errorMessage){
    if (!Number.isInteger(errorNo) || typeof(errorMessage) !== "string"){
        throw new Error("Illegal Arguments");
    }
    Copper.OverlayAdapter.addErrorMsgOverlay("Error " + errorNo, errorMessage);
};

Copper.Session.sendCoapMessage = function(coapMessage, withoutModification){
    if (!(coapMessage instanceof Copper.CoapMessage)){
        throw new Error("Illegal Argument");
    }
    if (Copper.Session.clientEndpoint === undefined){
        throw new Error("Illegal State");
    }
    try{
        if (!withoutModification){
            // add URI-PATH and URI-QUERY
            if (Copper.Session.path !== undefined){
                let pathParts = Copper.Session.path.split("/");
                for (let i=0; i<pathParts.length; i++){
                    coapMessage.addOption(Copper.CoapMessage.OptionHeader.URI_PATH, pathParts[i]);
                }
            }
            if (Copper.Session.query !== undefined){
                let queryParts = Copper.Session.query.split("&");
                for (let i=0; i<queryParts.length; i++){
                    coapMessage.addOption(Copper.CoapMessage.OptionHeader.URI_QUERY, queryParts[i]);
                }
            }

            Copper.Session.options.addOptions(coapMessage);

            let guiAdapters = Copper.Session.guiAdapters;
            for (let i=0; i<guiAdapters.length; i++){
                if (typeof(guiAdapters[i].beforeSendingCoapMessage) === "function"){
                    try {
                        guiAdapters[i].beforeSendingCoapMessage(coapMessage);
                    } catch (exception){
                        Copper.Log.logError(exception.stack);
                        Copper.Session.showErrorMessage(-1, exception.message);
                    }
                }
            }
        }
        Copper.Session.clientEndpoint.sendCoapMessage(coapMessage);
    } catch (exception){
        Copper.Log.logError(exception.stack);
        Copper.Session.showErrorMessage(-1, exception.message);
    }
};

Copper.Session.onPortDisconnect = function(){
    Copper.Session.clientEndpoint = undefined;
    Copper.Session.localPort = undefined;
    Copper.OverlayAdapter.addTitleTextOverlay("Connection lost...", "Connection to Copper app lost. Please restart the extension.");
};

Copper.Session.loadAllProfilesAndSelect = function() {

    Copper.ChromeComponentFactory.retrieveLocally(Copper.Profiles.profilesKey, function(id, items) {
        let profiles = items[id];
        if (profiles === undefined) {
            // No profiles stored yet -> Create default profile and load it
            Copper.Session.profiles.createAndSelectDefaultProfile();

        } else {
            Copper.Session.profiles = Copper.JsonUtils.parse(profiles);
            Copper.ChromeComponentFactory.retrieveLocally(Copper.Profiles.selectedProfileKey, function(id2, items2) {
                let name = items2[id2];
                Copper.Session.profiles.loadProfile(name);

            });
        }
    });

};

Copper.Session.storeChange = function() {
    Copper.Session.profiles.updateCurrentProfile();
};