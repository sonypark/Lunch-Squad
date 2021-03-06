'use strict';

const uuid = require('uuid');
const Jimp = require('jimp');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const width = 400;
const height = 400;
const thumb_width = 150;
const thumb_height = 150;
const imageType = 'image/png';
const bucket = process.env.BUCKET_NAME;
const shuffle = require('../utils/shuffle');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// 맛집 추가
module.exports.add = async (event, context, callback) => {
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

  try {
    const img = await uploadImageToS3(imageURL, width, height);
    const thumb_img = await uploadImageToS3(
      imageURL,
      thumb_width,
      thumb_height
    );
    const img_url = `https://lunchsquad-restaurant-img.s3.ap-northeast-2.amazonaws.com/${img}`;
    const thumb_img_url = `https://lunchsquad-restaurant-img.s3.ap-northeast-2.amazonaws.com/${thumb_img}`;
    const res = await addRestaurant(
      restaurantInfo(requestBody, img_url, thumb_img_url)
    );
    if (res) {
      callback(null, {
        statusCode: 200,
        headers: {
          'Set-Cookie': 'HttpOnly; Secure; SameSite=Strict'
        },
        body: JSON.stringify({
          message: `Sucessfully submitted restaurant with restaurantName ${restaurantName}`,
          restaurantId: res.id
        })
      });
    }
  } catch (err) {
    console.log(err);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: `Unable to submit restaurant with restaurantName ${restaurantName}`
      })
    });
  }
};

const uploadImageToS3 = async (imageURL, width, height) => {
  let objectId = uuid.v4();
  let objectKey = `resize-${width}x${height}-${objectId}.png`;

  try {
    const image = await fetchImage(imageURL);
    const resizedBuffer = await image
      .resize(width, height)
      .getBufferAsync(imageType);
    const response = await uploadToS3(resizedBuffer, objectKey);

    if (response) {
      return objectKey;
    }
  } catch (error) {
    console.log(error);
  }
};

const addRestaurant = async restaurant => {
  console.log('Adding restaurant');
  const restaurantInfo = {
    TableName: process.env.RESTAURANT_TABLE,
    Item: restaurant
  };
  const res = await dynamoDb.put(restaurantInfo).promise();
  return restaurant;
};

const restaurantInfo = (requestBody, img_url, thumb_img_url) => {
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
    lat: positionX,
    lng: positionY,
    imageURL: img_url,
    thumnailImageURL: thumb_img_url,
    submittedAt: timestamp,
    updatedAt: timestamp
  };
};

// 전체 맛집 리스트 조회
module.exports.list = (event, context, callback) => {
  const params = {
    TableName: process.env.RESTAURANT_TABLE,
    ProjectionExpression:
      'id, restaurantName, foodType, address, recommendedMenu, price, businessHour, contactNumber, recommend, review, lat, lng, imageURL, thumnailImageURL'
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
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Set-Cookie': 'HttpOnly; Secure; SameSite=Strict'
        },
        body: JSON.stringify(data.Items)
      });
    }
  };
  dynamoDb.scan(params, onScan);
};

// 특정 맛집 정보 조회
module.exports.get = async (event, context, callback) => {
  const params = {
    TableName: process.env.RESTAURANT_TABLE,
    Key: {
      id: event.pathParameters.id
    }
  };

  try {
    const result = await dynamoDb.get(params).promise();
    if (result) {
      const response = {
        statusCode: 200,
        headers: {
          'Set-Cookie': 'HttpOnly; Secure; SameSite=Strict'
        },
        body: JSON.stringify(result.Item)
      };
      callback(null, response);
    }
  } catch (error) {
    console.error(error);
    callback(new Error("Couldn't fetch restaurant."));
    return;
  }
};

// 맛집 랜덤 추첨
module.exports.getRandom = (event, context, callback) => {
  const params = {
    TableName: process.env.RESTAURANT_TABLE,
    ProjectionExpression:
      'id, restaurantName, foodType, address, recommendedMenu, price, businessHour, contactNumber, recommend, review, lat, lng, imageURL, thumnailImageURL'
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
      headers: {
        'Set-Cookie': 'HttpOnly; Secure; SameSite=Strict'
      },
      body: JSON.stringify(...shuffle(data.Items).splice(0, 1))
    });
  };
  dynamoDb.scan(params, onRandomScan);
};

// 이미지 업로드
module.exports.uploadImage = async (event, context, callback) => {
  let requestBody = JSON.parse(event.body);
  let imageURL = requestBody.imageURL;
  let objectId = uuid.v4();
  let objectKey = `resize-${width}x${height}-${objectId}.png`;

  try {
    const image = await fetchImage(imageURL);
    const resizedBuffer = await image
      .resize(width, height)
      .getBufferAsync(imageType);
    const response = await uploadToS3(resizedBuffer, objectKey);
    if (response) {
      console.log(`Image ${objectKey} was uploaed and resized`);
      callback(null, {
        statusCode: 200,
        headers: {
          'Set-Cookie': 'HttpOnly; Secure; SameSite=Strict'
        },
        body: JSON.stringify(response)
      });
    }
  } catch (error) {
    console.log(error);
  }
};

/**
 * @param {*} data
 * @param {string} key
 */
const uploadToS3 = (data, key) => {
  return s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: imageType
    })
    .promise();
};

/**
 * @param {url}
 * @returns {Promise}
 */
const fetchImage = url => {
  return Jimp.read(url);
};
