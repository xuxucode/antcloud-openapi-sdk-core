'use strict';

const utils = require('../lib/utils');
const assert = require('assert');
const {ProviderError} = require('../lib/exception/exceptions');
const ErrorCodes = require('../lib/exception/error_code');

describe('utils test', function () {
  it('test is success resp', function () {
    assert(utils.isSuccessResp({result_code: 'OK', a: 1}) === true);
    assert(utils.isSuccessResp({a: 1}) === false);
  });

  it('test build custom form normal params', function () {
    const params = {
      'qinghua': {
        'teacher': {
          'name': 'aaa',
          'sex': 'male',
          'age': 19
        },
        'students': [
          {
            'name': 's1',
            'sex': 'female',
            'age': 10,
          },
          {
            'name': 's2',
            'sex': 'male',
            'age': 20,
          },
          {
            'name': 's3',
            'sex': 'female',
            'age': 30
          }
        ],
      }
    };
    const expected = {
      'qinghua.teacher.name': 'aaa',
      'qinghua.teacher.sex': 'male',
      'qinghua.teacher.age': 19,
      'qinghua.students.1.name': 's1',
      'qinghua.students.1.sex': 'female',
      'qinghua.students.1.age': 10,
      'qinghua.students.2.name': 's2',
      'qinghua.students.2.sex': 'male',
      'qinghua.students.2.age': 20,
      'qinghua.students.3.name': 's3',
      'qinghua.students.3.sex': 'female',
      'qinghua.students.3.age': 30,
    };
    assert.deepEqual(utils.buildCustomFormParams(params), expected); // using deep
  });

  it('test build custom form empty params', function () {
    const params = {};
    const expected = {};
    assert.deepEqual(utils.buildCustomFormParams(params), expected); // using deep
  });

  it('test sign', function () {
    const params = {
      'method': 'antcloud.acm.tenant.get',
      'req_msg_id': 'c60a76d67f57431c89d3d046e7f84a40',
      'access_key': 'LTAIyqaeoWfELqMg',
      'version': '1.0',
      'sign_type': 'HmacSHA1',
      'tenant': 'tenant',
      'req_time': '2018-03-21T03:41:59Z'
    };
    const secret = 'BXXb9KtxtWtoOGui88kcu0m6h6crjW';
    const expected = '0MJMBmupGPBF1EHokaBF9cmmMuw=';
    assert(utils.sign(params, secret) === expected);
  });

  it('test extract resp str to sign', function () {
    const result1 = utils.extractRespStrToSign('{"response":{"a":1,"c":"hello"}, "sign":"abcde"}'); // 标准格式
    const result2 = utils.extractRespStrToSign('{"response":{"a":1,    "c":"hello"}, "sign":"abcde"}'); // response中带较多空格
    const result3 = utils.extractRespStrToSign(`{"response":{"a":1,
            "c":"hello"}, "sign":"abcde"}`);
    const result4 = utils.extractRespStrToSign('{"sign":"abcde", "response":{"a":1,"c":"hello"}}'); // response和sign换个位置
    const result5 = utils.extractRespStrToSign('{"sign":"abcde", "response":{"a":1,    "c":"hello"}}');
    const result6 = utils.extractRespStrToSign(`{"sign":"abcde", "response":{"a":1,
            "c":"hello"}}`);
    assert(result1 === '{"a":1,"c":"hello"}');
    assert(result2 === '{"a":1,    "c":"hello"}');
    assert(result3 === `{"a":1,
            "c":"hello"}`);
    assert(result4 === '{"a":1,"c":"hello"}');
    assert(result5 === '{"a":1,    "c":"hello"}');
    assert(result6 === `{"a":1,
            "c":"hello"}`);
  });

  it('deserialize form params', function () {
    const params = {
      'input_string': 'hello',
      'input_num': 123,
      'input_arr.1': 'a',
      'input_arr.2': 'b',
      'qinghua.teacher.name': 'aaa',
      'qinghua.teacher.sex': 'male',
      'qinghua.teacher.age': 19,
      'qinghua.students.1.name': 's1',
      'qinghua.students.1.sex': 'female',
      'qinghua.students.1.age': 10,
      'qinghua.students.2.name': 's2',
      'qinghua.students.2.sex': 'male',
      'qinghua.students.2.age': 20,
      'qinghua.students.3.name': 's3',
      'qinghua.students.3.sex': 'female',
      'qinghua.students.3.age': 30,
    };
    const expected = {
      'input_string': 'hello',
      'input_num': 123,
      'input_arr': ['a', 'b'],
      'qinghua': {
        'teacher': {
          'name': 'aaa',
          'sex': 'male',
          'age': 19
        },
        'students': [
          {
            'name': 's1',
            'sex': 'female',
            'age': 10,
          },
          {
            'name': 's2',
            'sex': 'male',
            'age': 20,
          },
          {
            'name': 's3',
            'sex': 'female',
            'age': 30
          }
        ],
      }
    };
    assert.deepEqual(utils.deserialize(params), expected); // using deep
  });

  it('deserialize empty form params', function () {
    const params = {};
    const expected = {};
    assert.deepEqual(utils.deserialize(params), expected); // using deep
  });

  it('test check sign and deserialize', function () {
    const gwRequestParams = {
      'method': 'antcloud.acm.tenant.get',
      'req_msg_id': 'c60a76d67f57431c89d3d046e7f84a40',
      'access_key': 'LTAIyqaeoWfELqMg',
      'version': '1.0',
      'sign_type': 'HmacSHA1',
      'tenant': 'tenant',
      'req_time': '2018-03-21T03:41:59Z',
      'input_string': 'hello',
      'input_num': 123,
      'input_arr.1': 'a',
      'input_arr.2': 'b',
      'input_arr.3': 'c',
      'sign': '1dFTKHohI8nkmQNSLH5eRxyJoBk=',
    };
    const secret = 'BXXb9KtxtWtoOGui88kcu0m6h6crjW';
    const expected = {
      method: 'antcloud.acm.tenant.get',
      req_msg_id: 'c60a76d67f57431c89d3d046e7f84a40',
      access_key: 'LTAIyqaeoWfELqMg',
      version: '1.0',
      sign_type: 'HmacSHA1',
      tenant: 'tenant',
      req_time: '2018-03-21T03:41:59Z',
      input_string: 'hello',
      input_num: 123,
      input_arr: ['a', 'b', 'c']
    };
    assert.deepEqual(utils.validateRequestSignAndDeserialize(gwRequestParams, secret), expected);
  });

  it('test check sign and deserialize, throw invalid params', function () {
    const gwRequestParams = {
      'method': 'antcloud.acm.tenant.get',
      'req_msg_id': 'c60a76d67f57431c89d3d046e7f84a40',
      'access_key': 'LTAIyqaeoWfELqMg',
      'version': '1.0',
      'tenant': 'tenant',
      'req_time': '2018-03-21T03:41:59Z',
      'input_string': 'hello',
      'input_num': 123,
      'input_arr.1': 'a',
      'input_arr.2': 'b',
      'input_arr.3': 'c',
    };
    const secret = 'BXXb9KtxtWtoOGui88kcu0m6h6crjW';
    assert.throws(() => { utils.validateRequestSignAndDeserialize(gwRequestParams,secret); }, (err)=> {
      return err instanceof ProviderError && err.errCode === ErrorCodes.PROVIDER_INVALID_PARAMETER;
    });
  });

  it('test check sign and deserialize, throw invalid signature', function () {
    const gwRequestParams = {
      'method': 'antcloud.acm.tenant.get',
      'req_msg_id': 'c60a76d67f57431c89d3d046e7f84a40',
      'access_key': 'LTAIyqaeoWfELqMg',
      'version': '1.0',
      'sign_type': 'HmacSHA1',
      'tenant': 'tenant',
      'req_time': '2018-03-21T03:41:59Z',
      'input_string': 'hello',
      'input_num': 123,
      'input_arr.1': 'a',
      'input_arr.2': 'b',
      'input_arr.3': 'c',
      'sign': 'aaaa',
    };
    const secret = 'BXXb9KtxtWtoOGui88kcu0m6h6crjW';
    assert.throws(() => { utils.validateRequestSignAndDeserialize(gwRequestParams,secret); }, (err)=> {
      return err instanceof ProviderError && err.errCode === ErrorCodes.PROVIDER_BAD_SIGNATURE;
    });
  });
});