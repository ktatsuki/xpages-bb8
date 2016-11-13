var lat = null, lng, alt, accLatlng, accAlt, heading, speed; // Location Info
var alpha, beta, gamma; // gyro sensor
var ac = {}, acg = {}, rot = {}; // motion sensor
var battery, battery_level, battery_discharging; // battery
var client; // MQTT client
var phoneData = {};
phoneData.d = {};
var motionLock = false;

var deviceid = 'xxxxxxxx';
var pubTopic = 'iot-2/type/sphero/id/' + deviceid + '/cmd/run/fmt/json';
var mqtt_host = 'xxxxxx.messaging.internetofthings.ibmcloud.com';
var mqtt_s_port = '8883';
var org = 'xxxxxx';
var apiKey = 'xxxxxxxxxxxxxxxxxx';
var apiToken = 'xxxxxxxxxxxxxxxxxx';


$( function() {
	// deviceId
	console.log('deviceId='+deviceid);
	
	// MQTT Connect
	MQTT_Connect();

	// Get Location info
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(GetLocation, GetLocationError); // Get current location
	} else {
		console.log("Your device does not support GeoLacation API."); // alert
	}

	// Gyro Sensor
	if (window.DeviceOrientationEvent) {
		window.addEventListener("deviceorientation", deviceOrientation);
	}
	// Motion Sensor
	if (window.DeviceMotionEvent) {
		window.addEventListener("devicemotion", deviceMotion);
	}

	// Battery
	battery = navigator.battery || navigator.mozBattery
			|| navigator.webkitBattery;
	if (battery) {
		battery.addEventListener("levelchange", updateBatteryStatus);
	} else {
		battery_level = "N/A";
		battery_discharging = "N/A";
	}

});

// Location Info
function GetLocation(position) {
	lat = position.coords.latitude;
	lng = position.coords.longitude;
	accLatlng = position.coords.accuracy;
	alt = position.coords.altitude;
	accAlt = position.coords.altitudeAccuracy;
	heading = position.coords.heading; // 0=North,90=East,180=South,270=West
	speed = position.coords.speed;
	RenderHtml();
	MQTT_Publish();
}
function GetLocationError(error) {
	console.log("Geolocation Error");
}

// Gyro Sensor
function deviceOrientation(event) {
	alpha = event.alpha;
	beta = event.beta; // tiltFB
	gamma = event.gamma; // tiltLR

	var txtDetect = "";
		
	var d = new Date();  
	var f = 'HH:mm:ss.fff';  
	var strDt = comDateFormat(d, f);
	
//	$('#detectmotion').html(txtDetect+"<br />"+strDt);

	RenderHtml();
//	MQTT_Publish();
}

// Motion Sensor
function deviceMotion(event) {
	if(motionLock) return;
	
	event.preventDefault();
	ac = event.acceleration;
	acg = event.accelerationIncludingGravity;
	rot = event.rotationRate;
	
	var d = new Date();  
	var f = 'HH:mm:ss.fff';  
	var strDt = comDateFormat(d, f);

	if(acg.y < -15){
		$('#detectmotion').html("RUN TO FORWARD!!!!!! : "+strDt);
		Publish("#forward");
		motionLock = true;
	}
	else if(acg.y > 15){
		$('#detectmotion').html("RUN TO BACK!!!!!! : "+strDt);
		Publish("#back"); 
		motionLock = true;
	}
	else if(acg.x < -10){
		$('#detectmotion').html("RUN TO RIGHT!!!!!! : "+strDt);
		Publish("#right"); 
		motionLock = true;
	}
	else if(acg.x > 10){
		$('#detectmotion').html("RUN TO LEFT!!!!!! : "+strDt);
		Publish("#left");
		motionLock = true;
	}

	if(motionLock){
		setTimeout(function(){
			motionLock = false;
	    }, 1500);
	}
	
	RenderHtml();
//	MQTT_Publish();
}

