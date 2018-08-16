/**
 * polyfill
 * ====================================================
 */
if (!!this && !this.JSON) {
  this.JSON = {
    parse: function (sJSON) {
      return eval('(' + sJSON + ')');
    },
    stringify: (function () {
      var toString = Object.prototype.toString;
      var isArray = Array.isArray || function (a) {
          return toString.call(a) === '[object Array]';
        };
      var escMap = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
      var escFunc = function (m) {
        return escMap[m] || '\\u' + (m.charCodeAt(0) + 0x10000).toString(16).substr(1);
      };
      var escRE = /[\\"\u0000-\u001F\u2028\u2029]/g;
      return function stringify(value) {
        if (value == null) {
          return 'null';
        } else if (typeof value === 'number') {
          return isFinite(value) ? value.toString() : 'null';
        } else if (typeof value === 'boolean') {
          return value.toString();
        } else if (typeof value === 'object') {
          if (typeof value.toJSON === 'function') {
            return stringify(value.toJSON());
          } else if (isArray(value)) {
            var res = '[';
            for (var i = 0; i < value.length; i++)
              res += (i ? ', ' : '') + stringify(value[i]);
            return res + ']';
          } else if (toString.call(value) === '[object Object]') {
            var tmp = [];
            for (var k in value) {
              if (value.hasOwnProperty(k))
                tmp.push(stringify(k) + ': ' + stringify(value[k]));
            }
            return '{' + tmp.join(', ') + '}';
          }
        }
        return '"' + value.toString().replace(escRE, escFunc) + '"';
      };
    })()
  };
}
// http://javascript.boxsheep.com/polyfills/Array-prototype-reduce/
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function (callbackfn, initialValue) {
    "use strict";
    var O = Object(this),
      lenValue = O.length,
      len = lenValue >>> 0,
      k,
      accumulator,
      kPresent,
      Pk,
      kValue;
    if (typeof callbackfn !== 'function') {
      throw new TypeError();
    }
    if (len === 0 && initialValue === undefined) {
      throw new TypeError();
    }
    k = 0;
    if (initialValue !== undefined) {
      accumulator = initialValue;
    } else {
      kPresent = false;
      while (!kPresent && k < len) {
        Pk = k.toString();
        kPresent = O.hasOwnProperty(Pk);
        if (kPresent) {
          accumulator = O[Pk];
        }
        k += 1;
      }
      if (!kPresent) {
        throw new TypeError();
      }
    }
    while (k < len) {
      Pk = k.toString();
      kPresent = O.hasOwnProperty(Pk);
      if (kPresent) {
        kValue = O[Pk];
        accumulator = callbackfn.call(undefined, accumulator, kValue, k, O);
      }
      k += 1;
    }
    return accumulator;
  };
}
// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function (callback/*, thisArg*/) {
    var T, k;
    if (this == null) {
      throw new TypeError('this is null or not defined');
    }
    // 1. Let O be the result of calling toObject() passing the
    // |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get() internal
    // method of O with the argument "length".
    // 3. Let len be toUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If isCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }

    // 5. If thisArg was supplied, let T be thisArg; else let
    // T be undefined.
    if (arguments.length > 1) {
      T = arguments[1];
    }
    // 6. Let k be 0.
    k = 0;
    // 7. Repeat while k < len.
    while (k < len) {
      var kValue;

      // a. Let Pk be ToString(k).
      //    This is implicit for LHS operands of the in operator.
      // b. Let kPresent be the result of calling the HasProperty
      //    internal method of O with argument Pk.
      //    This step can be combined with c.
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal
        // method of O with argument Pk.
        kValue = O[k];

        // ii. Call the Call internal method of callback with T as
        // the this value and argument list containing kValue, k, and O.
        callback.call(T, kValue, k, O);
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined.
  };
}


/**
 * @license
 * eventsource.js
 * Available under MIT License (MIT)
 * https://github.com/Yaffle/EventSource/
 * ====================================================
 */
var global = typeof window !== 'undefined' ? window : this;
var setTimeout = global.setTimeout;
var clearTimeout = global.clearTimeout;
var XMLHttpRequest = global.XMLHttpRequest;
var XDomainRequest = global.XDomainRequest;
var NativeEventSource = global.EventSource;
var document = global.document;
var bestTransport = null;

if (Object.create == null) {
  Object.create = function (C) {
    function F() {
    }

    F.prototype = C;
    return new F();
  };
}

