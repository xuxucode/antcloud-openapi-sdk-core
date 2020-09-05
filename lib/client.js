'use strict';

const assert = require('assert');
const JSON = require('json-bigint');
const uuidv4 = require('uuid/v4');
const utils = require('./utils');
const { ClientError } = require('./exception/exceptions');
const ErrorCodes = require('./exception/error_code');

const NODEJS_SDK_VERSION = 'NODEJS-SDK-1.0.0';
const DEFAULT_SIGN_TYPE = 'HmacSHA1';

class AntCloudClient {
  /**
   * 构造函数
   * @param config
   */
  constructor(config) {
    assert(config, 'config can\'t be null');
    assert(config.endpoint, 'endpoint can\'t be null');
    assert(config.accessKey, 'accessKey can\'t be null');
    assert(config.accessSecret, 'accessSecret can\'t be null');

    if (config.endpoint.endsWith('/')) {
      config.endpoint = config.endpoint.slice(0, -1);
    }

    this.config = config;
    this.httpclient = config.httpclient || require('urllib');
  }

  get endpoint() {
    return this.config.endpoint;
  }

  get accessKey() {
    return this.config.accessKey;
  }

  get accessSecret() {
    return this.config.accessSecret;
  }

  /**
   * 执行http请求
   * @param request
   * @param opts
   * @returns {PromiseLike<T> | Promise<T>}
   */
  execute(request, opts = {}) {
    // 校验请求参数
    assert(request.method, 'method can\'t be null');
    assert(request.version, 'version can\'t be null');

    // 构造request最后发送的content
    const content = utils.buildCustomFormParams(request);

    Object.assign(content, {
      req_msg_id: uuidv4().replace(/-/g, ''),
      req_time: new Date().toISOString(),
      sdk_version: NODEJS_SDK_VERSION,
      access_key: this.accessKey,
      sign_type: DEFAULT_SIGN_TYPE,
    });
    if (this.config && this.config.securityToken) {
      content.security_token = this.config.securityToken;
    }

    content.sign = utils.sign(content, this.accessSecret);

    const options = Object.assign({
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      data: content,
      checkRespSign: true // 默认需要校验resp的签名
    }, opts);

    return this.httpclient.request(this.endpoint, options)
      .then(res => {
        const body = res.data;
        // 解析response
        if (options.rawBody) {
          return body;
        }

        // json parse
        let bodyDecoded = JSON.parse(body + '');
        if (!bodyDecoded || !bodyDecoded['response']) {
          // should has real response content
          return Promise.reject(new ClientError(ErrorCodes.SDK_TRANSPORT_ERROR, `Unexpected gateway response: ${body}`));
        }

        const respContent = bodyDecoded['response'];
        if (utils.isSuccessResp(respContent) && options.checkRespSign) {
          // 校验response签名
          if (!bodyDecoded['sign']) {
            return Promise.reject(new ClientError(ErrorCodes.SDK_BAD_SIGNATURE, 'Empty signature in response'));
          }

          const signature = bodyDecoded['sign'];
          const strToSign = utils.extractRespStrToSign(body);
          if (utils.sign(strToSign, this.accessSecret) !== signature) {
            return Promise.reject(new ClientError(ErrorCodes.SDK_BAD_SIGNATURE, 'Invalid signature in response'));
          }
        }

        return respContent;
      })
      .catch(err => {
        return Promise.reject(new ClientError(ErrorCodes.SDK_TRANSPORT_ERROR, `Server connect error, msg: ${err.message}`));
      });
  }
}

module.exports = AntCloudClient;