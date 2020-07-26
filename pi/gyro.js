const i2c = require('i2c-bus');

class Gyro {
    constructor(data) {
        /* address of sensor */
        this.SLAVE_ADDRESS = data.slave_address;
        
        /* write */
        this.OPTION_0 = 0x20; // Magnetic high resolution, o/p data rate 50 Hz
        // this.OPTION_1 = 0x21; // Magnetic full scale selection, +/- 12 gauss
        // this.OPTION_2 = 0x22; // Normal mode, magnetic continuous conversion mode
        this.OPTION_3 = 0x23;
        // this.OPTION_4 = 0x24;
        this.VALUE_0 = 0x0F;
        // this.VALUE_1 = 0x00;
        // this.VALUE_2 = 0X00;
        this.VALUE_3 = 0x30;
        // this.VALUE_4 = 0X00;
        
        //Default
        // this.VALUE_0 = 0x18;
        // this.VALUE_1 = 0x20;
        // this.VALUE_2 = 0X02;

        /* read */
        this.READ_0 = 0x28;
        this.READ_1 = 0x29;
        this.READ_2 = 0x2A;
        this.READ_3 = 0x2B;
        this.READ_4 = 0x2C;
        this.READ_5 = 0x2D;

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
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_3, this.VALUE_3)
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
        return new Promise((resolve, reject) => {
            i2c.openPromisified(1)
            .then(sensor => {
                Promise.all([
                    sensor.readByte(this.SLAVE_ADDRESS, this.READ_0),
                    sensor.readByte(this.SLAVE_ADDRESS, this.READ_1),
                    sensor.readByte(this.SLAVE_ADDRESS, this.READ_2),
                    sensor.readByte(this.SLAVE_ADDRESS, this.READ_3),
                    sensor.readByte(this.SLAVE_ADDRESS, this.READ_4),
                    sensor.readByte(this.SLAVE_ADDRESS, this.READ_5)
                ])
                .then(([a, b, c, d, e, f]) => {
                    // console.log(`X_l --> ${a}`)
                    // console.log(`X_h --> ${b}`)
                    // console.log(`Y_l --> ${c}`)
                    // console.log(`Y_h --> ${d}`)
                    // console.log(`Z_l --> ${e}`)
                    // console.log(`Z_h --> ${f}`)
                    sensor.close()
                    this.x_axis = this.convert(a, b)
                    this.y_axis = this.convert(c, d)
                    this.z_axis = this.convert(e, f)
		            resolve([this.x_axis, this.y_axis, this.z_axis])
                })
                .catch(err => {
                    sensor.close()
                    reject("*** Error reading compass data")
                })
            })
            .catch(err => {
                sensor.close()
                reject("*** Error opening i2c bus")
            })
        })
    }
}

module.exports = Gyro;