function throwError(e) {
  setTimeout(function () {
    throw e;
  }, 0);
}

function getBestTransport() {
  if (bestTransport === null) {
    bestTransport = XMLHttpRequest && "withCredentials" in XMLHttpRequest.prototype
      ? XMLHttpRequest
      : XDomainRequest;
  }
  return bestTransport;
}

var k = function () {
};

function XHRWrapper(xhr) {
  this.withCredentials = false;
  this.responseType = "";
  this.readyState = 0;
  this.status = 0;
  this.statusText = "";
  this.responseText = "";
  this.onprogress = k;
  this.onreadystatechange = k;
  this._contentType = "";
  this._xhr = xhr;
  this._sendTimeout = 0;
  this._abort = k;
}

XHRWrapper.prototype.open = function (method, url) {
  this._abort(true);

  var that = this;
  var xhr = this._xhr;
  var state = 1;
  var timeout = 0;

  this._abort = function (silent) {
    if (that._sendTimeout !== 0) {
      clearTimeout(that._sendTimeout);
      that._sendTimeout = 0;
    }
    if (state === 1 || state === 2 || state === 3) {
      state = 4;
      xhr.onload = k;
      xhr.onerror = k;
      xhr.onabort = k;
      xhr.onprogress = k;
      xhr.onreadystatechange = k;
      // IE 8 - 9: XDomainRequest#abort() does not fire any event
      // Opera < 10: XMLHttpRequest#abort() does not fire any event
      xhr.abort();
      if (timeout !== 0) {
        clearTimeout(timeout);
        timeout = 0;
      }
      if (!silent) {
        that.readyState = 4;
        that.onreadystatechange();
      }
    }
    state = 0;
  };

  var onStart = function () {
    if (state === 1) {
      //state = 2;
      var status = 0;
      var statusText = "";
      var contentType = undefined;
      if (!("contentType" in xhr)) {
        try {
          status = xhr.status;
          statusText = xhr.statusText;
          contentType = xhr.getResponseHeader("Content-Type");
        } catch (error) {
          // IE < 10 throws exception for `xhr.status` when xhr.readyState === 2 || xhr.readyState === 3
          // Opera < 11 throws exception for `xhr.status` when xhr.readyState === 2
          // https://bugs.webkit.org/show_bug.cgi?id=29121
          status = 0;
          statusText = "";
          contentType = undefined;
          // Firefox < 14, Chrome ?, Safari ?
          // https://bugs.webkit.org/show_bug.cgi?id=29658
          // https://bugs.webkit.org/show_bug.cgi?id=77854
        }
      } else {
        status = 200;
        statusText = "OK";
        contentType = xhr.contentType;
      }
      if (status !== 0) {
        state = 2;
        that.readyState = 2;
        that.status = status;
        that.statusText = statusText;
        that._contentType = contentType;
        that.onreadystatechange();
      }
    }
  };
  var onProgress = function () {
    onStart();
    if (state === 2 || state === 3) {
      state = 3;
      var responseText = "";
      try {
        responseText = xhr.responseText;
      } catch (error) {
        // IE 8 - 9 with XMLHttpRequest
      }
      that.readyState = 3;
      that.responseText = responseText;
      that.onprogress();
    }
  };
  var onFinish = function () {
    // Firefox 52 fires "readystatechange" (xhr.readyState === 4) without final "readystatechange" (xhr.readyState === 3)
    // IE 8 fires "onload" without "onprogress"
    onProgress();
    if (state === 1 || state === 2 || state === 3) {
      state = 4;
      if (timeout !== 0) {
        clearTimeout(timeout);
        timeout = 0;
      }
      that.readyState = 4;
      that.onreadystatechange();
    }
  };
  var onReadyStateChange = function () {
    if (xhr != undefined) { // Opera 12
      if (xhr.readyState === 4) {
        onFinish();
      } else if (xhr.readyState === 3) {
        onProgress();
      } else if (xhr.readyState === 2) {
        onStart();
      }
    }
  };
  var onTimeout = function () {
    timeout = setTimeout(function () {
      onTimeout();
    }, 500);
    if (xhr.readyState === 3) {
      onProgress();
    }
  };

  // XDomainRequest#abort removes onprogress, onerror, onload
  xhr.onload = onFinish;
  xhr.onerror = onFinish;
  // improper fix to match Firefox behaviour, but it is better than just ignore abort
  // see https://bugzilla.mozilla.org/show_bug.cgi?id=768596
  // https://bugzilla.mozilla.org/show_bug.cgi?id=880200
  // https://code.google.com/p/chromium/issues/detail?id=153570
  // IE 8 fires "onload" without "onprogress
  xhr.onabort = onFinish;

  // https://bugzilla.mozilla.org/show_bug.cgi?id=736723
  if (!("sendAsBinary" in XMLHttpRequest.prototype) && !("mozAnon" in XMLHttpRequest.prototype)) {
    xhr.onprogress = onProgress;
  }

  // IE 8 - 9 (XMLHTTPRequest)
  // Opera < 12
  // Firefox < 3.5
  // Firefox 3.5 - 3.6 - ? < 9.0
  // onprogress is not fired sometimes or delayed
  // see also #64
  xhr.onreadystatechange = onReadyStateChange;

  if ("contentType" in xhr) {
    url += (url.indexOf("?", 0) === -1 ? "?" : "&") + "padding=true";
  }
  xhr.open(method, url, true);

  if ("readyState" in xhr) {
    // workaround for Opera 12 issue with "progress" events
    // #91
    timeout = setTimeout(function () {
      onTimeout();
    }, 0);
  }
};
XHRWrapper.prototype.abort = function () {
  this._abort(false);
};
XHRWrapper.prototype.getResponseHeader = function (name) {
  return this._contentType;
};
XHRWrapper.prototype.setRequestHeader = function (name, value) {
  var xhr = this._xhr;
  if ("setRequestHeader" in xhr) {
    xhr.setRequestHeader(name, value);
  }
};
XHRWrapper.prototype.send = function (payload) {
  // loading indicator in Safari < ? (6), Chrome < 14, Firefox
  if (!("ontimeout" in XMLHttpRequest.prototype) &&
    document != undefined &&
    document.readyState != undefined &&
    document.readyState !== "complete") {
    var that = this;
    that._sendTimeout = setTimeout(function () {
      that._sendTimeout = 0;
      that.send(payload);
    }, 4);
    return;
  }

  var xhr = this._xhr;
  // withCredentials should be set after "open" for Safari and Chrome (< 19 ?)
  xhr.withCredentials = this.withCredentials;
  xhr.responseType = this.responseType;
  try {
    // xhr.send(); throws "Not enough arguments" in Firefox 3.0
    xhr.send(payload);
  } catch (error1) {
    // Safari 5.1.7, Opera 12
    throw error1;
  }
};

