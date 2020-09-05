'use strict';

const crypto = require('crypto');
const JSON = require('json-bigint');
const { ProviderError } = require('./exception/exceptions');
const ErrorCodes = require('./exception/error_code');

/**
 * 判断是否请求返回成功
 * @param respContent
 * @returns {*|boolean}
 */
exports.isSuccessResp = respContent => {
  return respContent.result_code === 'OK';
};

/**
 * 构建标准的表单参数
 * @param bodyParams
 * @returns {{}}
 */
exports.buildCustomFormParams = bodyParams => {
  let ret = {};

  function build(path, param) {
    if (param === null || param === undefined) {
      return;
    }
    if (typeof param === 'object') {
      Object.keys(param).forEach((key) => {
        const value = param[key];
        if (Array.isArray(param)) {
          build(`${path}.${parseInt(key) + 1}`, value);
        } else {
          build(`${path}.${key}`, value);
        }
      });
    } else {
      ret[path.substring(1)] = param;
    }
  }

  build('', bodyParams);
  return ret;
};

/**
 * 计算签名
 * @param params
 * @param secret
 * @returns {*}
 */
exports.sign = (params, secret) => {
  // 1. 计算待签名字符串
  let stringToSign = '';
  if (typeof params === 'string') {
    stringToSign = params;
  } else {
    // key排序
    // 做标准的url encode，得到待签名字符串
    stringToSign = Object.keys(params).sort().map(key => {
      return exports._standardUrlEncode(key) + '=' + exports._standardUrlEncode(params[key]);
    }).join('&');
  }

  // 2. 计算签名
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(stringToSign);
  return hmac.digest('base64');
};

/**
 * 抽取出需要签名的response字符串
 * response中的固定格式为：{"response": RESPONSE_JSON, "sign": SIGN_STRING}
 * 其中RESPONSE_JSON为需要签名的字段，SIGN_STRING为产品返回的签名
 * @param respBody string 原始的response内容
 * @returns {*}
 */
exports.extractRespStrToSign = respBody => {
  // 先看一下通过decode再encode，判断是否刚好是原始respBody的子串的，是的话直接返回
  const respDecoded = JSON.parse(respBody);
  const respContent = respDecoded['response'];
  const respContentJsonStr = JSON.stringify(respContent);
  if (respBody.includes(respContentJsonStr)) {
    return respContentJsonStr;
  }

  // 如果不是的话（比如因为respBody中带有一些不必要的空格换行等字符），我们需要自己手动解析出来
  // 首先判断response和sign在json string中哪个排在前面
  const respNodeKey = '"response"';
  const signNodeKey = '"sign"';
  const respFirstOccurIdx = respBody.indexOf(respNodeKey);
  const signFirstOccurIdx = respBody.indexOf(signNodeKey);
  if (respFirstOccurIdx === -1 || signFirstOccurIdx === -1) {
    // 没有response或者sign直接返回空
    return null;
  }

  const extractStartIdx = respBody.indexOf('{', respFirstOccurIdx);

  let extractEndIdx;
  if (respFirstOccurIdx < signFirstOccurIdx) {
    // response出现在sign前面
    const signLastOccurIdx = respBody.lastIndexOf(signNodeKey);
    extractEndIdx = respBody.lastIndexOf('}', signLastOccurIdx);
  } else {
    // response出现在sign后面
    extractEndIdx = respBody.lastIndexOf('}', respBody.length - 2);
  }

  return respBody.substring(extractStartIdx, extractEndIdx + 1);
};

/**
 * 返回标准的url encode之后的字符串
 * 注意，只有字符 A-Z、a-z、0-9 以及字符-、_、.、~不编码
 * @param str
 * @returns {string}
 * @private
 */
exports._standardUrlEncode = str => {
  let result = encodeURIComponent(str);
  return result
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
};

/**
 * 校验签名，并且反序列化网关请求参数
 * @param gwRequestParams
 * @param accessSecret
 */
