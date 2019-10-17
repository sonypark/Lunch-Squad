'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Cognito Post Confirmation Event를 받은 후 DynamoDB에 User 정보 저장
module.exports.registerUserToDynamoDB = async (event, context, callback) => {
  const user_info = {
    TableName: process.env.USER_TABLE,
    Item: {
      userId: uuid.v4(),
      email: event.request.userAttributes.email,
      nickname: event.request.userAttributes.nickname
    }
  };

  try {
    const res = await dynamoDb.put(user_info).promise();

    if (res) {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully register user with nickname ${user_info.nickname}`,
          userId: user_info.userId
        })
      });
    }
  } catch (error) {
    console.error(error);
  }
};