function XHRTransport(xhr) {
  this._xhr = new XHRWrapper(xhr);
}

XHRTransport.prototype.open = function (onStartCallback, onProgressCallback, onFinishCallback, url, withCredentials, headers) {
  var xhr = this._xhr;
  xhr.open("GET", url);
  var offset = 0;
  xhr.onprogress = function () {
    var responseText = xhr.responseText;
    var chunk = responseText.slice(offset);
    offset += chunk.length;
    onProgressCallback(chunk);
  };
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 2) {
      var status = xhr.status;
      var statusText = xhr.statusText;
      var contentType = xhr.getResponseHeader("Content-Type");
      onStartCallback(status, statusText, contentType);
    } else if (xhr.readyState === 4) {
      onFinishCallback();
    }
  };
  xhr.withCredentials = withCredentials;
  xhr.responseType = "text";
  for (var name in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, name)) {
      xhr.setRequestHeader(name, headers[name]);
    }
  }
  xhr.send();
};
XHRTransport.prototype.cancel = function () {
  var xhr = this._xhr;
  xhr.abort();
};

function EventTarget() {
  this._listeners = Object.create(null);
}

EventTarget.prototype.dispatchEvent = function (event) {
  event.target = this;
  var typeListeners = this._listeners[event.type];
  if (typeListeners != undefined) {
    var length = typeListeners.length;
    for (var i = 0; i < length; i += 1) {
      var listener = typeListeners[i];
      try {
        if (typeof listener.handleEvent === "function") {
          listener.handleEvent(event);
        } else {
          listener.call(this, event);
        }
      } catch (e) {
        throwError(e);
      }
    }
  }
};
EventTarget.prototype.addEventListener = function (type, listener) {
  type = String(type);
  var listeners = this._listeners;
  var typeListeners = listeners[type];
  if (typeListeners == undefined) {
    typeListeners = [];
    listeners[type] = typeListeners;
  }
  var found = false;
  for (var i = 0; i < typeListeners.length; i += 1) {
    if (typeListeners[i] === listener) {
      found = true;
    }
  }
  if (!found) {
    typeListeners.push(listener);
  }
};
EventTarget.prototype.removeEventListener = function (type, listener) {
  type = String(type);
  var listeners = this._listeners;
  var typeListeners = listeners[type];
  if (typeListeners != undefined) {
    var filtered = [];
    for (var i = 0; i < typeListeners.length; i += 1) {
      if (typeListeners[i] !== listener) {
        filtered.push(typeListeners[i]);
      }
    }
    if (filtered.length === 0) {
      delete listeners[type];
    } else {
      listeners[type] = filtered;
    }
  }
};

