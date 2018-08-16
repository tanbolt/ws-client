
/**
 * unlit function
 * ====================================================
 */
function isNumeric(value) {
  return !isNaN(value - parseFloat(value));
}

function isFunction(fn) {
  return fn && {}.toString.call(fn) === '[object Function]';
}

function isObject(arg) {
  return Object.prototype.toString.call(arg) === '[object Object]';
}

function isArray(arg) {
  return !Array.isArray ? Object.prototype.toString.call(arg) === '[object Array]' : Array.isArray(arg);
}

function isBlob(arg) {
  return arg !== null && typeof arg === 'object' && typeof Blob !== 'undefined' && arg.constructor === Blob;
}

function isArrayBuffer(arg) {
  return arg !== null && typeof arg === 'object' && typeof ArrayBuffer !== 'undefined' && arg.constructor === ArrayBuffer;
}

function isTypedArray(arg) {
  return arg !== null && typeof arg === 'object' && 'buffer' in arg && isArrayBuffer(arg.buffer)
}

function flattenArray(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten);
  }, []);
}

function jsonDecode(data) {
  try {
    return JSON.parse(data);
  } catch (e) {
    return false;
  }
}

/**
 * Transport class
 * ====================================================
 */
// 处理服务端发来的消息
function receiveMessage(data, binary) {
  var self = this;
  if (!!binary || typeof data !== 'string') {
    resolveBuffer.call(self, data, true);
    return;
  }
  data = data + '';
  // 服务端回应客户端的 模拟ping/pong
  if (data === '1') {
    return;
  }
  // 服务端告知, 两端在发送真的 ping/pong, 不要发送模拟的 ping/pong 了
  if (data === '2') {
    //stop send ping/pong
    clearPing.call(self);
    return;
  }
  var pos = data.indexOf('[');
  if (pos === -1) {
    return;
  }
  var code = data.substr(0, pos);
  data = jsonDecode(data.substr(pos));
  // 连接成功, 服务端通知可用继续了
  if (code === '0') {
    initConnection.call(self, data);
    return;
  }
  // 处理收到的消息
  if (!data || !isArray(data) || !data.length) {
    return;
  }
  // has buffer
  if (code.indexOf('-') === -1) {
    triggerReceive.call(self, code, data);
  } else {
    code = code.split('-');
    resolveBuffer.call(self, [parseInt(code[1]), code[0], data]);
  }
}

// 连接成功, 设置模拟 ping/pong
function initConnection(data) {
  var pingInterval = isArray(data) && data.length > 0 && isNumeric(data[0]) ? Math.round(data[0]) : 30000;
  this._inited = true;
  triggerEventCache.call(this);
  sendPreMessages.call(this);
  if (!this._ws.polling) {
    initPing.call(this, pingInterval);
  }
}

// 模拟 ping/pong 的启停
function initPing(interval) {
  var self = this;
  self._interval = setInterval(function () {
    transferMessage.call(self, '1', null);
  }, interval);
}

function clearPing() {
  var self = this;
  if (self._interval) {
    clearInterval(self._interval);
    self._interval = null;
  }
}

// 缓存包含二进制数据的消息
function resolveBuffer(data, binary) {
  var self = this;
  if (!binary) {
    self._dataMessage.push(data);
  } else if (self._dataMessage.length) {
    self._bufferMessage.push(data);
    if (self._bufferMessage.length === self._dataMessage[0][0]) {
      parseBufferMessage.call(this, self._dataMessage.shift(), self._bufferMessage.slice());
      self._bufferMessage = [];
    }
  }
}

// 接收的二进制数据包 已经足够解码之前的二进制消息 之后触发
function parseBufferMessage(message, buffers) {
  message[2] = decodeBufferMessage(message[2], buffers);
  triggerReceive.call(this, message[1], message[2])
}

