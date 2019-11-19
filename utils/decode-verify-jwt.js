"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var util_1 = require("util");
var Axios = require("axios");
var jsonwebtoken = require("jsonwebtoken");
var jwkToPem = require("jwk-to-pem");
var cognitoRegion = process.env.COGNITO_REGION;
var cognitoPoolId = process.env.COGNITO_POOL_ID || '';
if (!cognitoPoolId) {
    throw new Error('env var required for cognito pool');
}
var cognitoIssuer = "https://cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoPoolId;
var cacheKeys;
var getPublicKeys = function () { return __awaiter(void 0, void 0, void 0, function () {
    var url, publicKeys;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!cacheKeys) return [3 /*break*/, 2];
                url = cognitoIssuer + "/.well-known/jwks.json";
                return [4 /*yield*/, Axios["default"].get(url)];
            case 1:
                publicKeys = _a.sent();
                cacheKeys = publicKeys.data.keys.reduce(function (agg, current) {
                    var pem = jwkToPem(current);
                    agg[current.kid] = { instance: current, pem: pem };
                    return agg;
                }, {});
                return [2 /*return*/, cacheKeys];
            case 2: return [2 /*return*/, cacheKeys];
        }
    });
}); };
var verifyPromised = util_1.promisify(jsonwebtoken.verify.bind(jsonwebtoken));
var handler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var result, token, tokenSections, headerJSON, header, keys, key, claim, currentSeconds, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log("User claim verfiy invoked for " + JSON.stringify(request));
                console.log('TOKEN: ', request.token);
                token = request.token;
                tokenSections = (token || '').split('.');
                if (tokenSections.length < 2) {
                    throw new Error('requested token is invalid');
                }
                headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
                header = JSON.parse(headerJSON);
                return [4 /*yield*/, getPublicKeys()];
            case 1:
                keys = _a.sent();
                key = keys[header.kid];
                if (key === undefined) {
                    throw new Error('claim made for unknown kid');
                }
                return [4 /*yield*/, verifyPromised(token, key.pem)];
            case 2:
                claim = (_a.sent());
                currentSeconds = Math.floor(new Date().valueOf() / 1000);
                if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
                    throw new Error('claim is expired or invalid');
                }
                if (claim.iss !== cognitoIssuer) {
                    throw new Error('claim issuer is invalid');
                }
                if (claim.token_use !== 'access') {
                    throw new Error('claim use is not access');
                }
                console.log("claim confirmed for " + claim.username);
                result = {
                    userId: claim.username,
                    clientId: claim.client_id,
                    isValid: true
                };
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.log(error_1);
                result = { userId: '', clientId: '', error: error_1, isValid: false };
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/, result];
        }
    });
}); };
module.exports = handler;
