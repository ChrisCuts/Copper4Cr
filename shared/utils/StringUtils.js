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
 
Copper.StringUtils = function(){
};

/**
* @return current datetime formatted as 23.03.2016 15:29:33.214
*/
Copper.StringUtils.getDateTime = function() {
	let currentdate = new Date(Copper.TimeUtils.now()); 
	let dd = currentdate.getDate().toString();
	let mm = (currentdate.getMonth()+1).toString();
	let yyyy = currentdate.getFullYear().toString();
	let hh = currentdate.getHours().toString();
	let mi = currentdate.getMinutes().toString();
	let ss = currentdate.getSeconds().toString();
	let ms = currentdate.getMilliseconds().toString();
    return this.lpad(dd, 2) + "." + this.lpad(mm, 2) + "." + yyyy +
        " " + this.lpad(hh, 2) + ":" + this.lpad(mi, 2) + ":" + this.lpad(ss, 2) + "." + this.lpad(ms, 3);
};

/**
* @arg withMilliseconds: if set to true, milliseconds is added
* @return current datetime formatted as 15:29:33(.214?)
*/
Copper.StringUtils.getTime = function(withMilliseconds) {
	let currentdate = new Date(Copper.TimeUtils.now()); 
	let hh = currentdate.getHours().toString();
	let mi = currentdate.getMinutes().toString();
	let ss = currentdate.getSeconds().toString();
    let res = this.lpad(hh, 2) + ":" + this.lpad(mi, 2) + ":" + this.lpad(ss, 2); 
    if (withMilliseconds){
    	res = res + "." + this.lpad(currentdate.getMilliseconds().toString(), 3);
    }
    return res;
};

/**
* @return String of length len using the first len characters of str optionally left padding it with pad (default 0)
*/
Copper.StringUtils.lpad = function(str, len, pad){
	if (!pad) pad = "0";
	if (pad.length > 1) throw new Error("Length of padding <> 1");
	if (typeof(len) !== "number" || (str !== null && typeof(str) !== "string")) throw new Error("Illegal Arguments");
	if (str && str.length === len) {
		return str;
	}
	else {
		let res = [];
		for (let i = 0; i < len - (str ? str.length : 0); i++){
			res.push(pad);
		}
		res.push(str ? (str.len < len ? str : str.substring(0, len)) : "");
		return res.join("");
	}
};

Copper.StringUtils.parseUri = function(rawUri){
	if (!rawUri){
		return undefined;
	}
	// use HTML <a> tag as a parser
	let parser = document.createElement("a");
	// we have to set a valid protocol
	if (rawUri.startsWith("coap://")){
		parser.href = rawUri.replace(/^coap/, "http");
	}
	else if (!rawUri.startsWith("http://") && !rawUri.startsWith("https://")){
		parser.href = "http://" + rawUri;
	}
	else {
		parser.href = rawUri;	
	}
	if (parser.host && parser.host !== window.location.host){
		// if an invalid href is entered, host points in some browser versions to current location
		let result = {
			address: parser.hostname
		};
		if (!Number.isNaN(parseInt(parser.port))){
			result["port"] = parseInt(parser.port);
		}
		if (typeof(parser.pathname) === "string" && parser.pathname.length > 1){
			result["path"] = parser.pathname.substring(1);
		}
		if (typeof(parser.search) === "string"  && parser.search.length > 1){
			result["query"] = parser.search.substring(1);
		}
		return result;
	}
	else {
		return undefined;
	}
};