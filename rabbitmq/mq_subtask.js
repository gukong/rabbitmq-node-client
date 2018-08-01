/**
 * Author: Carlos
 * Created At: 2018-07-05 15:43
 * Description: carlos is good
 */
module.exports = {
    connectToMq,
    checkSendWorkTask,
    sendWorkTask,
    checkReceiveWorkTask,
    cacheOperations,
    assertTaskQueue,
    bindToTaskQueue,
    checkSendRPCRequest,
    assertRpcQueue,
    rpcRequest,
    checkReceiveRpc,
    bindToRpcQueue,
};

const amqp = require('amqplib/callback_api');
const Promise = require('bluebird');

// 默认工作队列参数配置
const DEFAULT_QUEUE_OPTS = {
    durable: true, // 声明工作队列需要持久化保存（一旦设置不能更改）
};
// 默认消息参数配置
const DEFAULT_MSG_OPTS = {
    persistent: true, // 声明消息需要持久化保存（加入缓存，但是不会持久化到硬盘）
};
// 默认消费配置
const DEFAULT_CONSUME_OPTS = {
    noAck: false, // 需要ack应答消息已收到（如果设置为true可能导致消息丢失）
};

// RPC请求的最大超时时间
const RPC_MAX_TIME_OUT_PERIOD = 15000;
// 正在建立连接标记
let isConnecting = false;
// 消息队列连接句柄
let mqConnection = null;
// 连接渠道句柄
let mqChannel = null;
// 操作缓存队列
let listenerCallBacks = [];
// rpc匿名队列名字
let rpcCBQueueName = null;
// 是debug模式
let isDebugMode = false;
// rpc监听回调队列
const rpcListeners = [];
// rpc请求成功消息
const rpcSuccessMsg = 'success';

/**
 * 打印日志信息
 * @param {string} logMsg
 */
function log(logMsg) {
    if (!isDebugMode) {
        return;
    }
    console.log(logMsg);
}

/**
 * 重置消息队列状态
 * @return {undefined}
 */
function resetMqState() {
    mqConnection = null;
    mqChannel = null;
    rpcCBQueueName = null;
}

/**
 * 发生错误时关闭连接
 * @param {object} err
 * @return {boolean}
 */
function closeConnOnErr(err) {
    if (!err) {
        return false;
    }
    console.error('[AMQP] closeConnOnErr', JSON.stringify(err));
    // 这里断开连接以后，会被监听到连接断开的回调事件然后重新建立连接
    mqConnection.close();
    resetMqState();
    return true;
}

/**
 * 创建连接渠道
 * @param {number?} prefetch 最大并发处理数, 0: 不限制
 * @return {undefined}
 */
function createChannel(prefetch) {
    mqConnection.createChannel(function (err, channel) {
        if (closeConnOnErr(err)) {
            throw new MError(MError.FAIL_CREATE_WORK_CHANNEL);
        }
        mqChannel = channel;
        if (prefetch > 0) {
            mqChannel.prefetch(prefetch);
        }
        invokeListener();
        channel.on('error', function (err) {
            console.error('[AMQP] channel error', err.message);
        });
        channel.on('close', function () {
            mqConnection.close();
            resetMqState();
            log('[AMQP] channel closed');
        });
    });
}

/**
 * 执行监听回调队列中所有的缓存任务
 */
function invokeListener() {
    listenerCallBacks.forEach((listenerCallBack) => {
        listenerCallBack();
    });
    listenerCallBacks = [];
}

/**
 * 连接到消息队列
 * @param {string} mqHost 连接host
 * @param {object?} optionalParams 可选参数
 * @param {number?} optionalParams.prefetch 最大并发处理数, 0: 不限制
 * @param {number?} optionalParams.isDebugMode 是测试模式
 * @return {undefined}
 */
function connectToMq(mqHost, optionalParams) {
    if (isConnecting) {
        return;
    }
    isConnecting = true;
    if (optionalParams.isDebugMode) {
        isDebugMode = true;
    }
    amqp.connect(mqHost, function (err, connection) {
        isConnecting = false;
        resetMqState();
        if (err || !connection) {
            console.error(`[AMQP] connect failed！error:${JSON.stringify(err)}`);
            return setTimeout(connectToMq(mqHost, optionalParams), 1000);
        }
        connection.on('error', function (err) {
            if (err.message !== 'Connection closing') {
                console.error('[AMQP] connection error', err.message);
            }
        });
        connection.on('close', function () {
            console.error('[AMQP] reconnecting');
            return setTimeout(connectToMq(mqHost, optionalParams), 1000);
        });
        log('[AMQP] connected');
        mqConnection = connection;
        createChannel(optionalParams.prefetch);
    });
}

