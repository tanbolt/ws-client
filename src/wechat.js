/**
 * wechat miniProgram webSocket
 * ====================================================
 */
function WeSocket(socket) {
  this.socket = socket;
}
WeSocket.prototype.send = function (data) {
  this.socket.send({
    data:data
  });
};
WeSocket.prototype.close = function (code, reason) {
  if (arguments.length) {
    this.socket.close({
      code: code,
      reason: !!reason ? reason : ''
    })
  } else {
    this.socket.close();
  }
};
function OpenWebSocket() {
  var self = this;
  var socket = OpenWebSocket.client(self.url);
  if (self._useBlob) {
    socket.binaryType = 'blob'
  }
  socket.onOpen(function () {
    self._open();
    socket.send({
      data:'9' + JSON.stringify([self._customHeaders])
    });
  });
  socket.onMessage(function(ev) {
    self._transport.receiveData(ev.data)
  });
  socket.onError(function (ev) {
    self._error(ev.errMsg ? ev.errMsg : 'WeSocket error');
  });
  socket.onClose(function (ev) {
    self._close(ev.code, ev.reason);
  });
  self.socket = new WeSocket(socket);
}
OpenWebSocket.client = function client(url) {
  var checkIf = url === undefined;
  var client = typeof wx === 'object' && 'connectSocket' in wx;
  if (!client) {
    if (checkIf) {
      return 0;
    }
    throw 'Client not support webSocket';
  }
  if (checkIf) {
    return 2;
  }
  client = wx.connectSocket({
    url: url
  });
  if (!client) {
    throw 'Create wechat webSocket failed';
  }
  return client;
};