function decodeBufferMessage(obj, buffers) {
  if (isArray(obj)) {
    var objArr = [];
    obj.forEach(function (innerObj, index) {
      objArr[index] = decodeBufferMessage(innerObj, buffers);
    });
    return objArr;
  } else if (isObject(obj)) {
    if ('_bin_' in obj && '_num_' in obj && isNumeric(obj._num_)) {
      return buffers[obj._num_]
    }
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = decodeBufferMessage(obj[key], buffers);
      }
    }
    return obj;
  } else {
    return obj;
  }
}

// 触发消息绑定事件
function triggerReceive(code, data) {
  var self = this;
  var first = code.charAt(0);
  if (first === '3') {
    // 服务端主动发送的数据
    var event = data.shift();
    if (self.has(event)) {
      triggerBindEvent.call(self, code, event, data);
    }
  } else if (first === '4') {
    // 服务端回复客户端的消息
    triggerReplyEvent.call(self, code, data);
  }
}

// 触发回复事件绑定
function triggerReplyEvent(code, data) {
  if (code.length < 2) {
    return;
  }
  var self = this;
  var replyCode = code.substr(1);
  if (!('s' + replyCode in self._callbacks)) {
    return;
  }
  self._callbacks['s' + replyCode].apply(self._ws, data);
}

// 触发主动绑定事件回调
// 需要注意的是: data 是原始数据, 如果绑定多个回调, 前一个回调处理data, 会影响下一个回调的参数
// 若没收到 inited 消息就收到普通消息了, 先缓存, 待收到 inited 后触发
function triggerBindEvent(code, event, data) {
  var self = this;
  if (self._inited) {
    triggerEventNow.call(self, code, event, data)
  } else {
    self._aheadMessage.push([code, event, data])
  }
}

function triggerEventCache() {
  var self = this;
  self._aheadMessage.forEach(function (item) {
    triggerEventNow.call(self, item[0], item[1], item[2])
  });
}

function triggerEventNow(code, event, data) {
  // trigger event
  var self = this;
  // 需要回复的消息
  if (code.length > 1) {
    var replyCode = code.substr(1);
    self._replies['r' + replyCode] = 1;
    data.push(function () {
      var data = [].slice.call(arguments);
      data.push(replyCode);
      replyMessage.call(self, data);
    });
  }
  self.get(event).forEach(function (item) {
    item.callback.apply(self._ws, data);
  });
}

// 回消息给服务端
function replyMessage(data) {
  var self = this;
  var replyCode = data.pop();
  if (!('r' + replyCode in self._replies)) {
    return;
  }
  delete self._replies['r' + replyCode];
  sendMessage.call(self, data, replyCode);
}

// 发送在 open success 前就命令要发送的 预缓存消息
function sendPreMessages() {
  var self = this;
  self._presendMessage.forEach(function (item) {
    sendMessage.call(self, item[0], item[1])
  });
}
// 发消息给服务端
function sendMessage(data, replyCode) {
  var self = this;
  if (!self._inited) {
    // 还未载入, 先预缓存要发送消息
    self._presendMessage.push([data, replyCode]);
    return;
  }
  var code;
  if (replyCode === false) {
    code = '3';
    var callback = data.pop();
    if (!isFunction(callback)) {
      data.push(callback);
    } else {
      code += '' + getCallbackCode.call(self, callback);
    }
  } else {
    code = 4 + '' + replyCode;
  }
  var buffers = [];
  data = encodeBufferMessage(data, buffers);
  transferMessage.call(self, code, data, buffers);
}

// 缓存需回复的消息码
function getCallbackCode(callback) {
  var self = this, last = null;
  for (var k in self._callbacks) {
    last = k;
  }
  if (last === null) {
    last = 0;
  } else {
    last = parseInt(last.substr(1)) + 1;
  }
  self._callbacks['s' + last] = callback;
  return last;
}

// 传输消息, 提取出二进制消息分批次发送
function transferMessage(code, data, buffers) {
  if (!this._inited) {
    return;
  }
  var ws = this._ws;
  if (ws.polling) {
    ws.socket.send(code, data, buffers)
    return;
  }
  if (data === null) {
    // ping
    ws.socket.send(code)
  } else {
    // message
    var len = buffers.length;
    ws.socket.send(code + '' + (len ? '-' + len : '') + JSON.stringify(data));
    if (len) {
      buffers.forEach(function (buffer) {
        ws.socket.send(buffer.data);
      })
    }
  }
}

