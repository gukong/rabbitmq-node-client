# node_rabbitmq_client
Simple and highly available, just TWO line code to send or receive MQ message!

## Installation

  `npm install amqpclient`

## Usage

    const MqManager = require('../rabbitmq/mq_manager');
    
    MqManager.init('amqp://localhost?heartbeat=60', {isDebugMode: true, prefetch: 100});
    
    MqManager.receiveWorkTask(workQueueName, function (taskData) {});
    MqManager.sendWorkTask(workQueueName, taskData)
    
    MqManager.receiveRpcRequest(rpcQueueName, function (rpcData) {return 'result'});
    const result = await MqManager.sendRpcRequest(rpcQueueName, rpcData);
  
  
  Output should be `35,666`


## Tests

  `npm test`

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code.