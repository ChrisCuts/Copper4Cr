QUnit.test("CoapMessageSerializer: serialization", function(assert) {

	function checkCoapMessageEquality(res, exp){
		// general elements
		assert.deepEqual(res, msg);
		assert.deepEqual(Copper.ByteUtils.convertBytesToHexString(res.token), Copper.ByteUtils.convertBytesToHexString(msg.token));

		// options
		let resOpts = res.getOptions();
		let origOpts = msg.getOptions();
		assert.deepEqual(resOpts, origOpts);
		for (let i=0; i<resOpts.length; i++){
			assert.deepEqual(resOpts[i].getValue(), origOpts[i].getValue());
		}

		// payload
		assert.deepEqual(Copper.ByteUtils.convertBytesToHexString(res.payload), Copper.ByteUtils.convertBytesToHexString(msg.payload));		
	}

	let conType = new Copper.CoapMessage.Type(0, "CON");
	let getCode = new Copper.CoapMessage.Code(1, "GET");
	let mid = 0x342;
	let token = Copper.ByteUtils.convertToByteArray("token");
	let payload = new ArrayBuffer(100);

	let msg = new Copper.CoapMessage(conType, getCode);
	msg.setMid(mid).setToken(token).setPayload(payload);

	checkCoapMessageEquality(Copper.CoapMessageSerializer.deserialize(Copper.CoapMessageSerializer.serialize(msg)), msg);

	let uriOptionHeader = new Copper.CoapMessage.OptionHeader(3, "Uri-Host", Copper.CoapMessage.OptionHeader.TYPE_STRING, 1, 255, false);
	let etagHeader = new Copper.CoapMessage.OptionHeader(4, "Etag", Copper.CoapMessage.OptionHeader.TYPE_OPAQUE, 1, 8, true);
	let maxAgeHeader = new Copper.CoapMessage.OptionHeader(14, "Max-Age", Copper.CoapMessage.OptionHeader.TYPE_UINT, 0, 4, false, 60);

	msg.setMid(0x01);
	msg.addOption(etagHeader, "0x4444");
	checkCoapMessageEquality(Copper.CoapMessageSerializer.deserialize(Copper.CoapMessageSerializer.serialize(msg)), msg);

	msg.addOption(uriOptionHeader, "vs0.inf.ethz.ch").addOption(uriOptionHeader, "vs1.inf.ethz.ch", true);
	msg.addOption(etagHeader, "0xF3F2F1F0");

	checkCoapMessageEquality(Copper.CoapMessageSerializer.deserialize(Copper.CoapMessageSerializer.serialize(msg)), msg);

	let bigHeader = new Copper.CoapMessage.OptionHeader(305, "Unknown", Copper.CoapMessage.OptionHeader.TYPE_OPAQUE, 0, Number.MAX_VALUE, true);
	msg.addOption(bigHeader, new ArrayBuffer(306));
	msg.addOption(bigHeader, new ArrayBuffer(400));
	checkCoapMessageEquality(Copper.CoapMessageSerializer.deserialize(Copper.CoapMessageSerializer.serialize(msg)), msg);	
});