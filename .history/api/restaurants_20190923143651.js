'use strict';

const uuid = require('uuid');
const Jimp = require('jimp');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const width = 200;
const height = 200;
const imageType = 'image/png';
const bucket = process.env.BUCKET_NAME;
const shuffle = require('../utils/shuffle');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// 맛집 추가
module.exports.add = (event, context, callback) => {
  const requestBody = JSON.parse(event.body);
  const {
    name: restaurantName,
    foodType,
    recommendedMenu,
    price,
    location: address,
    businessHour,
    contactNumber,
    recommend,
    review,
    positionX,
    positionY,
    imageURL
  } = requestBody;

  if (
    typeof restaurantName !== 'string' ||
    typeof foodType !== 'string' ||
    typeof recommendedMenu !== 'string' ||
    typeof recommend !== 'number'
  ) {
    console.error('Validation Failed');
    callback(
      new Error("Couldn't add restaurant because of validation errors.")
    );
    return;
  }

  addRestaurant(restaurantInfo(requestBody))
    .then(res => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: `Sucessfully submitted restaurant with restaurantName ${restaurantName}`,
          restaurantId: res.id
        })
      });
    })
    .catch(err => {
      console.log(err);
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: `Unable to submit restaurant with restaurantName ${restaurantName}`
        })
      });
    });
};

const addRestaurant = restaurant => {
  console.log('Adding restaurant');
  const restaurantInfo = {
    TableName: process.env.RESTAURANT_TABLE,
    Item: restaurant
  };
  return dynamoDb
    .put(restaurantInfo)
    .promise()
    .then(res => restaurant);
};

const restaurantInfo = requestBody => {
  const {
    name: restaurantName,
    foodType,
    recommendedMenu,
    price,
    location: address,
    businessHour,
    contactNumber,
    recommend,
    review,
    positionX,
    positionY,
    imageURL
  } = requestBody;

  const timestamp = new Date().getTime();
  return {
    id: uuid.v1(),
    restaurantName: restaurantName,
    foodType: foodType,
    recommendedMenu: recommendedMenu,
    price: price,
    address: address,
    businessHour: businessHour,
    contactNumber: contactNumber,
    recommend: recommend,
    review: review,
    positionX: positionX,
    positionY: positionY,
    imageURL: imageURL,
    submittedAt: timestamp,
    updatedAt: timestamp
  };
};

// 전체 맛집 리스트 조회
module.exports.list = (event, context, callback) => {
  const params = {
    TableName: process.env.RESTAURANT_TABLE,
    ProjectionExpression:
      'id, restaurantName, foodType, address, recommendedMenu, price, businessHour, contactNumber, recommend, review, positionX, positionY'
  };

  console.log('Scanning restaurant table');
  const onScan = (err, data) => {
    if (err) {
      console.log(
        'Scan failed to load data. Error JSON: ',
        JSON.stringify(err, null, 2)
      );
      callback(err);
    } else {
      console.log('Scan succeeded');
      return callback(null, {
        statusCode: 200,
        body: JSON.stringify(data.Items)
      });
    }
  };
  dynamoDb.scan(params, onScan);
};

// 특정 맛집 정보 조회
module.exports.get = (event, context, callback) => {
  const params = {
    TableName: process.env.RESTAURANT_TABLE,
    Key: {
      id: event.pathParameters.id
    }
  };

  dynamoDb
    .get(params)
    .promise()
    .then(result => {
      const response = {
        statusCode: 200,
        body: JSON.stringify(result.Item)
      };
      callback(null, response);
    })
    .catch(error => {
      console.error(error);
      callback(new Error("Couldn't fetch restaurant."));
      return;
    });
};

// 맛집 랜덤 추첨
module.exports.getRandom = (event, context, callback) => {
  const params = {
    TableName: process.env.RESTAURANT_TABLE,
    ProjectionExpression:
      'id, restaurantName, foodType, address, recommendedMenu, price, businessHour, contactNumber, recommend, review, positionX, positionY'
  };

  console.log('Scanning randomly restaurant table');
  const onRandomScan = (err, data) => {
    if (err) {
      console.log(
        'Scan failed to load data. Error JSON: ',
        JSON.stringify(err, null, 2)
      );
      callback(err);
    }
    console.log('Random Scan succeeded');
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify(...shuffle(data.Items).splice(0, 1))
    });
  };
  dynamoDb.scan(params, onRandomScan);
};

// 이미지 업로드
module.exports.uploadImage = (event, context, callback) => {
  let requestBody = JSON.parse(event.body);
  let photoUrl = requestBody.photoUrl;
  let objectId = uuid();
  let objectKey = `resize-${width}x${height}-${objectId}.png`;

  fetchImage(photoUrl)
    .then(image => image.resize(width, height).getBufferAsync(imageType))
    .then(resizedBuffer => uploadToS3(resizedBuffer, objectKey))
    .then(function(response) {
      console.log(`Image ${objectKey} was uploaed and resized`);
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(response)
      });
    })
    .catch(error => console.log(error));
};

/**
 * @param {*} data
 * @param {string} key
 */
function uploadToS3(data, key) {
  return s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: imageType
    })
    .promise();
}

/**
 * @param {url}
 * @returns {Promise}
 */
function fetchImage(url) {
  return Jimp.read(url);
}
