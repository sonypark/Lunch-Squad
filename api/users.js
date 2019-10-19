'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));

const decodeJwt = require('../utils/decode-verify-jwt');
const verifyGoogleToken = require('../utils/verifyGoogleToken');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Cognito Post Confirmation Event를 받은 후 DynamoDB에 User 정보 저장
module.exports.registerUserToDynamoDB = async (event, context, callback) => {
  const user_info = {
    TableName: process.env.USER_TABLE,
    Item: {
      userId: event.request.userAttributes.sub,
      email: event.request.userAttributes.email,
      nickname: event.request.userAttributes.nickname
    }
  };

  try {
    const res = await dynamoDb.put(user_info).promise();

    if (res) {
      // Send successful message
      context.succeed(event);
    }
  } catch (error) {
    // Send error message
    context.fail(err);
  }
};

module.exports.verifyJwt = async (event, context, callback) => {
  try {
    const result = await decodeJwt(event.headers);
    if (result) {
      console.log(`Verification is ${result.isValid}`);
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(result)
      });
    }
  } catch (error) {
    console.error(error);
  }
};

module.exports.verifyGoogleLogin = async (event, context, callback) => {
  try {
    const result = await verifyGoogleToken(event.headers.token);
    if (result) {
      console.log(`Verification success with ${result}`);
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(result)
      });
    }
  } catch (error) {
    console.error(error);
  }
};
