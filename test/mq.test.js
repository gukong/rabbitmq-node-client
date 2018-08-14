/**
 * Author: Carlos
 * Created At: 2018-08-01 15:45
 * Description: carlos is good
 */
const assert = require('assert');
const MqManager = require('../rabbitmq/mq_manager');
const Promise = require('bluebird');

/**
 * @description 延时函数，当方法中存在异步操作的时候需要延时以后再进行判断
 * @param {number?} timeout 延时毫秒数，默认500ms
 * @return {Promise}
 */
function promiseTimeout(timeout = 500) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout)
    })
}

describe('############################################## begin test ##############################################', () => {
    describe('init', () => {
        it('send 100 WorkTask before connected', async () => {
            const workQueueName = 'work_task';
            const taskData = 'hello world';
            for (let i = 0; i < 100; i++) {
                await MqManager.sendWorkTask(workQueueName, taskData);
            }
            await promiseTimeout(1000);
        });
        it('create connect', async () => {
            const mqHost = 'amqp://localhost';
            MqManager.init(mqHost, {isDebugMode: true, prefetch: 100});
            await promiseTimeout(1000);
        });
        describe('work task', () => {
            it('send 100 WorkTask after connected', async () => {
                const workQueueName = 'work_task';
                const taskData = 'hello world';
                for (let i = 0; i < 100; i++) {
                    await MqManager.sendWorkTask(workQueueName, taskData);
                }
                await promiseTimeout(1000);
            });
            it('receive WorkTask', async () => {
                const workQueueName = 'work_task';
                let totalWorkTask = 0;
                MqManager.receiveWorkTask(workQueueName, function (msg) {
                    totalWorkTask++;
                });
                await promiseTimeout(1000);
                assert.equal(totalWorkTask, 200);
            });
            it('send non string data', async () => {
                const workQueueName = 'work_task';
                const taskData = 1;
                try {
                    await MqManager.sendWorkTask(workQueueName, taskData);
                } catch (err) {
                    assert.equal(err.message, '[AMQP] error: workQueueName type = string, taskData type = number, type wrong!');
                }
            });
        });
        describe('rpc task', () => {
            it('send 100 rpc request after connected', async () => {
                const rpcQueueName = 'rpc_test_task';
                MqManager.receiveRpcRequest(rpcQueueName, function (msg) {
                    return msg;
                });

                for (let i = 0; i < 100; i++) {
                    const rpcData = String(i);
                    const result = await MqManager.sendRpcRequest(rpcQueueName, rpcData);
                    assert.equal(result, rpcData);
                }
            });
            it('send 100 rpc request to other rpc queue', async () => {
                const rpcQueueName = 'other_rpc_test_task';
                MqManager.receiveRpcRequest(rpcQueueName, function (msg) {
                    return msg;
                });

                for (let i = 0; i < 100; i++) {
                    const rpcData = String(i);
                    const result = await MqManager.sendRpcRequest(rpcQueueName, rpcData);
                    assert.equal(result, rpcData);
                }
            });
            it('send non string data', async () => {
                const rpcQueueName = 'rpc_test_task';
                const rpcData = 1;
                try {
                    await MqManager.sendRpcRequest(rpcQueueName, rpcData);
                } catch (err) {
                    assert.equal(err.message, '[AMQP] error: rpcQueueName type = string, rpcData type = number, type wrong!');
                }
            });
        });
        it('wrong host', async () => {
            const mqHost = 'localhost';
            try {
                MqManager.init(mqHost, {isDebugMode: true});
            } catch (err) {
                assert.equal(err.message, 'Expected amqp: or amqps: as the protocol; got null');
            }
            await promiseTimeout(1000);
        });
    });
});