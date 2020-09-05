'use strict';

const AntCloudClient = require('../lib/client');
const assert = require('assert');

describe('Client test', function () {
  it('test execute request', () => {
    const client = new AntCloudClient({
      endpoint: 'http://apigw.dev.pub.jr.alipay.net/gateway.do',
      accessKey: 'LTAIyqaeoWfELqMg',
      accessSecret: 'BXXb9KtxtWtoOGui88kcu0m6h6crjW',
    });

    // we should return promise when using mocha
    return client.execute({
      method: 'antcloud.demo.gateway.check.echo',
      version: '1.0',
      inputString: 'hello world',
      inputDemo: {
        someBoolean: true,
        someInt: 123,
        someList: ['hello', 'world']
      }
    }).then((resp) => {
      assert(resp.output_string === 'hello world');
    });
  });
});