/**
 * 缓存操作
 * @param {function} operation 因为连接未建立未导致无法执行的操作
 */
function cacheOperations(operation) {
    listenerCallBacks.push(operation);
}

/**
 * 检查发送工作任务的参数
 * @param {string} workQueueName 工作队列名字
 * @param {object} taskData 任务数据
 */
function checkSendWorkTask(workQueueName, taskData) {
    if (!workQueueName || !taskData) {
        throw new Error(`[AMQP] error: ${workQueueName}, taskData=${taskData}, can't be empty!`);
    }
    if (typeof workQueueName !== 'string') {
        throw new Error(`[AMQP] error: workQueueName type = ${typeof workQueueName}, type wrong!`);
    }
}

/**
 * 声明任务队列
 * @param {string} workQueueName 任务队列名字
 * @param {object?} optionalParams 可选参数
 * @param {object?} optionalParams.queueOpts 工作队列参数配置
 * @return {boolean}
 */
async function assertTaskQueue(workQueueName, optionalParams) {
    return new Promise((resolve, reject) => {
        if (!mqConnection || !mqChannel) {
            resolve(false);
        }
        const queueOpts = optionalParams.queueOpts || DEFAULT_QUEUE_OPTS;
        mqChannel.assertQueue(workQueueName, queueOpts, function (err) {
            const isClosed = closeConnOnErr(err);
            resolve(!isClosed);
        });
    });
}

/**
 * 发送工作任务到工作任务队列
 * @param {string} workQueueName
 * @param {object} taskData
 * @param {object?} optionalParams 可选参数
 * @param {object?} optionalParams.queueOpts 工作队列参数配置
 * @param {object?} optionalParams.msgOpts 消息参数配置
 * @param {object?} optionalParams.consumeOpts 消费配置
 */
async function sendWorkTask(workQueueName, taskData, optionalParams) {
    // 发送任务消息
    const msgOpts = optionalParams.msgOpts || DEFAULT_MSG_OPTS;
    mqChannel.sendToQueue(workQueueName, new Buffer(JSON.stringify(taskData)), msgOpts);
    log(`[AMQP] sent work task：${workQueueName}`);
}

/**
 * 检查接收任务的参数
 * @param {string} workQueueName
 * @param {function} consumeMethod
 */
function checkReceiveWorkTask(workQueueName, consumeMethod) {
    if (!workQueueName || !consumeMethod) {
        throw new Error(`[AMQP] error: ${workQueueName}, consumeMethod=${consumeMethod}, can't be empty!`);
    }
    if (typeof workQueueName !== 'string' || typeof consumeMethod !== 'function') {
        throw new Error(`[AMQP] error: workQueueName type = ${typeof workQueueName}, consumeMethod type = ${typeof consumeMethod}, type wrong!`);
    }
}

/**
 * 绑定消费方式到任务队列上
 * @param {string} workQueueName
 * @param {function} consumeMethod
 * @param {object?} optionalParams 可选参数
 * @param {object?} optionalParams.consumeOpts 消费配置
 */
async function bindToTaskQueue(workQueueName, consumeMethod, optionalParams) {
    const consumeOpts = optionalParams.consumeOpts || DEFAULT_CONSUME_OPTS;
    // 绑定消费方法
    mqChannel.consume(workQueueName, function (msg) {
        log(`[AMQP] receive work task: ${msg.fields.routingKey}`);
        // 这里只需要确保消息抵达，不需要关心消息的处理情况，所以只要消息抵达了就立即发送确认信息，以提高队列效率
        if (consumeOpts && !consumeOpts.noAck) {
            mqChannel.ack(msg); // 确认消息已经被处理
        }
        const parsedData = JSON.parse(msg.content.toString()) || {};
        consumeMethod(parsedData);
    }, consumeOpts)
}

/**
 * 检查发送RPC请求的参数
 * @param {string} rpcQueueName
 * @param {object} rpcData
 */
function checkSendRPCRequest(rpcQueueName, rpcData) {
    if (!rpcQueueName || !rpcData) {
        throw new Error(`[AMQP] error: rpcQueueName=${rpcQueueName}, rpcData=${rpcData}, can't be empty!`);
    }
    if (typeof rpcQueueName !== 'string') {
        throw new Error(`[AMQP] error: rpcQueueName type = ${typeof rpcQueueName}, type wrong!`);
    }
}

/**
 * 生产rpc请求关联id
 * @return {string}
 */
function getCorrelationId() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

/**
 * 接收rpc回调事件
 * @return {undefined}
 */