function Event(type) {
  this.type = type;
  this.target = undefined;
}

function MessageEvent(type, options) {
  Event.call(this, type);
  this.data = options.data;
  this.lastEventId = options.lastEventId;
}

MessageEvent.prototype = Object.create(Event.prototype);

var WAITING = -1;
var CONNECTING = 0;
var OPEN = 1;
var CLOSED = 2;

var AFTER_CR = -1;
var FIELD_START = 0;
var FIELD = 1;
var VALUE_START = 2;
var VALUE = 3;

var contentTypeRegExp = /^text\/event\-stream;?(\s*charset\=utf\-8)?$/i;

var MINIMUM_DURATION = 1000;
var MAXIMUM_DURATION = 18000000;

var parseDuration = function (value, def) {
  var n = parseInt(value, 10);
  if (n !== n) {
    n = def;
  }
  return clampDuration(n);
};
var clampDuration = function (n) {
  return Math.min(Math.max(n, MINIMUM_DURATION), MAXIMUM_DURATION);
};
var fire = function (that, f, event) {
  try {
    if (typeof f === "function") {
      f.call(that, event);
    }
  } catch (e) {
    throwError(e);
  }
};

function EventSourcePolyfill(url, options) {
  EventTarget.call(this);

  this.onopen = undefined;
  this.onmessage = undefined;
  this.onerror = undefined;

  this.url = undefined;
  this.readyState = undefined;
  this.withCredentials = undefined;

  this._close = undefined;

  start(this, url, options);
}

