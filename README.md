# node_rabbitmq_client
This is the node client of rabbitmq. Before using this client, you must confirm:
1. rabbitmq is correctly installed in the current environment; 
2. ES6 and above are required.

## Installation

  `npm install amqpclient`

## Usage


- First, we need to init a connection:
```
const amqpclient = require('amqpclient');
amqpclient.init('amqp://localhost?heartbeat=60', {isDebugMode: true, prefetch: 100});
```
- The initialization method receives two parameters, connectHost and configParams:
```
connectHost: amqp://localhost?heartbeat=60 // Message queue connection address

configParams: {isDebugMode: true, prefetch: 100} // [optional] Message queue config params
configParams.isDebugMode: true, // [optional] default to false, if set to true will show all AMQP logs
configParams.prefetch: 100, // [optional] default to 0 (no limit), This parameter limits the number of concurrent processing by the client in a unit of time.
```

*Note:*
The process of establishing a connection is completely asynchronous. You don't have to worry about requests that cannot be sent and answered during the connection establishment process. Because the client has a caching mechanism inside, all requests will be executed after the connection is established.
  
- Send and receive a work task:
```
amqpclient.receiveWorkTask(workQueueName, consumeMethod, optionalParams);
amqpclient.sendWorkTask(workQueueName, taskData, optionalParams)
```
- The receiveWorkTask method params:
```
workQueueName: String, // Work queue name, must be unique

consumeMethod: Function, // A consumption method for a work task, which is used to receive a message that processes a task queue

optionalParams: Object, // [optional] The config params of work queue 
optionalParams.queueOpts: Object, // [optional] Queue config parameter, default to {durable: true}, support all queue configuration parameters
optionalParams.consumeOpts: Object, // [optional] consume config parameter, default to {noAck: false}, support all queue configuration parameters
```
- The sendWorkTask method params:
```
workQueueName: String, // Work queue name, must be unique

taskData: String, // Task data must be String type

optionalParams: Object, // [optional] The config params of work queue 
optionalParams.queueOpts: Object, // [optional] Queue config parameter, default to {durable: true}, support all queue configuration parameters
optionalParams.msgOpts: Object, // [optional] message config parameter, default to {persistent: true}, support all queue configuration parameters
```

- Send and receive RPC:
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

[Contributors](https://xiaojing0.com)
