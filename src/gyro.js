const {SerialPort} = require('serialport');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let prevX = null; // Initialize prevX and prevY as null initially
let prevY = null;

const port = new SerialPort({path:'COM4',  baudRate: 9600 });
port.on('open', () => {console.log('Serial port opened')});
wss.on('connection', function connection(ws){
    port.on('data', (data) => {
        const hexString = data.toString('hex');
        const x = parseInt(hexString.slice(2, 4), 16);
        const y = parseInt(hexString.slice(4, 6), 16);
        const z = parseInt(hexString.slice(6, 8), 16);
    
        // Compute the change in X and Y
        const deltaX = x - prevX;
        const deltaY = y - prevY;
    
        // Update previous X and Y values
        prevX = x;
        prevY = y;
    
        console.log('Change in X:', deltaX, 'Change in Y:', deltaY);
    
        ws.send(JSON.stringify({ deltaX, deltaY }));
    });
})


