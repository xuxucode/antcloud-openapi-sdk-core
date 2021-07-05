欢迎使用金融云NodeJS SDK，基于官方 @alipay/antcloud-openapi-sdk-core@1.1.2 版本发布。

## 安装

```
$ npm install antcloud-openapi-sdk
```

## SDK使用

1. 创建Client实例并配置对应参数。
2. 创建request对象，填充请求参数。
3. 调用Client类的execute方法，获取响应结果。

```js
const AntCloudClient = require('antcloud-openapi-sdk');

// 创建Client实例
const client = new AntCloudClient({
    endpoint: '<endpoint>',
    accessKey: '<your-access-key>',
    accessSecret: '<your-access-secret>'
    // 如果使用STS，那么可以额外传入securityToken
    // securityToken: 'xxxxxx'
});

// 创建request对象，并填充请求参数
// method和version是必须设置的参数
// 如果访问的是非核心网关（即产品网关），还需设置product_instance_id
const request = {
    method: 'antcloud.demo.gateway.check.echo',
    version: '1.0',
    input_string: 'hello world'
};

// HTTP调用相关的配置，参考https://www.npmjs.com/package/urllib#api-doc
const opt = {
    timeout: 10000, // 配置超时时间，单位为ms，默认为5s
};

// 发送调用请求，解析响应结果
client.execute(request, opt).then((resp) => {
    console.log(resp);
});
```

### utils 方法

```js
const { utils } = require('antcloud-openapi-sdk');

// Exp: 构造响应成功的response字符串（更多 util 方法见 lib/utils.js）
utils.buildSuccessResponseStr({ req_msg_id: '0645762ea89c49438f38a2c991dfdf13' });


```
