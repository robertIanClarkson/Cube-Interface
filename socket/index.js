const socketIo = require('socket.io')
const i2c = require('i2c-bus');

const Motor = require('../pi/motor')
const Compass = require('../pi/compass')
const Gyro = require('../pi/gyro')
const Accel = require('../pi/accel')

const init = (app, server) => {

  const io = socketIo(server)

  var motor_0;
  var motor_1;
  var compass;
  var accel;

  app.set('io', io)

  function emitMotorData() {
    io.emit('motor-data', {
      motor_0: {
        isOn: motor_0.getOnStatus(),
        speed: motor_0.getSpeed(),
        value: motor_0.getValue()
      },
      motor_1: {
        isOn: motor_1.getOnStatus(),
        speed: motor_1.getSpeed(),
        value: motor_1.getValue()
      }
    })
  }

  function getHeading(compass, accel) {
    var heading = Math.round(180 * Math.atan2(compass.y_axis, compass.x_axis) / Math.PI);
    if (heading < 0) {
      heading += 360
    }
    return heading
  }

  function getRoll(accel) {
    return Math.atan(accel.y_axis / Math.sqrt(Math.pow(accel.x_axis, 2) + Math.pow(accel.z_axis, 2)))
  }

  function getPitch(accel) {
    return Math.atan(accel.x_axis / Math.sqrt(Math.pow(accel.y_axis, 2) + Math.pow(accel.z_axis, 2)))
  }

  function emitSensorData(sensor) {
    Promise.all([
      compass.read(sensor),
      accel.read(sensor)
    ])
      .then(([compass_data, accel_data]) => {
        io.emit('new-data', {
          compass: {
            x_axis: compass_data.x_axis,
            y_axis: compass_data.y_axis,
            z_axis: compass_data.z_axis,
            heading: getHeading(compass_result, accel_result)
          },
          accel: {
            x_axis: accel_data.x_axis,
            y_axis: accel_data.y_axis,
            z_axis: accel_data.z_axis,
            roll: getRoll(accel_result),
            pitch: getPitch(accel_result)
          }
        })
      })
      .catch(err => {
        console.log(err)
        io.emit('error-reading-data', {
          error: err
        })
      })
  }

  io.on('connection', socket => {
    console.log('client connected')
    // Open Bus
    i2c.openPromisified(1)
      .then(sensor => {

        /* SENSORS W/ I2C */
        socket.on('init-sensors', data => {
          compass = new Compass(data.compass)
          // gyro = new Gyro(data.gyro)
          accel = new Accel(data.accel)

          compass.start(sensor).then(() => {
            console.log('*** Compass Ready')
            accel.start(sensor).then(() => {
              console.log('*** Accel Ready')
            })
          })
        })

        socket.on('ready-for-data', data => {
          setInterval(emitSensorData, 100, sensor)
        })

        socket.on('disconnect', data => {
          sensor.close()
          console.log('client disconnected')
        })
      })

    /* SENSORS w/o I2C */
    socket.on('zero-accel-xy', _ => {
      accel.zeroXY()
    })

    socket.on('zero-accel-z', _ => {
      accel.zeroZ()
    })

    socket.on('zero-accel-clear', _ => {
      accel.zeroClear()
    })

    /* MOTORS */
    socket.on('init-motors', data => {
      motor_0 = new Motor(data.motor_0_pin)
      motor_1 = new Motor(data.motor_1_pin)
      console.log('*** Motors Ready')
      emitMotorData()
    })

    socket.on('motor-on', data => {
      if (data.motor == 0) {
        motor_0.setOn().then(() => {
          emitMotorData()
        })
      } else if (data.motor == 1) {
        motor_1.setOn().then(() => {
          emitMotorData()
        })
      }
    })

    socket.on('motor-off', data => {
      if (data.motor == 0) {
        motor_0.setOff();
        // console.log('*** motor_0 off')
      } else if (data.motor == 1) {
        motor_1.setOff();
        // console.log('*** motor_1 off')
      }
      emitMotorData()
    })

    socket.on('adjust-speed', data => {
      if (data.motor == 0) {
        motor_0.setSpeed(data.speed)
        // console.log('*** motor_0 adjust speed')
      } else if (data.motor == 1) {
        motor_1.setSpeed(data.speed)
        // console.log('*** motor_1 adjust speed')
      }
      emitMotorData()
    })

    socket.on('tune', data => {
      var mid = 68;
      motor_0.tune(mid - data.offset);
      motor_1.tune(data.offset - mid);
      // console.log(`*** tune ${data.offset}`);
      emitMotorData()
    })
  })
}

module.exports = { init }
