const Joi = require('joi');
const path = require('path');
// require and configure dotenv, will load vars in .env in PROCESS.ENV
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// define validation for all the env vars
const envVarsSchema = Joi.object({
	DEVDB: Joi.string(),
	PORT: Joi.number().default(8686),
	SECRET:Joi.string(),
	DEVAPPURL: Joi.string(),
	PD: Joi.string(),
	ADMIN: Joi.string(),
	DEVPD: Joi.string(),
	GPOKEY: Joi.string(),
	DEVPD: Joi.string(),
	AWS_KEY_ID: Joi.string(),
	AWS_SECRET: Joi.string(),
	SLACK_CLIENT_ID: Joi.string(),
	SLACK_CLIENT_SECRET: Joi.string(),
	SLACK_SIGNING_SECRET: Joi.string(),
	SLACK_VERIFICATION_TOKEN: Joi.string(),
	SLACK_CALLBACK_DEV: Joi.string(),
	SLACK_CALLBACK: Joi.string(),
	GOOGLE_KEY: Joi.string(),
	GOOGLE_PICKER_KEY: Joi.string(),
	GOOGLE_CALLBACK_URL: Joi.string(),
	GOOGLE_CALLBACK_URL_DEV: Joi.string(),
	GOOGLE_OAUTH_CLIENTID: Joi.string(),
	GOOGLE_OAUTH_SECRET: Joi.string(),
	GOOGLE_PRIVATE_KEY: Joi.string(),
	TEST_ENV: Joi.boolean().default(false),
	RECORD_ENV: Joi.boolean().default(false)
})
  .unknown()
  .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
	testenv: envVars.TEST_ENV,
	recordenv: envVars.RECORD_ENV,
	accessKeyId: envVars.AWS_KEY_ID,
	secretAccessKey: envVars.AWS_SECRET,
	port: envVars.PORT, 
	admin: envVars.ADMIN
};

module.exports = config;
