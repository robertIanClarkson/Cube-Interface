const i2c = require('i2c-bus');

class Gyro {
    constructor(data) {
        /* address of sensor */
        this.SLAVE_ADDRESS = data.slave_address;
        
        /* write */
        this.OPTION_0 = 0x20;
        this.OPTION_1 = 0x21;
        this.OPTION_2 = 0x22;
        this.OPTION_3 = 0x23;
        this.OPTION_4 = 0x24;
        this.VALUE_0 = 0x0F;
        this.VALUE_1 = 0x00;
        this.VALUE_2 = 0x00;
        this.VALUE_3 = 0x30;
        this.VALUE_4 = 0x00;

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
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_1, this.VALUE_1),
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_2, this.VALUE_2),
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_3, this.VALUE_3),
                    sensor.writeByte(this.SLAVE_ADDRESS, this.OPTION_4, this.VALUE_4)
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
                    sensor.close()
                    this.x_axis = this.convert(a, b)
                    this.y_axis = this.convert(c, d)
                    this.z_axis = this.convert(e, f)
		            resolve([this.x_axis, this.y_axis, this.z_axis])
                })
                .catch(err => {
                    sensor.close()
                    reject("*** GYRO: Error reading data")
                })
            })
            .catch(err => {
                sensor.close()
                reject("*** GYRO: Error opening i2c bus")
            })
        })
    }
}

module.exports = Gyro;