function receiveRpcResult() {
    // 接收结果
    mqChannel.consume(rpcCBQueueName, function (msg) {
        const listenerIndex = rpcListeners.findIndex(listener => listener.correlationId === msg.properties.correlationId);
        if (listenerIndex < 0) {
            return;
        }
        const result = JSON.parse(msg.content.toString());
        if (result.rpc_message !== rpcSuccessMsg) {
            rpcListeners[listenerIndex].reject(new Error(result.rpc_message));
        } else {
            rpcListeners[listenerIndex].resolve(JSON.parse(msg.content.toString()) || {});
        }
        rpcListeners.splice(listenerIndex, 1);
    }, {noAck: true});
}

/**
 * 声明rpc回调队列
 * @param {string} rpcQueueName
 * @param {boolean} isClient 是客户端
 * @return {boolean}
 */
async function assertRpcQueue(rpcQueueName, isClient) {
    return new Promise((resolve, reject) => {
        if (!mqConnection || !mqChannel) {
            resolve(false);
            return;
        }
        // 声明rpc队列
        mqChannel.assertQueue(rpcQueueName, {durable: false}, function (err) {
            const isClosed = closeConnOnErr(err);
            if (isClient && !isClosed) {
                if (rpcCBQueueName) {
                    resolve(true);
                    return;
                }
                // 如果是客户端并且连接未断开，则声明一个用于rpc通信的匿名队列
                mqChannel.assertQueue('', {exclusive: true}, function (err, anonymousQueue) {
                    const isClosed = closeConnOnErr(err);
                    if (!isClosed) {
                        rpcCBQueueName = anonymousQueue.queue;
                    }
                    resolve(!isClosed);
                    receiveRpcResult();
                });
            } else {
                resolve(!isClosed);
            }
        });
    });
}

/**
 * 发送rpc请求
 * @param {string} rpcQueueName
 * @param {object} rpcData
 * @return {Promise<void>}
 */
async function rpcRequest(rpcQueueName, rpcData) {
    // 发送rpc请求并等待回包
    return new Promise((resolve, reject) => {

        const correlationId = getCorrelationId();

        // 超时监控
        setTimeout(() => {
            const deleteIndex = rpcListeners.findIndex(listener => listener.correlationId === correlationId);
            rpcListeners.splice(deleteIndex, 1);
            throw new Error('[AMQP] rpc request timeout!');
        }, RPC_MAX_TIME_OUT_PERIOD);

        log('[AMQP] sent rpc request: ', rpcQueueName);
        // 发送请求
        mqChannel.sendToQueue(
            rpcQueueName,
            new Buffer(JSON.stringify(rpcData)),
            // 需要创建唯一的correlationId和指定匿名的信道
            {correlationId: correlationId, replyTo: rpcCBQueueName}
        );
        rpcListeners.push({
            correlationId,
            resolve,
            reject,
        });
    });
}

/**
 * 检查接收RPC请求的参数
 * @param {string} rpcQueueName rpc队列名字
 * @param {function} consumeMethod 消费者的消费方法
 */
function checkReceiveRpc(rpcQueueName, consumeMethod) {
    if (!rpcQueueName || !consumeMethod) {
        throw new Error(`[AMQP] error: rpcQueueName=${rpcQueueName}, consumeMethod=${consumeMethod}, can't be empty!`);
    }
    if (typeof rpcQueueName !== 'string' || typeof consumeMethod !== 'function') {
        throw new Error(`[AMQP] error: rpcQueueName type = ${typeof rpcQueueName}, consumeMethod type = ${typeof consumeMethod}, type wrong!`);
    }
}

/**
 * 绑定消费者到RPC队列上
 * @param {string} rpcQueueName rpc队列名字
 * @param {function} consumeMethod 消费者的消费方法
 */
async function bindToRpcQueue(rpcQueueName, consumeMethod) {
    // 绑定消费方法
    mqChannel.consume(rpcQueueName, async function (msg) {
        log(`[AMQP] receive rec request: ${msg.fields.routingKey}`);
        const parsedData = JSON.parse(msg.content.toString()) || {};
        let result = null;
        try {
            result = await consumeMethod(parsedData);
            Object.assign(result, {rpc_message: rpcSuccessMsg});
        } catch (error) {
            console.error(JSON.stringify(error));
            result = {
                rpc_message: error.message || 'unknown error',
            };
        }
        // 将处理结果通过replyTo指定的信道返回
        mqChannel.sendToQueue(
            msg.properties.replyTo,
            new Buffer(JSON.stringify(result)),
            // 需要返回请求中携带的correlationId
            {correlationId: msg.properties.correlationId}
        );
        mqChannel.ack(msg);
    })
}
