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
 
// Builds on top of the shared JsonUtils
Copper.ExtensionJsonUtils = function(){
};

Copper.ExtensionJsonUtils.jsonToCopperOptions = function(data){
	let res = new Copper.Options();
	let options = Object.keys(data);
	for (let i=0; i<options.length; i++){
		res[options[i]] = data[options[i]];
	}
	return res;
};

Copper.ExtensionJsonUtils.jsonToCopperProfiles = function(data){
	let res = new Copper.Profiles();
	let profiles = Object.keys(data);

	for (let i=0; i<profiles.length; i++){
		if (profiles[i] === "allProfiles") {
			let profileNames = Object.keys(data[profiles[i]]);
			for (let j=0; j<profileNames.length; j++){
				let settings = new Copper.Settings();
				let options = new Copper.Options();
				let profileKeysSettings = Object.keys(data[profiles[i]][profileNames[j]]["settings"]);
				let profileKeysOptions = Object.keys(data[profiles[i]][profileNames[j]]["options"]);
				
				for (let k=0; k<profileKeysSettings.length; k++){
					settings[profileKeysSettings[k]] = data[profiles[i]][profileNames[j]]["settings"][profileKeysSettings[k]];
				}
				for (let k=0; k<profileKeysOptions.length; k++){
					options[profileKeysOptions[k]] = data[profiles[i]][profileNames[j]]["options"][profileKeysOptions[k]];
				}

				res[profiles[i]][profileNames[j]] = {settings: settings, options: options};


			}
		}
		else {
			res[profiles[i]] = data[profiles[i]];
		}

	}
	return res;
};

Copper.JsonUtils.transformers.push([function(value){return value instanceof Copper.Options}, "Copper.Options", undefined, Copper.ExtensionJsonUtils.jsonToCopperOptions]);
Copper.JsonUtils.transformers.push([function(value){return value instanceof Copper.Profiles}, "Copper.Profiles", undefined, Copper.ExtensionJsonUtils.jsonToCopperProfiles]);
