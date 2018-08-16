
/**
 * browser webSocket
 * ====================================================
 */
function OpenWebSocket() {
  var self = this;
  var socket = OpenWebSocket.client(self.url);
  if (self._useBlob) {
    socket.binaryType = 'blob'
  }
  socket.onopen = function () {
    self._open();
    socket.send('9' + JSON.stringify([self._customHeaders]));
  };
  socket.onmessage = function (ev) {
    self._transport.receiveData(ev.data)
  };
  socket.onerror = function () {
    self._error('WebSocket error')
  };
  socket.onclose = function (ev) {
    self._close(ev.code, ev.reason)
  };
  self.socket = socket;
}

OpenWebSocket.client = function client(url) {
  var checkIf = url === undefined;
  var client = typeof window === 'object' ?
    ('WebSocket' in window ? window.WebSocket : ('MozWebSocket' in window ? window.MozWebSocket : null))
    : null;
  if (!client) {
    if (checkIf) {
      return 0;
    }
    throw 'Client not support webSocket';
  }
  if (checkIf) {
    return 1;
  }
  client = new client(url);
  if (!client) {
    throw 'Create window webSocket failed';
  }
  return client;
};