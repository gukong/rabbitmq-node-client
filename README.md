# node_rabbitmq_client
This is the node client of rabbitmq. Before using this client, you must confirm:
1. rabbitmq is correctly installed in the current environment; 
2. ES6 and above are required.

## Installation

  `npm i @xiaojing0/amqpclient`
  
## Example
```
const amqpclient = require('@xiaojing0/amqpclient');
amqpclient.init('amqp://localhost?heartbeat=60', {isDebugMode: true, prefetch: 100});

// work task queue
amqpclient.receiveWorkTask('workQueueName', function (msg) {
    console.log(msg); // print: 'hi!!!'
});
amqpclient.sendWorkTask('workQueueName', 'hi!!!')

// rpc task queue
amqpclient.receiveRpcRequest('rpcQueueName', function (msg) {
    console.log(msg); // print: 'your name?'
    return 'rpc server!';
});
amqpclient.sendRpcRequest('rpcQueueName', 'your name?')
    .then((result) => {
        console.log(result); // print: 'rpc server!'
    });
```

## Usage


**First, we need to init a connection**:
```
const amqpclient = require('@xiaojing0/amqpclient');
amqpclient.init('amqp://localhost?heartbeat=60', {isDebugMode: true, prefetch: 100});
```
- The initialization method receives two parameters, connectHost and configParams:
```
connectHost: 'amqp://localhost?heartbeat=60' // Message queue connection address

// [optional] Message queue config params
configParams: Object

// [optional] default to false, if set to true will show all AMQP logs
configParams.isDebugMode: Boolean,

 // [optional] default to 0 (no limit), This parameter limits the number of concurrent processing by the client in a unit of time.
configParams.prefetch: Number,
```

*Note:*
The process of establishing a connection is completely asynchronous. You don't have to worry about requests that cannot be sent and answered during the connection establishment process. Because the client has a caching mechanism inside, all requests will be executed after the connection is established.
  
**Send and receive a work task**:
```
amqpclient.receiveWorkTask(workQueueName, consumeMethod, optionalParams);
amqpclient.sendWorkTask(workQueueName, taskData, optionalParams)
```
- The receiveWorkTask method params:
```
workQueueName: String, // Work queue name, must be unique

consumeMethod: Function, // A consumption method for a work task, which is used to receive a message that processes a task queue

 // [optional] The config params of work queue 
optionalParams: Object,

 // [optional] Queue config parameter, default to {durable: true}, support all queue configuration parameters
optionalParams.queueOpts: Object,

 // [optional] consume config parameter, default to {noAck: false}, support all message configuration parameters
optionalParams.consumeOpts: Object,
```
- The sendWorkTask method params:
```
workQueueName: String, // Work queue name, must be unique

taskData: String, // Task data must be String type


 // [optional] The config params of work queue 
optionalParams: Object,

 // [optional] Queue config parameter, default to {durable: true}, support all queue configuration parameters
optionalParams.queueOpts: Object,

 // [optional] message config parameter, default to {persistent: true}, support all message configuration parameters
optionalParams.msgOpts: Object,
```

**Send and receive RPC**:
```
amqpclient.receiveRpcRequest(rpcQueueName, consumeMethod);

const result = await amqpclient.sendRpcRequest(rpcQueueName, rpcData);
```
- The receiveRpcRequest method params:
```
rpcQueueName: String, // rpc queue name, must be unique

consumeMethod: Function, // A consumption method for a rpc task, which is used to receive a message that processes a rpc queue
```
- The sendRpcRequest method params:
```
rpcQueueName: String, // rpc queue name, must be unique

rpcData: String, // Task data must be String type
```
*Note:*
The data returned by the rpc request is a serialized character type. If the returned result is an object, the type needs to be deserialized.

## Tests

  `npm test`


## Contributing

[Contributors](http://xiaojing0.com)