exports.validateRequestSignAndDeserialize = (gwRequestParams, accessSecret) => {
  // validate sign
  const {paramsWithoutSign} = exports.validateRequestSign(gwRequestParams, accessSecret);

  // deserialize
  return exports.deserialize(paramsWithoutSign);
};

/**
 * 校验请求签名值是否正确
 * @param gwRequestParams
 * @param accessSecret
 */
exports.validateRequestSign = (gwRequestParams, accessSecret) => {
  // check params
  if (gwRequestParams === null ||
    gwRequestParams === undefined ||
    !('sign_type' in gwRequestParams) ||
    !('sign' in gwRequestParams)) {
    throw new ProviderError(ErrorCodes.PROVIDER_INVALID_PARAMETER, 'Gateway request params is invalid');
  }

  // filter out params to sign
  // elegant method used to filter out params to sign with object rest spread syntax, refer to: https://stackoverflow.com/a/45898081/3868703
  const {sign, ...paramsWithoutSign} = gwRequestParams;

  // check sign
  if (exports.sign(paramsWithoutSign, accessSecret) !== sign) {
    throw new ProviderError(ErrorCodes.PROVIDER_BAD_SIGNATURE, 'The signature of gateway request params is invalid');
  }

  return {
    sign,
    paramsWithoutSign
  };
};

/**
 * 将properties形式的网关请求form表单参数反序列化成正常的对象
 * @param gwRequestParams
 */
exports.deserialize = gwRequestParams => {
  let result = {};
  for (const entry of Object.entries(gwRequestParams)) {
    const key = entry[0];
    const value = entry[1];
    const keyParts = key.split('.');
    let node = result;
    // 先遍历keyParts，如果part不存在值就先初始化，直到遍历到parts的最后一个
    for (let i = 1; i < keyParts.length; i++) {
      let keyPart = keyParts[i];
      // eslint-disable-next-line
      if (exports._getPartValue(node, keyParts[i - 1]) != null ) {
        node = exports._getPartValue(node, keyParts[i - 1]);
      }
      else {
        let child;
        if (keyPart.match(/\d+/)) {
          child = [];
        }
        else {
          child = {};
        }
        exports._setPartValue(node, keyParts[i - 1], child);
        node = child;
      }
    }
    // 设置当前part的值
    exports._setPartValue(node, keyParts[keyParts.length - 1], value);
  }
  return result;
};

/**
 * @param node
 * @param key
 * @param value
 * @private
 */
exports._setPartValue = (node, key, value) => {
  if (node instanceof Array) {
    let index = parseInt(key) - 1;
    node[index] = value;
  }
  else if (node instanceof Object) {
    node[key] = value;
  }
};

/**
 * @param node
 * @param key
 * @returns {*}
 * @private
 */
exports._getPartValue = (node, key) => {
  if (node instanceof Array) {
    let index = parseInt(key) - 1;
    while (index >= node.length)  {
      node.push(null);
    }
    return node[index];
  }
  else if (node instanceof Object) {
    return node[key];
  }
};

/**
 * 构造响应成功的response字符串
 * @param respData
 * @param reqMsgId
 * @param accessSecret
 * @returns {*}
 */
exports.buildSuccessResponseStr = (respData, reqMsgId, accessSecret) => {
  const finalResp = {};
  respData.req_msg_id = reqMsgId;
  respData.result_code = 'OK';
  respData.result_msg = 'Success';
  const sign = exports.sign(JSON.stringify(respData), accessSecret.toString());
  finalResp.response = respData;
  finalResp.sign = sign;
  return JSON.stringify(finalResp);
};

/**
 * 构造响应异常的response字符串
 * @param reqMsgId
 * @param errorCode
 * @param errorMsg
 * @returns {*}
 */
exports.buildErrorResponseStr = (reqMsgId, errorCode, errorMsg) => {
  const finalResp = {
    response: {
      req_msg_id: reqMsgId,
      result_code: errorCode,
      result_msg: errorMsg,
    }
  };
  return JSON.stringify(finalResp);
};
