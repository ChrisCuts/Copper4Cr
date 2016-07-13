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
 
Copper.ByteUtils = function(){
};

/**
* @arg byteArrays: array consisting of array buffers
* @return: one array buffer consisting of the buffers from byteArrays
*/
Copper.ByteUtils.mergeByteArrays = function(byteArrays){
	if (!Array.isArray(byteArrays)){
		throw new Error("Illegal Argument");
	}
	let resSize = 0;
	for (let i = 0; i < byteArrays.length; i++){
		if (byteArrays[i] !== null && !(byteArrays[i] instanceof ArrayBuffer)){
			throw new Error("Illegal Argument");
		}
		resSize += byteArrays[i] !== null ? byteArrays[i].byteLength : 0;
	}
	let res = new Uint8Array(resSize);
	let curOffset = 0;
	for (let i = 0; i < byteArrays.length; i++){
		if (byteArrays[i] !== null){
			res.set(new Uint8Array(byteArrays[i]), curOffset);
			curOffset += byteArrays[i].byteLength;
		}
	}
	return res.buffer;
};

/**
* @arg val: unsigned integer or string
* @return: byte representation of val
*/
Copper.ByteUtils.convertToByteArray = function(val){
	if (val === null){
		return new ArrayBuffer(0);
	}
	if (typeof(val) === "string"){
		let intVersion = Number.parseInt(val);
		if (Number.isInteger(intVersion) && intVersion >= 0){
			return Copper.ByteUtils.convertUintToBytes(intVersion);
		}
		else {
			return Copper.ByteUtils.convertStringToBytes(val);
		}
	}
	else if (Number.isInteger(val) && val >= 0){
		return Copper.ByteUtils.convertUintToBytes(val);
	}
	else {
		throw new Error("Illegal Argument");
	}
};

/**
* @arg str: string to convert
* @arg ascii: only encode ascii chars (default false). If false, utf8 is used
* @arg strict: throw an exception instead of skipping a char (default false)
* @return: array buffer with the encoded string
*/
Copper.ByteUtils.convertStringToBytes = function(str, ascii, strict){
	if (str === null){
		return null;
	}
	if (typeof(str) !== "string"){
		throw new Error("Illegal Arguments");
	}
	let useUtf8 = ascii ? false : true;
	strict = strict ? true : false;
	let resSize = 0;
	for (let i=0; i<str.length; i++){
		let c = str.charCodeAt(i);
		resSize += c < 128 ? 1 : (!useUtf8 ? 0 : (c < 2048 ? 2 : (c < 65536 ? 3 : 4)));
	}

	let res = new Uint8Array(resSize);
	let idx = 0;

	for (let i=0; i<str.length; i++) {
		let c = str.charCodeAt(i);
		
		if (c < 128) {
			res[idx++] = 0xFF & c;
		} 
		else if(useUtf8) {
			if (c < 2048) {
				res[idx++] = 0xFF & (((c >> 6) & 0x1F) | 0xC0);
				res[idx++] = 0xFF & ((c & 0x3F) | 0x80);
			} 
			else if (c < 65536) {
				res[idx++] = 0xFF & (((c >> 12) & 0x0F) | 0xE0);
				res[idx++] = 0xFF & (((c >> 6) & 0x3F) | 0x80);
				res[idx++] = 0xFF & ((c & 0x3F) | 0x80);
			}
			else {
				res[idx++] = 0xFF & (((c >> 18) & 0x07) | 0xF0);
				res[idx++] = 0xFF & (((c >> 12) & 0x3F) | 0x80);
				res[idx++] = 0xFF & (((c >> 6) & 0x3F) | 0x80);
				res[idx++] = 0xFF & ((c & 0x3F) | 0x80);
			}
		}
		else if (strict) {
			throw new Error("Cannot encode " + c + " in ascii.");
		}
	}
	return res.buffer;
};

