const { SerialPort } = require('serialport');

const port = new SerialPort({ path: 'COM4', baudRate: 9600 });

port.on('open', () => {
    console.log('Serial port opened');
});

let accumulatedData = '';
port.on('data', data => {
  const dataString = data.toString('utf8');
    accumulatedData += dataString;

    // Check if a complete line is received
    const lines = accumulatedData.split('\n');
    if (lines.length > 1) {
        accumulatedData = lines.pop();
        lines.forEach(line => {
            const match = line.match(/X: ([-\d.]+) Y: ([-\d.]+) Z: ([-\d.]+)/);
            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                const z = parseFloat(match[3]);
                console.log(`X: ${x}, Y: ${y}, Z: ${z}`);
            } else {
                console.log('Data format not recognized:', line);
            }
        });
    }
});