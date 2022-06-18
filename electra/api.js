const axiosLib = require('axios');
let axios = axiosLib.create();

let log, ssid, storage, lastSIDRequest

module.exports = async function (platform) {
	log = platform.log
	storage = platform.storage
	ssid = await storage.getItem('electra-ssid')

	axios.defaults.baseURL = 'https://app.ecpiot.co.il/mobile/mobilecommand'
	axios.defaults.headers = {
		'user-agent': 'Electra Client'
	}

	
	return {
	
		getDevices: async () => {
			const sid = await getSID(platform.imei, platform.token)
			const devicesResponse = await apiRequest(sid, 'GET_DEVICES')

			if (!Array.isArray(devicesResponse.devices))
				throw 'Can\'t get devices from Electra API'
		
			let devices = devicesResponse.devices.filter(device =>  device.deviceTypeName === 'A/C' && !platform.excludeList.includes(device.id) && !platform.excludeList.includes(device.sn) && !platform.excludeList.includes(device.mac) && !platform.excludeList.includes(device.name))
			devices = devices.map(async device => {
				try {
					const state = await apiRequest(sid, 'GET_LAST_TELEMETRY', {'id': device.id, 'commandName': 'OPER,DIAG_L2'})
					return {
						...device,
						state: state.commandJson
					}
					
				} catch (err) {
					log(err)
					log(`COULD NOT get ${device.name} (${device.id}) state !! skipping device...`)
					throw err
				}
			})
			
			return await Promise.all(devices)
		},
	
		setState: async (id, state) => {
			const sid = await getSID(platform.imei, platform.token)
			if ('AC_STSRC' in state)
				state['AC_STSRC'] = 'WI-FI'

			const data = {
				'id': id,
				'commandJson': JSON.stringify({'OPER': state})
			}
			return await apiRequest(sid, 'SEND_COMMAND', data)
		}
	}

}


function apiRequest(sid, cmd, data) {
	return new Promise((resolve, reject) => {

		const body = {
			'pvdid': 1,
			'id': 99,
			'cmd': cmd,
			'sid': sid
		}
		if (data)
			body.data = data
	
		log.easyDebug(`Creating request to Electra API --->`)
		log.easyDebug('body: ' + JSON.stringify(body))

		axios.post(null, body)
			.then(response => {
				if (response.data.data) {
					log.easyDebug(`Successful response:`)
					log.easyDebug(JSON.stringify(response.data.data))
					resolve(response.data.data)
				} else {
					const error = `Failed sending API request: ${response.data.data ? response.data.data.res_desc : JSON.stringify(response.data)}`
					reject(error)
				}
			})
			.catch(err => {
				const error = `Failed sending API request: '${err.response ? (err.response.data.error_description || err.response.data.error) : err}'`
				log(error)
				reject(error)
			})
	})
}

function getSID(imei, token) {
	return new Promise((resolve, reject) => {

		if (ssid && new Date().getTime() < ssid.expirationDate) {
			log.easyDebug('Found valid ssid in cache', ssid.key)
			resolve(ssid.key)
			return
		}

		const SIDDelay = 600000 // 10 minutes delay between session id request
		if (lastSIDRequest && new Date().getTime() < (lastSIDRequest + SIDDelay)) {
			log.error('Session ID was requested less than 5 minutes ago! waiting in order to prevent "intruder lockdown"...')
			reject(new Error('Session ID was requested less than 5 minutes ago! waiting in order to prevent "intruder lockdown"...'))
			return
		}

		lastSIDRequest = new Date().getTime()

		let body = {
			'pvdid': 1,
			'id': 99,
			'cmd': 'VALIDATE_TOKEN',
			'data': {
				'imei': imei,
				'token': token,
				'os': 'android',
				'osver': 'M4B30Z'
			}
		}
	
		axios.post(null, body)
			.then(response => {
				if (response.data.data && response.data.data.sid) {
					const newSsid = response.data.data.sid
					log.easyDebug(`Successful SID response: ${newSsid}`)
					ssid = {
						key: newSsid,
						expirationDate: new Date().getTime() + (1000 * 60 * 60) // one hour
					}
					storage.setItem('electra-ssid', ssid)
					resolve(newSsid)
				} else {
					const error = `Could NOT get Session ID: ${response.data.data ? response.data.data.res_desc : JSON.stringify(response.data)}`
					reject(error)
				}
			})
			.catch(err => {
				const error = `Could NOT get Session ID:: : '${err.response ? (err.response.data.error_description || err.response.data.error) : err}'`
				log(error)
				reject(error)
			})
	})
}