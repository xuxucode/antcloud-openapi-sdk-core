'use strict';

class ClientError extends Error {
  constructor(errCode, errMsg) {
    super(errMsg);
    this.errCode = errCode;
    this.errMsg = errMsg;
  }
}

class ProviderError extends Error {
  constructor(errCode, errMsg) {
    super(errMsg);
    this.errCode = errCode;
    this.errMsg = errMsg;
  }
}

module.exports = {
  ClientError,
  ProviderError
};