function start(es, url, options) {
  url = String(url);
  var withCredentials = options != undefined && Boolean(options.withCredentials);

  var initialRetry = clampDuration(1000);
  var heartbeatTimeout = options != undefined && options.heartbeatTimeout != undefined ? parseDuration(options.heartbeatTimeout, 45000) : clampDuration(45000);

  var lastEventId = "";
  var retry = initialRetry;
  var wasActivity = false;
  var headers = options != undefined && options.headers != undefined ? JSON.parse(JSON.stringify(options.headers)) : undefined;
  var CurrentTransport = options != undefined && options.Transport != undefined ? options.Transport : getBestTransport();
  var transport = new XHRTransport(new CurrentTransport());
  var timeout = 0;
  var currentState = WAITING;
  var dataBuffer = "";
  var lastEventIdBuffer = "";
  var eventTypeBuffer = "";

  var textBuffer = "";
  var state = FIELD_START;
  var fieldStart = 0;
  var valueStart = 0;

  var onStart = function (status, statusText, contentType) {
    if (currentState === CONNECTING) {
      if (status === 200 && contentType != undefined && contentTypeRegExp.test(contentType)) {
        currentState = OPEN;
        wasActivity = true;
        retry = initialRetry;
        es.readyState = OPEN;
        var event = new Event("open");
        es.dispatchEvent(event);
        fire(es, es.onopen, event);
      } else {
        var message = "";
        if (status !== 200) {
          if (statusText) {
            statusText = statusText.replace(/\s+/g, " ");
          }
          message = "EventSource's response has a status " + status + " " + statusText + " that is not 200. Aborting the connection.";
        } else {
          message = "EventSource's response has a Content-Type specifying an unsupported type: " + (contentType == undefined ? "-" : contentType.replace(/\s+/g, " ")) + ". Aborting the connection.";
        }
        throwError(new Error(message));
        close();
        var event = new Event("error");
        es.dispatchEvent(event);
        fire(es, es.onerror, event);
      }
    }
  };

  var onProgress = function (textChunk) {
    if (currentState === OPEN) {
      var n = -1;
      for (var i = 0; i < textChunk.length; i += 1) {
        var c = textChunk.charCodeAt(i);
        if (c === "\n".charCodeAt(0) || c === "\r".charCodeAt(0)) {
          n = i;
        }
      }
      var chunk = (n !== -1 ? textBuffer : "") + textChunk.slice(0, n + 1);
      textBuffer = (n === -1 ? textBuffer : "") + textChunk.slice(n + 1);
      if (chunk !== "") {
        wasActivity = true;
      }
      for (var position = 0; position < chunk.length; position += 1) {
        var c = chunk.charCodeAt(position);
        if (state === AFTER_CR && c === "\n".charCodeAt(0)) {
          state = FIELD_START;
        } else {
          if (state === AFTER_CR) {
            state = FIELD_START;
          }
          if (c === "\r".charCodeAt(0) || c === "\n".charCodeAt(0)) {
            if (state !== FIELD_START) {
              if (state === FIELD) {
                valueStart = position + 1;
              }
              var field = chunk.slice(fieldStart, valueStart - 1);
              var value = chunk.slice(valueStart + (valueStart < position && chunk.charCodeAt(valueStart) === " ".charCodeAt(0) ? 1 : 0), position);
              if (field === "data") {
                dataBuffer += "\n";
                dataBuffer += value;
              } else if (field === "id") {
                lastEventIdBuffer = value;
              } else if (field === "event") {
                eventTypeBuffer = value;
              } else if (field === "retry") {
                initialRetry = parseDuration(value, initialRetry);
                retry = initialRetry;
              } else if (field === "heartbeatTimeout") {
                heartbeatTimeout = parseDuration(value, heartbeatTimeout);
                if (timeout !== 0) {
                  clearTimeout(timeout);
                  timeout = setTimeout(function () {
                    onTimeout();
                  }, heartbeatTimeout);
                }
              }
            }
            if (state === FIELD_START) {
              if (dataBuffer !== "") {
                lastEventId = lastEventIdBuffer;
                if (eventTypeBuffer === "") {
                  eventTypeBuffer = "message";
                }
                var event = new MessageEvent(eventTypeBuffer, {
                  data: dataBuffer.slice(1),
                  lastEventId: lastEventIdBuffer
                });
                es.dispatchEvent(event);
                if (eventTypeBuffer === "message") {
                  fire(es, es.onmessage, event);
                }
                if (currentState === CLOSED) {
                  return;
                }
              }
              dataBuffer = "";
              eventTypeBuffer = "";
            }
            state = c === "\r".charCodeAt(0) ? AFTER_CR : FIELD_START;
          } else {
            if (state === FIELD_START) {
              fieldStart = position;
              state = FIELD;
            }
            if (state === FIELD) {
              if (c === ":".charCodeAt(0)) {
                valueStart = position + 1;
                state = VALUE_START;
              }
            } else if (state === VALUE_START) {
              state = VALUE;
            }
          }
        }
      }
    }
  };

  var onFinish = function () {
    if (currentState === OPEN || currentState === CONNECTING) {
      currentState = WAITING;
      if (timeout !== 0) {
        clearTimeout(timeout);
        timeout = 0;
      }
      timeout = setTimeout(function () {
        onTimeout();
      }, retry);
      retry = clampDuration(Math.min(initialRetry * 16, retry * 2));

      es.readyState = CONNECTING;
      var event = new Event("error");
      es.dispatchEvent(event);
      fire(es, es.onerror, event);
    }
  };

  var close = function () {
    currentState = CLOSED;
    transport.cancel();
    if (timeout !== 0) {
      clearTimeout(timeout);
      timeout = 0;
    }
    es.readyState = CLOSED;
  };

  var onTimeout = function () {
    timeout = 0;

    if (currentState !== WAITING) {
      if (!wasActivity) {
        throwError(new Error("No activity within " + heartbeatTimeout + " milliseconds. Reconnecting."));
        transport.cancel();
      } else {
        wasActivity = false;
        timeout = setTimeout(function () {
          onTimeout();
        }, heartbeatTimeout);
      }
      return;
    }

    wasActivity = false;
    timeout = setTimeout(function () {
      onTimeout();
    }, heartbeatTimeout);

    currentState = CONNECTING;
    dataBuffer = "";
    eventTypeBuffer = "";
    lastEventIdBuffer = lastEventId;
    textBuffer = "";
    fieldStart = 0;
    valueStart = 0;
    state = FIELD_START;

    // https://bugzilla.mozilla.org/show_bug.cgi?id=428916
    // Request header field Last-Event-ID is not allowed by Access-Control-Allow-Headers.
    var requestURL = url;
    if (url.slice(0, 5) !== "data:" &&
      url.slice(0, 5) !== "blob:") {
      requestURL = url + (url.indexOf("?", 0) === -1 ? "?" : "&") + "lastEventId=" + encodeURIComponent(lastEventId);
    }
    var requestHeaders = {};
    requestHeaders["Accept"] = "text/event-stream";
    if (headers != undefined) {
      for (var name in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, name)) {
          requestHeaders[name] = headers[name];
        }
      }
    }
    try {
      transport.open(onStart, onProgress, onFinish, requestURL, withCredentials, requestHeaders);
    } catch (error) {
      close();
      throw error;
    }
  };

  es.url = url;
  es.readyState = CONNECTING;
  es.withCredentials = withCredentials;
  es._close = close;

  onTimeout();
}

