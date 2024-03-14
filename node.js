const {SerialPort} = require('serialport');

const port = new SerialPort({path:'COM3',  baudRate: 9600 });

port.on('open', () => {console.log('Serial port opened')});

port.on('data', (data) => {
  const [xStr, yStr, zStr] = data.toString('ascii').trim().split(' ');

  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  const z = parseFloat(zStr);
  console.log("data", data.toString('ascii'));
  console.log('X:', x, ' Y:', y, ' Z:', z);

})