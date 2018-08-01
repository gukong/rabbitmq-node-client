/**
 * Author: Carlos
 * Created At: 2018-07-05 15:42
 * Description: carlos is good
 */
const subtask = require('./mq_subtask');

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

/**
 * rabbit mq manager class (statistic)
 */
class MqManager {

    /**
     * 初始化连接
     * @param {string} mqHost 连接host
     * @param {object?} optionalParams 可选参数
     * @param {number?} optionalParams.prefetch 最大并发处理数, 0: 不限制
     * @param {number?} optionalParams.isDebugMode 是测试模式
     * @return {undefined}
     */
    static init(mqHost, optionalParams) {
        subtask.connectToMq(mqHost, optionalParams);
    }

    /**
     * [工作队列] 发送任务到指定的任务时间队列
     * @param {string} workQueueName 工作队列名字
     * @param {object} taskData 任务数据
     * @param {object?} optionalParams 可选参数
     * @param {object?} optionalParams.queueOpts 工作队列参数配置
     * @param {object?} optionalParams.msgOpts 消息参数配置
     * @return {undefined}
     */
    static async sendWorkTask(workQueueName, taskData, optionalParams) {
        // 检查任务参数
        subtask.checkSendWorkTask(workQueueName, taskData);
        // 声明任务队列
        const isAsserted = await subtask.assertTaskQueue(workQueueName, optionalParams);
        if (!isAsserted) {
            subtask.cacheOperations(MqManager.sendWorkTask.bind(null, workQueueName, taskData, optionalParams));
            return;
        }
        // 发送任务到任务队列
        await subtask.sendWorkTask(workQueueName, taskData, optionalParams);
    }

    /**
     * [工作队列] 接收并处理指定任务队列的消息
     * @param {string} workQueueName 工作队列名字
     * @param {function} consumeMethod 消费者的消费方法
     * @param {object?} optionalParams 可选参数
     * @param {object?} optionalParams.queueOpts 工作队列参数配置
     * @param {object?} optionalParams.consumeOpts 消费配置
     * @return {undefined}
     */
    static async receiveWorkTask(workQueueName, consumeMethod, optionalParams) {
        // 检查参数
        subtask.checkReceiveWorkTask(workQueueName, consumeMethod);
        // 声明任务队列
        const isAsserted = await subtask.assertTaskQueue(workQueueName, optionalParams);
        if (!isAsserted) {
            subtask.cacheOperations(MqManager.receiveWorkTask.bind(null, workQueueName, consumeMethod, optionalParams));
            return;
        }
        // 绑定消费方式到任务队列上
        await subtask.bindToTaskQueue(workQueueName, consumeMethod, optionalParams);
    }

    /**
     * [RPC队列] 发送RPC请求
     * @param {string} rpcQueueName rpc队列名字
     * @param {object} rpcData rpc请求数据
     * @param {number?} waitTimes 等待次数
     * @return {*}
     */
    static async sendRpcRequest(rpcQueueName, rpcData, waitTimes = 0) {
        // 检查任务参数
        subtask.checkSendRPCRequest(rpcQueueName, rpcData);
        // 声明rpc队列
        const isAsserted = await subtask.assertRpcQueue(rpcQueueName, true);
        if (!isAsserted) {
            if (waitTimes > 20) {
                throw new Error('[AMQP] rpc request timeout!');
            }
            await promiseTimeout();
            return MqManager.sendRpcRequest(rpcQueueName, rpcData, ++waitTimes);
        }
        // 发送任务到任务队列
        return subtask.rpcRequest(rpcQueueName, rpcData);
    }

    /**
     * [RPC队列] 接收RPC请求
     * @param {string} rpcQueueName rpc队列名字
     * @param {function} consumeMethod 消费者的消费方法
     * @return {undefined}
     */
    static async receiveRpcRequest(rpcQueueName, consumeMethod) {
        // 检查任务参数
        subtask.checkReceiveRpc(rpcQueueName, consumeMethod);
        // 声明rpc队列
        const isAsserted = await subtask.assertRpcQueue(rpcQueueName, false);
        if (!isAsserted) {
            subtask.cacheOperations(MqManager.receiveRpcRequest.bind(null, rpcQueueName, consumeMethod));
            return;
        }
        // 绑定消费方式到rpc队列上
        return subtask.bindToRpcQueue(rpcQueueName, consumeMethod);
    }

}

module.exports = MqManager;
