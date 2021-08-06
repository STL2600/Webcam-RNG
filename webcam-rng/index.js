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
		const webcam = NodeWebcam.create({ frames: 1,
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

function makeServer(name, port, imgFunc) {
	const server = net.createServer();
	const events = new EventEmitter();

	let handling = false;
	frameEvents.on('frame', () => {
		if (handling) return;
		const output = imgFunc(images);
		events.emit('data', output);
		handling = false;
	});

	server.on('connection', (conn) => {
		const remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
		console.log(`new client connection for ${name} server from ${remoteAddress}`);

		const sendData = (data) => conn.write(data);

		events.on('data', sendData);

		conn.once('close', () => {
			events.off('data', sendData);
		});  
		conn.once('error', () => {
			events.off('data', sendData);
		});  
	});

	server.listen(port, function() {    
	  console.log(`${name} server listening on ${port}`);  
	});
}


// Take a byte array, and convert each 8 bytes into a single byte composed of
// the least signifigant bits of each.  Remaining bytes after dividing by 8
// are ignored.
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

function hashImages(images) {
		const imgHash = crypto.createHash('sha256');
		imgHash.update(images.get(0));
		return imgHash.digest();
}

function diffImages(images) {
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

		return getLeastSigBits(diff);
}

Promise.all([
	readCameraImages(),
	makeServer('raw images', 9000, (images) => images.get(0)),
	makeServer('least sig bits', 9001, (images) => getLeastSigBits(images.get(0))),
	makeServer('hashes', 9002, hashImages),
	makeServer('diffs', 9003, diffImages),
])
.catch((err) => {
	console.dir(err);
	process.exit(1);
});
