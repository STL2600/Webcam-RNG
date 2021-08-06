const NodeWebcam = require('node-webcam');
const net = require('net');
const CircularBuffer = require("circular-buffer");
const EventEmitter = require('events');
const crypto = require('crypto');
const _ = require('lodash');

const frameEvents = new EventEmitter();
const images = new CircularBuffer(5);

async function readCameraImages() {
	return new Promise((resolve, reject) => {
		const webcam = NodeWebcam.create({
			frames: 1,
			output: 'png',
			callbackReturn: 'buffer',
		});

		const readNextImage = () => {
			webcam.capture( "test_picture", function( err, data ) {
				if (err) {
					console.error(`error getting frame: ${err.message}`)

				}
				else {
					images.enq(data);
					frameEvents.emit('frame');
					console.error('read frame');
				}

				setTimeout(readNextImage, 1000 / 10);
			});
		}

		readNextImage();
	});
}

function getLeastSigBits(bytes) {
	return Uint8Array.from(_.chain(bytes)
		.chunk(8)
		.filter((chunk) => chunk.length === 8)
		.map((chunk) => {
			const binaryNums = chunk.map((num, idx) => (num & 1) << idx);
			const combined = binaryNums.reduce((ret, num) => ret | num);
			return combined;
		})
		.value());
}

async function makeRawImgServer() {
	var rawImgServer = net.createServer();

	rawImgServer.on('connection', (conn) => {
		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
		console.log('new client connection from %s', remoteAddress);

		const sendFrame = () => {
			conn.write(images.get(0));
		};

		frameEvents.on('frame', sendFrame);

		conn.once('close', () => {
			frameEvents.off('frame', sendFrame);
		});  
		conn.once('error', () => {
			frameEvents.off('frame', sendFrame);
		});  
	});

	rawImgServer.listen(9000, function() {    
	  console.log('raw image server listening on %j', rawImgServer.address());  
	});
}

async function makeLeastSigBitsServer() {
	var rawImgServer = net.createServer();

	rawImgServer.on('connection', (conn) => {
		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
		console.log('new client connection from %s', remoteAddress);

		const sendFrame = () => {
			const img = images.get(0);
			const bits = getLeastSigBits(img);
			conn.write(bits);
		};

		frameEvents.on('frame', sendFrame);

		conn.once('close', () => {
			frameEvents.off('frame', sendFrame);
		});  
		conn.once('error', () => {
			frameEvents.off('frame', sendFrame);
		});  
	});

	rawImgServer.listen(9003, function() {    
	  console.log('least sig bits server listening on %j', rawImgServer.address());  
	});
}

async function makeHashedServer() {
	var hashedServer = net.createServer();

	const hashEvents = new EventEmitter();

	let handling = false;
	frameEvents.on('frame', () => {
		if (handling) return;
		handling = true;

		const imgHash = crypto.createHash('sha256');
		imgHash.update(images.get(0));
		hashEvents.emit('hash', imgHash.digest());

		handling = false;
	});

	hashedServer.on('connection', (conn) => {
		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
		console.log('new client connection from %s', remoteAddress);

		const sendHash = (hash) => {
			conn.write(hash);
		};

		hashEvents.on('hash', sendHash);

		conn.once('close', () => {
			hashEvents.off('hash', sendHash);
		});  
		conn.once('error', () => {
			hashEvents.off('hash', sendHash);
		});  
	});

	hashedServer.listen(9001, function() {    
	  console.log('hash server listening on %j', hashedServer.address());  
	});
}

async function makeFrameDiffServer() {
	var diffServer = net.createServer();

	const diffEvents = new EventEmitter();

	let handling = false;
	frameEvents.on('frame', () => {
		if (handling) return;
		if (images.size() < 2) return;
		handling = true;

		const currentFrame = images.get(0); 
		const currentFrameCopy = Buffer.alloc(currentFrame.length);
		currentFrame.copy(currentFrameCopy);

		const previousFrame = images.get(1); 
		const previousFrameCopy = Buffer.alloc(previousFrame.length);
		previousFrame.copy(previousFrameCopy);

		const diff = currentFrameCopy
			.map((currentPixel, idx) => {
				const previousPixel = previousFrameCopy[idx];
				if (currentPixel === previousPixel) return null;
				return currentPixel ^ previousPixel;
			})
			.filter((diff) => diff);

		const output = getLeastSigBits(diff);

		diffEvents.emit('diff', output);

		handling = false;
	});

	diffServer.on('connection', (conn) => {
		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
		console.log('new client connection from %s', remoteAddress);

		const sendDiff = (diff) => {
			conn.write(diff);
		};

		diffEvents.on('diff', sendDiff);

		conn.once('close', () => {
			diffEvents.off('diff', sendDiff);
		});  
		conn.once('error', () => {
			diffEvents.off('diff', sendDiff);
		});  
	});

	diffServer.listen(9002, function() {    
	  console.log('diff server listening on %j', diffServer.address());  
	});
}


Promise.all([
	readCameraImages(),
	makeRawImgServer(),
	makeHashedServer(),
	makeFrameDiffServer(),
	makeLeastSigBitsServer(),
])
.catch((err) => {
	console.dir(err);
	process.exit(1);
});
