#include <Wire.h>
#include <MPU6050.h>

MPU6050 mpu;

void setup() {
 Serial.begin(9600);
 Wire.begin();
 mpu.initialize();
}

void loop() {
 int16_t gx, gy, gz;
 mpu.getRotation(&gx, &gy, &gz);
 float x = gx / 1000;
 float y = gy / 1000;
 float z = gz / 1000;
 Serial.print("X: "); Serial.print(x);
 Serial.print(" Y: "); Serial.print(y);
 Serial.print(" Z: "); Serial.println(z);

 delay(1000);
}