// Battery
function updateBatteryStatus(event) {
	battery_level = battery.level;
	battery_discharging = battery.discharging;
	RenderHtml();
	MQTT_Publish();
}

function RenderHtml() {
	// Location Info
	if (lat !== null) {
		$('#lat').html(lat);
	}
	if (lng !== null) {
		$('#lng').html(lng);
	}
	if (accLatlng !== null) {
		$('#accLatlng').html(accLatlng);
	}
	if (alt !== null) {
		$('#alt').html(alt);
	}
	if (accAlt !== null) {
		$('#accAlt').html(accAlt);
	}
	if (heading !== null) {
		$('#heading').html(heading);
	}
	if (speed !== null) {
		$('#speed').html(speed);
	}
	//Gyro Sensor
	if (alpha !== null) {
		$('#alpha').html(alpha);
	}
	if (beta !== null) {
		$('#beta').html(beta);
	}
	if (gamma !== null) {
		$('#gamma').html(gamma);
	}
	// Motion Sensor
	if (ac !== null) {
		$('#ac_x').html(ac.x);
		$('#ac_y').html(ac.y);
		$('#ac_z').html(ac.z);
	}
	if (acg !== null) {
		$('#acg_x').html(acg.x);
		$('#acg_y').html(acg.y);
		$('#acg_z').html(acg.z);
	}
	if (rot !== null) {
		$('#rot_alpha').html(rot.alpha);
		$('#rot_beta').html(rot.beta);
		$('#rot_gamma').html(rot.gamma);
	}
	// Battery
	if (battery_level !== null) {
		$('#battery_level').html(battery_level);
	}
	if (battery_discharging !== null) {
		$('#battery_discharging').html(battery_discharging);
	}
}

function MQTT_Connect() {
	// ClientID
	var clientId = "a:"+org+":"+deviceid;
	
	console.log("MQTT_Connect starts");
	connect();
	function connect() {
		var wsurl = "wss://"+mqtt_host+":"+mqtt_s_port+"/";
		
		// Generate MQTT client from WebSocketURL and ClientID
		client = new Paho.MQTT.Client(wsurl, clientId);
		
		// Try connect
		client.connect( {
			userName : apiKey,
			password : apiToken,
			onSuccess : onConnect,
			onFailure : failConnect
		});
		client.onConnectionLost = onConnectionLost;
	}
	// Called when connection failed 
	function failConnect(e) {
		console.log("connect failed");
		console.log(e);
	}
	// Called when connection succeeded
	function onConnect() {
		console.log("onConnect");
	}
	function onConnectionLost(response) {
		console.log("onConnectionLost");
		if (response.errorCode !== 0) {
			console.log("onConnectionLost:" + response.errorMessage);
		}
//		clearInterval(msgInterval);
		client.connect( {
			onSuccess : onConnect,
			onFailure : onConnectFailure
		});
	}
}
function MQTT_Publish() {
	if (deviceid != null) {
		var d = {};
		d.location = {};
		d.ori = {};
		d.battery = {};
		d.location.lat = lat;
		d.location.lng = lng;
		d.location.accLatlng = accLatlng;
		d.location.alt = alt;
		d.location.accAlt = accAlt;
		d.ori.alpha = alpha;
		d.ori.beta = beta;
		d.ori.gamma = gamma;
		d.ac = ac;
		d.acg = acg;
		d.rot = rot;
		d.battery.level = battery_level;
		d.battery.discharging = battery_discharging;

		if (d) {
			phoneData.d = d;
			phoneData.publish();
			console.log(d);
		}
	}
}

function Publish(action) {
	console.log(action);
	
	if (deviceid != null) {
		var d = {};
		d.action = action;

		if (d) {
			phoneData.d = d;
			phoneData.publish();
			console.log(d);
		}
	}
}

phoneData.toJson = function() {
	return JSON.stringify(this);
}

phoneData.publish = function() {
	var message = new Paho.MQTT.Message(phoneData.toJson());
	message.destinationName = pubTopic;
	client.send(message);
}