function encodeBufferMessage(obj, buffers) {
  if (isArray(obj)) {
    var objArr = [];
    obj.forEach(function (innerObj, index) {
      objArr[index] = encodeBufferMessage(innerObj, buffers);
    });
    return objArr;
  } else if (isBlob(obj)) {
    return appendBuffer(obj, 'blob', buffers);
  } else if (isArrayBuffer(obj)) {
    return appendBuffer(obj, 'arrayBuffer', buffers);
  } else if (isTypedArray(obj)) {
    return appendBuffer(obj, 'typeArray', buffers);
  } else if (isObject(obj)) {
    if ('_bin_' in obj && '_num_' in obj && isNumeric(obj._num_)) {
      return buffers[obj._num_]
    }
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = encodeBufferMessage(obj[key], buffers);
      }
    }
    return obj;
  } else {
    return obj;
  }
}

function appendBuffer(data, type, buffers) {
  buffers.push({
    type: type,
    data: data
  });
  return {
    _bin_: 1,
    _num_: buffers.length - 1
  };
}

// 处理 event 前缀
function parseEvent(event) {
  var prefix = '';
  var pos = event.lastIndexOf('.');
  if (pos > -1) {
    prefix = event.slice(0, pos);
    event = event.substr(pos + 1);
  }
  return [prefix, event]
}

// Transport 类
function Transport(Ws) {
  // 绑定的 Ws 对象
  this._ws = Ws;

  // 连接成功后, 设置 ping 计时器
  this._inited = false;
  this._interval = null;

  // 已绑定的监听事件 格式为
  // {
  //   event => [
  //      {prefix: prefix, callback: callback},
  //      ....
  //   ],
  //   ....
  // }
  this._listeners = {};

  // 服务端主送发的 需要回复的消息 缓存, 只回复一次
  this._replies = {};

  // 客户端推送消息需要应答的回调函数缓存
  this._callbacks = {};

  // 缓存包含二进制的消息, 待二进制流接受完成后, 出发客户端绑定事件
  // 格式为 [需要二进制流个数, 消息码(3x,4x), 消息内容]
  this._dataMessage = [];

  // 缓存二进制流, 待长度到达缓存消息所需时, 解析并触发绑定事件
  this._bufferMessage = [];

  // 在 _inited 之前就尝试要发送的消息, 缓存起来待 inited 之后触发
  this._presendMessage = [];

  // 在 _inited 之前就收到的消息, 缓存起来待 inited 之后触发
  this._aheadMessage = [];
}

Transport.prototype = {
  on: function on(event, callback) {
    event = parseEvent(event);
    var prefix = event[0];
    event = event[1];
    if (!(event in this._listeners)) {
      this._listeners[event] = [];
    }
    this._listeners[event].push({
      prefix: prefix,
      callback: callback
    });
    return this
  },
  off: function off(event) {
    event = parseEvent(event);
    var prefix = event[0];
    event = event[1];
    if (!(event in this._listeners)) {
      return this
    }
    if (prefix === '') {
      delete this._listeners[event];
      return this
    }
    var lis = this._listeners[event],
      index = lis.length;
    while (index--) {
      if (lis[index].prefix === prefix) {
        lis.splice(index, 1)
      }
    }
    return this
  },
  has: function has(event) {
    return event in this._listeners
  },
  get: function get(event) {
    return this.has(event) ? this._listeners[event] : []
  },
  receiveData: function receiveData(data, binary) {
    receiveMessage.call(this, data, binary);
  },
  sendData: function sendData(data) {
    sendMessage.call(this, data, false);
  },
  reset: function reset() {
    this._inited = false;
    this._replies = {};
    this._callbacks = {};
    this._dataMessage = [];
    this._bufferMessage = [];
    this._presendMessage = [];
    this._aheadMessage = [];
    clearPing.call(this);
  }
};


/**
 * Ws class
 * ====================================================
 */
