const {SerialPort} = require('serialport');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let prevX = null; // Initialize prevX and prevY as null initially
let prevY = null;

const port = new SerialPort({path:'COM4',  baudRate: 9600 });
port.on('open', () => {console.log('Serial port opened')});
let accumulatedData = '';
wss.on('connection', function connection(ws){
    port.on('data', (data) => {
        var x = 0;
        var y = 0;
        var z = 0;
        const dataString = data.toString('utf8');
        accumulatedData += dataString;
        const lines = accumulatedData.split('\n');
        if (lines.length > 1) {
            accumulatedData = lines.pop();
            lines.forEach(line => {
                const match = line.match(/X: ([-\d.]+) Y: ([-\d.]+) Z: ([-\d.]+)/);
                if (match) {
                    x = parseFloat(match[1]);
                    y = parseFloat(match[2]);
                    z = parseFloat(match[3]);
                    //console.log(`X: ${x}, Y: ${y}, Z: ${z}`);

                    // Compute the change in X and Y
                    const deltaX = x - prevX;
                    const deltaY = y - prevY;
                
                    // Update previous X and Y values
                    prevX = x;
                    prevY = y;
                
                    console.log('Change in X:', deltaX, 'Change in Y:', deltaY);
                
                    ws.send(JSON.stringify({ deltaX, deltaY }));
                } else {
                    console.log('Data format not recognized:', line);
                }
            });
        }
    });
})


