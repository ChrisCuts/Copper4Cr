Copper.ToolbarAdapter = function(){
};

Copper.ToolbarAdapter.init = function(){
	document.getElementById("btn_get").onclick = Copper.ToolbarAdapter.doGet;
};

Copper.ToolbarAdapter.onEvent = function(event){
};

Copper.ToolbarAdapter.doGet = function(){
	let coapMessage = new Copper.CoapMessage(Copper.CoapMessage.Type.CON, Copper.CoapMessage.Code.GET);
	Copper.Event.sendEvent(Copper.Event.createClientSendCoapMessageEvent(coapMessage, Copper.Session.clientId));
};
