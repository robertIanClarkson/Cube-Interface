const i2c = require('i2c-bus');

class Compass {
    constructor(data) {
        /* address of sensor */
        this.SLAVE_ADDRESS = data.slave_address;
        
        /* write */
        this.OPTION_0 = 0x24; // Magnetic high resolution, o/p data rate 50 Hz
        this.OPTION_1 = 0x25; // Magnetic full scale selection, +/- 12 gauss
        this.OPTION_2 = 0X26; // Normal mode, magnetic continuous conversion mode
        
        this.VALUE_0 = 0x70;
        this.VALUE_1 = 0x00;
        this.VALUE_2 = 0X00;
        
        //Default
        // this.VALUE_0 = 0x18;
        // this.VALUE_1 = 0x20;
        // this.VALUE_2 = 0X02;

        /* read */
        this.READ_CMD = 0x08;
        this.READ_LENGTH = 6;
        this.READ_BUFFER = Buffer.alloc(6);

        /* results */
        this.x_axis;
        this.y_axis;
        this.z_axis;
    }

    start() {
        return new Promise( (resolve, reject) => {
            i2c.openPromisified(1)
            .then(sensor => {
                Promise.all([
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_0, this.VALUE_0),
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_1, this.VALUE_1),
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_2, this.VALUE_2)
                ])
                .then( () => {
                    sensor.close()
                    resolve()
                })
	        .catch((err) => {
		    reject(err)
                })
            })
	    .catch((err) => {
	        reject(err)
            }) 
         });
    }

    convert(lsb, msb) {
        var result = ((msb & 0xFF) * 256 + (lsb & 0xFF))
		if(result > 32767) {
			result -= 65536
		}
		return result
    }

    read() {
        return new Promise( (resolve, reject) => {
            i2c.openPromisified(1)
            .then( sensor => {
                sensor.readI2cBlock(
                    this.SLAVE_ADDRESS, 
                    this.READ_CMD,
                    this.READ_LENGTH,
                    this.READ_BUFFER,
                )
                .then( () => {
                    console.log(this.READ_BUFFER)
                    resolve(this.READ_BUFFER)
                })
                .catch( err => {
                    reject(err)
                })
            })
            .catch( err => {
                reject(err)
            })
        })
    }

    // read() {
    //     return new Promise((resolve, reject) => {
    //         i2c.openPromisified(1)
    //         .then(sensor => {
    //             Promise.all([
    //                 sensor.readByte(this.SLAVE_ADDRESS, this.READ_0),
    //                 sensor.readByte(this.SLAVE_ADDRESS, this.READ_1),
    //                 sensor.readByte(this.SLAVE_ADDRESS, this.READ_2),
    //                 sensor.readByte(this.SLAVE_ADDRESS, this.READ_3),
    //                 sensor.readByte(this.SLAVE_ADDRESS, this.READ_4),
    //                 sensor.readByte(this.SLAVE_ADDRESS, this.READ_5)
    //             ])
    //             .then(([a, b, c, d, e, f]) => {
    //                 sensor.close()
    //                 this.x_axis = this.convert(a, b)
    //                 this.y_axis = this.convert(c, d)
    //                 this.z_axis = this.convert(e, f)
	// 	            resolve([this.x_axis, this.y_axis, this.z_axis])
    //             })
    //             .catch(err => {
    //                 sensor.close()
    //                 reject("*** Error reading compass data")
    //             })
    //         })
    //         .catch(err => {
    //             sensor.close()
    //             reject("*** Error opening i2c bus")
    //         })
    //     })
    // }
}

module.exports = Compass;