EventSourcePolyfill.prototype = Object.create(EventTarget.prototype);
EventSourcePolyfill.prototype.CONNECTING = CONNECTING;
EventSourcePolyfill.prototype.OPEN = OPEN;
EventSourcePolyfill.prototype.CLOSED = CLOSED;
EventSourcePolyfill.prototype.close = function () {
  this._close();
};

EventSourcePolyfill.CONNECTING = CONNECTING;
EventSourcePolyfill.OPEN = OPEN;
EventSourcePolyfill.CLOSED = CLOSED;
EventSourcePolyfill.prototype.withCredentials = undefined;

global.EventSourcePolyfill = EventSourcePolyfill;
global.NativeEventSource = NativeEventSource;

if (XMLHttpRequest != undefined && (NativeEventSource == undefined || !("withCredentials" in NativeEventSource.prototype))) {
  // Why replace a native EventSource ?
  // https://bugzilla.mozilla.org/show_bug.cgi?id=444328
  // https://bugzilla.mozilla.org/show_bug.cgi?id=831392
  // https://code.google.com/p/chromium/issues/detail?id=260144
  // https://code.google.com/p/chromium/issues/detail?id=225654
  // ...
  global.EventSource = EventSourcePolyfill;
}

/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
var _base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// Use a lookup table to find the index.
var _base64_lookup = new Uint8Array(256);
for (var i = 0; i < _base64_chars.length; i++) {
  _base64_lookup[_base64_chars.charCodeAt(i)] = i;
}
function decodeBase64(base64) {
  var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }
  var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);
  for (i = 0; i < len; i+=4) {
    encoded1 = _base64_lookup[base64.charCodeAt(i)];
    encoded2 = _base64_lookup[base64.charCodeAt(i+1)];
    encoded3 = _base64_lookup[base64.charCodeAt(i+2)];
    encoded4 = _base64_lookup[base64.charCodeAt(i+3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return arraybuffer;
}

/**
 * TextEncoder Polyfill
 * https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
 */
var _encoderInstance = null;
function str2utf8(str) {
  if (_encoderInstance === null) {
    if (typeof TextEncoder !== 'undefined') {
      _encoderInstance = new TextEncoder();
    } else {
      _encoderInstance = false;
    }
  }
  if (_encoderInstance) {
    return _encoderInstance.encode(str);
  }
  var Len = str.length, resPos = -1;
  var resArr = new Uint8Array(Len * 3);
  for (var point = 0, nextcode = 0, i = 0; i !== Len;) {
    point = str.charCodeAt(i), i += 1;
    if (point >= 0xD800 && point <= 0xDBFF) {
      if (i === Len) {
        resArr[resPos += 1] = 0xef/*0b11101111*/;
        resArr[resPos += 1] = 0xbf/*0b10111111*/;
        resArr[resPos += 1] = 0xbd/*0b10111101*/;
        break;
      }
      // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
      nextcode = str.charCodeAt(i);
      if (nextcode >= 0xDC00 && nextcode <= 0xDFFF) {
        point = (point - 0xD800) * 0x400 + nextcode - 0xDC00 + 0x10000;
        i += 1;
        if (point > 0xffff) {
          resArr[resPos += 1] = (0x1e/*0b11110*/ << 3) | (point >>> 18);
          resArr[resPos += 1] = (0x2/*0b10*/ << 6) | ((point >>> 12) & 0x3f/*0b00111111*/);
          resArr[resPos += 1] = (0x2/*0b10*/ << 6) | ((point >>> 6) & 0x3f/*0b00111111*/);
          resArr[resPos += 1] = (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/);
          continue;
        }
      } else {
        resArr[resPos += 1] = 0xef/*0b11101111*/;
        resArr[resPos += 1] = 0xbf/*0b10111111*/;
        resArr[resPos += 1] = 0xbd/*0b10111101*/;
        continue;
      }
    }
    if (point <= 0x007f) {
      resArr[resPos += 1] = (0x0/*0b0*/ << 7) | point;
    } else if (point <= 0x07ff) {
      resArr[resPos += 1] = (0x6/*0b110*/ << 5) | (point >>> 6);
      resArr[resPos += 1] = (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/);
    } else {
      resArr[resPos += 1] = (0xe/*0b1110*/ << 4) | (point >>> 12);
      resArr[resPos += 1] = (0x2/*0b10*/ << 6) | ((point >>> 6) & 0x3f/*0b00111111*/);
      resArr[resPos += 1] = (0x2/*0b10*/ << 6) | (point & 0x3f/*0b00111111*/);
    }
  }
  return new Uint8Array(resArr.buffer.slice(0, resPos + 1));
}


/**
 * browser eventSource
 * 不支持 webSocket, 使用 eventSource 接收消息, ajax 发送消息
 * 对于浏览器而言, 支持 webSocket 的肯定都支持 ES5 标准
 * 也就不需要 polyfill, 所以该方法与 polyfill 同时有或无
 *
 * 若在该模式下需要使用 arrayBuffer, 需自行引入其他兼容库 (如 core-js)
 * 不过该库最多只能兼容 IE9, 使用场景需要兼容低版本浏览器, 不推荐在消息中使用 arrayBuffer
 */
function create(elm) {
  return document.createElement(elm);
}
function Request(ws) {
  var self = this;
  var xhr = getBestTransport();
  var url = ws.url.split('://');
  url[0] = url[0].toLowerCase();
  url = 'http' + (url[0] === 'wss' ? 's' : '') + '://' + url[1];
  self._ws = ws;
  self._id = null;
  self._url = url;
  self._alive = url + (url.indexOf("?", 0) === -1 ? "?" : "&") + "polling=polling";
  self._xhr = new XHRWrapper(new xhr());
  self._header = null;
  self._connected = false;
}
Request.prototype.connect = function () {
  var self = this;
  self._id = null;
  var eventSource = new EventSource(self._alive, {
    heartbeatTimeout: 90000
  });
  // 发出请求成功 (eventSource 自带监听)
  eventSource.addEventListener("open", function (ev) {
    self._connected = true;
    self._ws._open();
  });
  // 发出请求失败 (eventSource 自带监听)
  eventSource.addEventListener("error", function (ev) {
    eventSource.close();
    self._ws._error('Connect eventSource failed');
    self.disconnect(1006, "");
  });
  // 服务端告知握手失败 (监听服务端消息)
  eventSource.addEventListener("failed", function (ev) {
    eventSource.close();
    self.disconnect(1013, 'Try Again Later');
  });
  // 服务端告知握手成功(需要客户端发送认证信息)
  eventSource.addEventListener("success", function (ev) {
    self._id = ev.data;
    self._url += (self._url.indexOf("?", 0) === -1 ? "?" : "&") + "id=" + self._id;
    self.auth(self._ws._customHeaders);
  });
  // 监听字符串消息
  eventSource.addEventListener("message", function (ev) {
    if (self._connected) {
      self._ws._transport.receiveData(ev.data)
    }
  });
  // 监听二进制消息
  eventSource.addEventListener("binary", function (ev) {
    self._ws._transport.receiveData(
      self._ws._resolveBase64 ? self._ws._resolveBase64(ev.data) : decodeBase64(ev.data),
      true
    )
  });
  // 服务端主动关闭
  eventSource.addEventListener("offline", function (ev) {
    eventSource.close();
    if (self._connected) {
      var data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        data = {};
      }
      if ('code' in data) {
        self.disconnect(data.code, ('reason' in data ? data.reason : ''));
      } else {
        self.disconnect(1006, "");
      }
    }
  });
};
Request.prototype.auth = function (headers) {
  var self = this;
  if (!this._id || !this._connected) {
    return;
  }
  // webSocket 连接会发送 cookie, 服务端一般也都会使用 cookie 来认证用户
  // 为保持一致性, polling 模式也发送 cookie, 可使用 xmlRequest 的 withCredentials
  // 但 IE9 以下不支持 withCredentials 跨域发送 cookie, 且对于 withCredentials 情况, 有一定安全隐患
  // 所以统一采用 form 方式发送 open, 该处仅做个预防操作, 如果不是在浏览器环境操作, 仍然使用 ajax 方式
  if (!(typeof document === 'object' && 'createElement' in document)) {
    self.post('open' + JSON.stringify(headers), true);
    return;
  }
  var temp = create('div');
  temp.style.display = 'none';
  var iframeName = '_auth' + Date.now();
  var iframe;
  try {
    // for ie8
    iframe = create('<iframe name="'+iframeName+'" id="'+iframeName+'">');
  } catch (e) {
    iframe = create('iframe');
    iframe.name = iframeName;
    iframe.id = iframeName;
  }
  iframe.onload = function () {
    document.body.removeChild(temp);
  };
  iframe.onerror = function () {
    document.body.removeChild(temp);
  };
  temp.appendChild(iframe);

  var form = create("form");
  form.method = "POST";
  form.action = self._url;
  form.target = iframeName;
  var elm, key;
  headers._action = 'open';
  for (key in headers) {
    if (headers.hasOwnProperty(key)) {
      elm = create('input');
      elm.name = key;
      elm.value = headers[key];
    }
    form.appendChild(elm);
  }
  temp.appendChild(form);
  document.body.appendChild(temp);
  form.submit();
};
Request.prototype.post = function (data, withCredentials) {
  var self = this;
  if (self._id && this._connected) {
    var xhr = this._xhr;
    xhr.withCredentials = Boolean(withCredentials);
    xhr.open("POST", this._url, true);
    xhr.responseType = "text";
    xhr.send(data);
  }
  return self;
};
Request.prototype.send = function send(code, data, buffers) {
  var self = this;
  if (!data || !self._id || !self._connected) {
    return self;
  }
  data = code + '' + JSON.stringify(data);
  if (isArray(buffers) && buffers.length) {
    buffers.unshift({
      type: "arrayBuffer",
      data: str2utf8(data).buffer
    });
    var totalLength = 0;
    var bufferLength = buffers.length;
    var headerBuffer = new ArrayBuffer(4 * (bufferLength + 2));
    var int32View = new Int32Array(headerBuffer);
    var buf, j, len;
    int32View[0] = 2037279074; // string: "biny"
    int32View[1] = bufferLength;
    for (j = 0; j < bufferLength; j++) {
      buf = buffers[j];
      if (buf.type === "arrayBuffer") {
        len = buf.data.byteLength;
        buffers[j] = buf.data;
      } else if (buf.type === "typeArray") {
        buf = buf.data.buffer;
        len = buf.byteLength;
        buffers[j] = buf;
      } else {
        throw 'Polling emit not support binary type[' + buf.type + ']';
      }
      totalLength += len;
      int32View[j + 2] = len;
    }
    totalLength += headerBuffer.byteLength;
    buffers.unshift(headerBuffer);
    var tmp = new Uint8Array(totalLength);
    bufferLength = buffers.length;
    len = 0;
    for (j = 0; j < bufferLength; j++) {
      tmp.set(new Uint8Array(buffers[j]), len);
      len += buffers[j].byteLength;
    }
    data = tmp.buffer;
  } else {
    data = 'push' + data;
  }
  return self.post(data);
};
Request.prototype.close = function close(code, reason) {
  reason = !!reason ? reason : '';
  var data = arguments.length ? JSON.stringify({
    code: code,
    reason:reason
  }) : '';
  this.post('clos' + data);
  this.disconnect(code, reason);
};
Request.prototype.disconnect = function (code, reason) {
  if (this._connected) {
    this._connected = false;
    this._ws._close(code, reason);
  }
};

var _pollingRequest = null;
function ___openRequest() {
  if (!_pollingRequest) {
    _pollingRequest = new Request(this);
  }
  this.socket = _pollingRequest;
  _pollingRequest.connect();
}