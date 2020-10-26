#!/usr/bin/env node

const axios = require('axios')
const inquirer = require('inquirer')
let imei, token
axios.defaults.baseURL = 'https://app.ecpiot.co.il/mobile/mobilecommand'

console.log('\nYou\'ll need the phone that was registered to Electra Smart to get OTP password via SMS.\n')

var questions = [
	{
		type: 'input',
		name: 'phone',
		message: 'Please insert the phone number registered to Electra Smart (e.g. 0524001234):',
		validate: function (value) {
			const pass = value.match(/^0\d{8,9}$/i)
			if (!pass)
				return 'Please enter a valid phone number'

			return new Promise((resolve, reject) => {
				imei = generateIMEI()
				const data = {
					'pvdid': 1,
					'id': 99,
					'cmd': 'SEND_OTP',
					'data': {
						'imei': imei,
						'phone': value
					}
				}
				axios.post(null, data)
					.then(() => {
						resolve(true)
					})
					.catch(err => {
						const error = `ERROR: "${err.response ? (err.response.data.error_description || err.response.data.error) : err}"`
						console.log(error)
						reject(error)
					})

			})

		}
	},
	{
		type: 'input',
		name: 'code',
		message: 'Please enter the OTP password received at your phone:',
		validate: function (value, answers) {
			const pass = value.match(/^\d{4}$/i)
			if (!pass)
				return 'Please enter a valid code (4 digits)'

			return new Promise((resolve, reject) => {
				const data = {
					'pvdid': 1,
					'id': 99,
					'cmd': 'CHECK_OTP',
					'data': {
						'imei': imei,
						'phone': answers.phone,
						'code': value,
						'os': 'android',
						'osver': 'M4B30Z'
					}
				}
				axios.post(null, data)
					.then(response => {
						if (response.data.data && response.data.data.token) {
							token = response.data.data.token
							resolve(true)
						} else {
							const error = `Could NOT get the token: ${response.data.data ? response.data.data.res_desc : JSON.stringify(response.data)}`
							reject(error)
						}
					})
					.catch(err => {
						const error = `Could NOT get the token: : "${err.response ? (err.response.data.error_description || err.response.data.error) : err}"`
						console.log(error)
						reject(error)
					})
			})

		}
	}
]

inquirer.prompt(questions).then(() => {
	console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
	console.log('Your token is ->', token)
	console.log('Your imei is  ->', imei)
	console.log('~~~~~~~~~~~~~~~~~~~~~~  DONE  ~~~~~~~~~~~~~~~~~~~~~~\n')
})

function generateIMEI () {
	const min = Math.pow(10, 7)
	const max = Math.pow(10, 8) -1
	return '2b950000' + (Math.floor(Math.random() * (max - min) + min) + 1)
}