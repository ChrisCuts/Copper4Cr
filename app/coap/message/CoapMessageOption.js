/**
* Creates a new option object.
* @header: option header
*/
Copper.CoapMessage.Option = function(header){
	if (!(header instanceof Copper.CoapMessage.OptionHeader)) throw new Error("Illegal Arguments");
	this.header = header;
	this.resetValue();	
};

/**
* Resets the value of this option to empty
* @return: option (for method chaining)
*/
Copper.CoapMessage.Option.prototype.resetValue = function() {
	this.val = [];
	return this;
};

/**
* Sets the option value or adds a value in case of options that support multiple values. 
* @byteVal: ArrayBuffer containing the data
* @return: option (for method chaining)
*/
Copper.CoapMessage.Option.prototype.addByteValue = function(byteVal) {
	if (byteVal !== null && !(byteVal instanceof ArrayBuffer)){
		throw new Error("Option value must be a byte array");
	}
	if (byteVal !== null && (this.header.minLen > byteVal.byteLength || this.header.maxLen < byteVal.byteLength)){
		throw new Error("Invalid option value size");
	}
	if (byteVal === null && this.header.minLen > 0){
		throw new Error("Invalid option value size");	
	}
	if (this.header.multipleValues) {
		this.val.push(byteVal);
	}
	else {
		if (this.val.length > 0) {
			throw new Error("Option value already set");
		}
		this.val.push(byteVal);
	}
	return this;
};

/**
* Sets the option value or adds a value in case of options that support multiple values. 
* @val: Data in the right format
* @return: option (for method chaining)
*/
Copper.CoapMessage.Option.prototype.addValue = function(val) {
	let Types = Copper.CoapMessage.OptionHeader;
	switch(this.header.type) {
		case Types.TYPE_EMPTY:
			if (val === null || val === 0){
				this.addByteValue(new ArrayBuffer(0));
				break;
			}
			throw new Error("Illegal Argument");
		case Types.TYPE_OPAQUE:
			this.addByteValue(Copper.ByteUtils.convertToByteArray(val));
			break;
		case Types.TYPE_UINT:
			if (Number.isInteger(val) && val > 0){
				this.addByteValue(Copper.ByteUtils.convertUintToBytes(val));
				break;
			}
			throw new Error("Illegal Argument");
		case Types.TYPE_STRING:
			if (typeof(val) === "string"){
				this.addByteValue(Copper.ByteUtils.convertStringToBytes(val));
				break;
			}
			throw new Error("Illegal Argument");
		case Types.TYPE_BLOCK:
			if (val instanceof Copper.CoapMessage.BlockOption) {
				this.addByteValue(Copper.ByteUtils.convertUintToBytes(Copper.CoapMessage.BlockOption.convertBlockOptionToUint(val)));
				break;
			}
			throw new Error("Illegal Argument");
		default:
			throw new Error("Illegal Argument");
	}
	return this;
};

/*
* Sets or overwrites the option value
* @val: Data in the right format (depending on the option header)
* @return: option (for method chaining)
*/
Copper.CoapMessage.Option.prototype.setValue = function(val) {
	if (this.val.length > 0){
		this.resetValue();
	}
	return this.addValue(val);
};


/*
* @return: for multi-valued options: array containing all converted values, empty if no value set,
*          for single-valued: converted value, undefined if not set
*/
Copper.CoapMessage.Option.prototype.getValue = function() {
	let val = this.val;
	if (val.length === 0){
		return this.header.multipleValues ? [] : undefined;
	}
	else {
		let Types = Copper.CoapMessage.OptionHeader;
		let res = [];
		for (let i=0; i<val.length; i++){
			switch(this.header.type) {
				case Types.TYPE_EMPTY:
					res.push(null);
					break;
				case Types.TYPE_OPAQUE:
					res.push(Copper.ByteUtils.convertBytesToHexString(val[i]));
					break;
				case Types.TYPE_STRING:
					res.push(Copper.ByteUtils.convertBytesToString(val[i]));
					break;
				case Types.TYPE_UINT:
					res.push(Copper.ByteUtils.convertBytesToUint(val[i]));
					break;
				case Types.TYPE_BLOCK:
					res.push(Copper.CoapMessage.BlockOption.convertUintToBlockOption(
						Copper.ByteUtils.convertBytesToUint(val[i])));
					break;
				default:
					throw new Error("Unknown Type");
			}
		}
		return this.header.multipleValues ? res : res[0];
	}
};