/**
* @arg buf: array buffer to convert
* @arg offset: offset in the buffer
* @arg length: number of bytes that should be converted
* @arg ascii: only decode ascii chars (default false). If false, utf8 is used
* @arg strict: throw an exception instead of skipping a char (default false)
* @return: decoded string
*/
Copper.ByteUtils.convertBytesToString = function(buf, offset, length, ascii, strict){
	if (!(buf instanceof ArrayBuffer) || (offset && (!Number.isInteger(offset) || offset < 0)) || (length && (!Number.isInteger(length) || length < 0))){
		throw new Error("Illegal Arguments");
	}
	offset = offset ? offset : 0;
	length = length ? length : (buf.byteLength - offset);
	let bufView = new Uint8Array(buf, offset, length);
	let useUtf8 = ascii ? false : true;
	strict = strict ? true : false;

	let str = [];
	for (let idx=0; idx<bufView.byteLength; ){
		let c = bufView[idx++];
		if (c >= 128 && useUtf8){
			if ((c & 0xF8) === 0xF0 && (idx+2) < bufView.byteLength && (bufView[idx]&0xC0) === 0x80 && (bufView[idx+1]&0xC0) === 0x80 && (bufView[idx+2]&0xC0) === 0x80){
				// four bytes
				c = ((c & 0x07) << 18) | ((bufView[idx] & 0x3F) << 12) | ((bufView[idx+1] & 0x3F) << 6) | (bufView[idx+2] & 0x3F);
				idx += 3;
			}
			else if ((c & 0xF0) === 0xE0 && (idx+1) < bufView.byteLength && (bufView[idx]&0xC0) === 0x80 && (bufView[idx+1]&0xC0) === 0x80){
				// three bytes
				c = ((c & 0x0F) << 12) | ((bufView[idx] & 0x3F) << 6) | (bufView[idx+1] & 0x3F);
				idx += 2;
			}
			else if ((c & 0xE0) === 0xC0 && idx < bufView.byteLength && (bufView[idx]&0xC0) === 0x80){
				// two bytes
				c = ((c & 0x1F) << 6) | (bufView[idx] & 0x3F);
				idx += 1;
			}
			else if (strict){
				throw new Error("Illegal UTF-8 encoding");
			}
			else {
				continue;
			}
		}
		else if (c >= 128 && strict) {
			throw new Error("No ascii character for " + c + ".");
		}
		else if (c >= 128){
			continue;
		}
		str.push(String.fromCharCode(c));
	}
	return str.join("");
};

/**
* @arg val: unsigned integer to convert
* @return: array buffer containing the encoded integer. Buffer has length 0 for val 0
*/
Copper.ByteUtils.convertUintToBytes = function(val){
	if (val === null){
		return null;
	}
	else if (typeof(val) !== "number" || !Number.isInteger(val) || val < 0){
		throw new Error("Illegal Argument");
	}
	else if (val === 0){
		return new ArrayBuffer(0);
	}
	let sz = 0;
	let rem = val;
	while (rem > 0){
		sz++;
		rem = rem >>> 8;
	}
	let res = new Uint8Array(sz);
	for (let i=sz-1; i>=0; i--){
		res[i] = val & 0xFF;
		val = val >>> 8;
	}
	return res.buffer;
};

/**
* @arg buf: array buffer to convert
* @arg offset: offset in the buffer
* @arg length: number of bytes that should be converted
* @return: decoded uint
*/
Copper.ByteUtils.convertBytesToUint = function(buf, offset, length){
	if (!(buf instanceof ArrayBuffer) || (offset && (!Number.isInteger(offset) || offset < 0)) || (length && (!Number.isInteger(length) || length < 0))){
		throw new Error("Illegal Arguments");
	}
	if (buf.byteLength === 0 || length === 0){
		return 0;
	}
	offset = offset ? offset : 0;
	length = length ? length : (buf.byteLength - offset);
	let bufView = new Uint8Array(buf, offset, length);
	let res = 0;
	for (let i=0; i<bufView.byteLength; i++){
		res = ((res << 8) >>> 0 ) | bufView[i];
	}
	// convert to unsigned integer
	return res >>> 0;
};

/**
* @arg buf: array buffer to convert
* @arg offset: offset in the buffer
* @arg length: number of bytes that should be converted
* @return: hex representation of all bytes in the buffer
*/
Copper.ByteUtils.convertBytesToHexString = function(buf, offset, length){
	if (!(buf instanceof ArrayBuffer) || (offset && (!Number.isInteger(offset) || offset < 0)) || (length && (!Number.isInteger(length) || length < 0))){
		throw new Error("Illegal Arguments");
	}
	if (buf.byteLength === 0 || length === 0){
		return "0x0";
	}
	offset = offset ? offset : 0;
	length = length ? length : (buf.byteLength - offset);
	let bufView = new Uint8Array(buf, offset, length);
	let res = ["0x"];
	for (let i=0; i<bufView.byteLength; i++){
		res.push(bufView[i].toString(16).toUpperCase());
	}
	return res.join("");
};


/**
 * @arg val: hex number in string format
 * @return: byte representation of val, truncate tail if more than 16 digits
 */
Copper.ByteUtils.convertHexStringToBytes = function(hexString) {
	if (hexString.length < 2 || !(/^[0-9A-Fa-f]{1,64}$/.test(hexString.substring(2)))) {
		throw new Error("Illegal Argument for HexString");
	}

	hexString = hexString.substring(0,18);

	if (hexString.substring(10,17) === "") {
		return Copper.ByteUtils.convertUintToBytes(parseInt(hexString));
	}

	let lower = hexString.substring(hexString.length-8);
	let upper = hexString.substring(2, hexString.length-8);

	let res = [];
	res.push(Copper.ByteUtils.convertUintToBytes(parseInt('0x' + upper)));
	res.push(Copper.ByteUtils.convertUintToBytes(parseInt('0x' + lower)));
	return Copper.ByteUtils.mergeByteArrays(res);
}