function Ws(url) {
  var wsClientChecker = !!OpenWebSocket && OpenWebSocket.client();
  this.url = url;
  this.socket = null;
  this.polling = wsClientChecker < 1;
  this.wechat = wsClientChecker > 1;
  this._useBlob = false;
  this._attempt = 0;
  this._reconnectTimes = -1;
  this._reconnectDelayMin = 1000;
  this._reconnectDelayRand = 2000;
  this._customHeaders = {};
  this._openfn = null;
  this._errorfn = null;
  this._closefn = null;
  this._resolveBase64 = null;
  this._transport = new Transport(this);
}

function getOptionNumber(value) {
  if (!isNumeric(value)) {
    throw new Error("arguments must be number");
  }
  return Math.floor(value);
}
function getFunction(cb) {
  if (!isFunction(cb)) {
    throw new Error("callback must be function");
  }
  return cb;
}

Ws.prototype = {
  _open: function () {
    if (this._openfn) {
      this._openfn.call(this, this._attempt);
    }
    this._attempt = 0;
  },
  _error: function (error) {
    if (this._errorfn) {
      this._errorfn(this._attempt, error);
    }
    if (this._reconnectTimes === 0 || (this._reconnectTimes > 0 && this._attempt >= this._reconnectTimes)) {
      return;
    }
    setTimeout(this.open.bind(this), this._reconnectDelayMin + parseInt(Math.random() * (this._reconnectDelayRand + 1), 10));
  },
  _close: function (code, reason) {
    this._transport.reset();
    if (this._closefn) {
      this._closefn(code, reason)
    }
  },
  reconnectTimes: function tryTimes(times) {
    // -1: always reconnect, 0:disable reconnect
    this._reconnectTimes = getOptionNumber(times);
    return this
  },
  reconnectDelay: function tryDelay(min, max) {
    this._reconnectDelayMin = getOptionNumber(min);
    this._reconnectDelayRand = Math.max(getOptionNumber(max) - this._reconnectDelayMin, 800);
    return this
  },
  useBlob: function useBolb(blob) {
    this._useBlob = !!blob;
    if (this.socket) {
      this.socket.binaryType = !!blob ? 'blob' : 'arraybuffer';
    }
    return this
  },
  resolveBase64: function resolveBase64(cb) {
    this._resolveBase64 = getFunction(cb);
    return this;
  },
  headers: function headers(headers) {
    if (isObject(headers)) {
      this._customHeaders = headers;
    }
    return this
  },
  onOpen: function onopen(cb) {
    this._openfn = getFunction(cb);
    return this
  },
  onError: function onerror(cb) {
    this._errorfn = getFunction(cb);
    return this
  },
  onClose: function onclose(cb) {
    this._closefn = getFunction(cb);
    return this
  },
  on: function on(event, callback) {
    this._transport.on(event, getFunction(callback));
    return this
  },
  off: function off() {
    var self = this;
    flattenArray([].slice.call(arguments)).forEach(function (ev) {
      self._transport.off(ev);
    });
    return self
  },
  open: function open() {
    this._attempt++;
    openWs.call(this);
    return this
  },
  emit: function emit(event, data) {
    this._transport.sendData([].slice.call(arguments));
    return this
  },
  close: function close(code, reason) {
    code = isNumeric(code) ? parseInt(code) : false;
    if ((code < 3000 && code !== 1000) || code > 4999) {
      code = false;
    }
    if (code) {
      this.socket.close(code, !!reason ? reason + '' : '');
    } else {
      this.socket.close();
    }
    return this
  }
};

/**
 * open Socket
 * ====================================================
 */
function openWs() {
  try {
    if (!this.polling) {
      OpenWebSocket.call(this);
    } else if (typeof ___openRequest !== 'undefined' && isFunction(___openRequest)) {
      ___openRequest.call(this);
    } else {
      throw 'Client not support WebSocket'
    }
  } catch (err) {
    if (this._errorfn) {
      this._errorfn(err)
    } else {
      throw new Error(err)
    }
  }
}
