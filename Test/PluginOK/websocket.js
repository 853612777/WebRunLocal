﻿function GetDefaultConn()
{
	if(document.location.href.toLowerCase().indexOf("https") == -1)
		return 'ws://wrl.zorrosoft.com:80?sid=' + getrandom(5).toLocaleString() + '&flag=1';
	else
		return 'wss://wrl.zorrosoft.com:443?sid=' + getrandom(5).toLocaleString() + '&flag=1';
}

// 判断是否IE浏览器，用于区别使用Web Socket连接组件
function isIE()
{
	if (!!window.ActiveXObject || "ActiveXObject" in window)
		return true;
	else
		return false;
}

// 判断是否为Firefox，用于区别处理页面滚动和页面切换可见性
function isFirefox()
{
	if (navigator.userAgent.toLowerCase().indexOf("firefox") != -1)
		return true;
	else
		return false;
}

function hasScrollbar() 
{
    return document.body.scrollHeight > (window.innerHeight || document.documentElement.clientHeight);
}

function getScrollbarWidth() 
{
    var scrollDiv = document.createElement("div");
    scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
    document.body.appendChild(scrollDiv);
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    return scrollbarWidth;
}

// 获取随机数
function getrandom(nums) 
{
    return ('000000'+ Math.floor(Math.random() * 999999)).slice(-6);
}

(function (window, undefined)
{
    $(function ()
	{
        var $win = $('body');
		var socket;						// Web Socket连接对象
		var nRequstAppletID = 0;  		// 启动小程序序号
		var nAppletRunID = 0;  			// 小程序运行ID
		var iOldLeft = 'undefined';		// 原X坐标
		var iOldTop = 'undefined';		// 原Y坐标

        showmessage = function (msg, type)
		{
            var datetime = new Date();
            var tiemstr = datetime.getHours() + ':' + datetime.getMinutes() + ':' + datetime.getSeconds() + '.' + datetime.getMilliseconds();
            if (type)
			{
                var $p = $('<div>').appendTo($('body').find('#div_msg'));
                var $type = $('<span>').text('[' + tiemstr + ']' + type + '：').appendTo($p);
                var $msg = $('<span>').addClass('thumbnail').css({ 'margin-bottom': '5px' }).text(msg).appendTo($p);
            }
			else
			{
                var $center = $('<center>').text(msg + '(' + tiemstr + ')').css({ 'font-size': '12px' }).appendTo($('body').find('#div_msg'));
            }
        };

		WrlVisibilityListener = function (AddEvent)
		{
			if (isFirefox())
			{
				// 只有Firefox需要处理
				if(AddEvent)
					document.addEventListener('visibilitychange',FirefoxVisibilityState,false);
				else
					document.removeEventListener('visibilitychange',FirefoxVisibilityState,false);
			}
		}
		
		WrlScrollListener = function (AddEvent)
		{
			if(!isFirefox())
			{
				if(AddEvent)
					window.onscroll = document.onscroll = scrollFunc;
			}
			else
			{
				if(AddEvent)
					document.addEventListener("scroll",scrollFunc,false);
				else
					document.removeEventListener("scroll");
			}
		}
		
		scrollFunc = function (e)
		{
			if(!nAppletRunID)
				return;
			if(!hasScrollbar())
				return;
			// 测试IE内嵌小程序滚动
			var oDivRect = $("#IEApplet").get(0).getBoundingClientRect();
			if(iOldTop == 'undefined')
			{
				iOldLeft = oDivRect.left;
				iOldTop = oDivRect.top;
			}
			var nOX = Math.round(oDivRect.left - iOldLeft);
			var nOY = Math.round(oDivRect.top - iOldTop);
			iOldLeft = oDivRect.left;
			iOldTop = oDivRect.top;

			if(Math.abs(nOX) >= 1 || Math.abs(nOY) >= 1)
			{
				setTimeout(function ()
				{
					WrlScrollApplet(nOX,nOY);
				},0);
			}
		}
		// 处理接收到的JSON数据包
		DealRecMessage = function (Data)
		{
			var jsondata = $.parseJSON(Data);
			if(jsondata.rid == nRequstAppletID)
			{
				if(0 == jsondata.ret)
				{
					nAppletRunID = jsondata.data.ID;
					showmessage('小程序运行ID：' + nAppletRunID);
				}
				else
				{
					showmessage('小程序运行错误：' + jsondata.err);
				}
			}
			else
			{
				if(jsondata.req == 'Wrl_AppletScroll')
				{
					console.log(Data);
				}
				else
					showmessage(Data, 'receive');
			}

		}
		// 处理发送的JSON数据包
		DealSendMessage = function (Data)
		{
			var jsondata = $.parseJSON(Data);
			if(jsondata.req == "Wrl_IEApplet"
				|| jsondata.req == "Wrl_FlashApplet"
				|| jsondata.req == "Wrl_OfficeApplet"
				|| jsondata.req == "Wrl_AppletStart")
			{
				nRequstAppletID = jsondata.rid;
			}
		}
		
		WrlScrollApplet = function (DeltaX,DeltaY)
		{
			//return;// 屏蔽滚动小程序
			if(nAppletRunID)
			{
				var msg = '{"req":"Wrl_AppletScroll","DisableLog":1,"rid":';
				msg += getrandom(5).toLocaleString();
				msg += ',"para":{"ID":';
				msg += nAppletRunID;
				if(Math.abs(DeltaY) >= 1)
				{
					msg += ',"OffsetY":';
					msg += DeltaY;
				}
				if(Math.abs(DeltaX) >= 1)
				{
					msg += ',"OffsetX":';
					msg += DeltaX;
				}
				msg += '}}';
				if(!isIE())
				{
					socket.send(msg);
				}
				else
				{
					socket = document.getElementById("WrlWS");
					socket.send(msg);
				}
				console.log(msg);
			}
		}

		FirefoxVisibilityState = function ()
		{
			if(nAppletRunID < 1)
				return;// 未启动小程序
			// 控制小程序显示、目前仅对网页内加载小程序正常，新网页加载的小程序控制还不对
			var msg = '{"req":"Wrl_AppletControl","rid":';
			msg += getrandom(5).toLocaleString();
			msg += ',"para":{"ID":';
			msg += nAppletRunID;
			if (document.visibilityState == 'visible')
			{
				/// 恢复显示
				msg += ',"Code":';
				msg += 8;
			}
			else
			{
				/// 需要隐藏
				msg += ',"Code":';
				msg += 4;
			}
			msg += '}}';
			socket.send(msg);
			showmessage(msg, 'send');
		}

        $win.find('#btn_conn').attr('disabled', false);
        $win.find('#btn_close').attr('disabled', true);
        $win.find('#btn_max').attr('disabled', true);

        $win.find('#btn_conn').click(function () 
		{
            $win.find('#btn_conn').attr('disabled', true);
            $win.find('#btn_close').attr('disabled', false);
			$win.find('#btn_max').attr('disabled', false);
            var url = $win.find('#inp_url').val();
			
			if(!isIE())
			{
				// 创建一个Socket实例
				socket = new WebSocket(url);
				showmessage('开始连接');
				
				// 打开Socket 
				socket.onopen = function (event) {
					// 发送一个初始化消息
					showmessage(url + ' 连接成功');
					WrlVisibilityListener(true);
					WrlScrollListener(true);
				};
				
				// 监听消息
				socket.onmessage = function (eve) {
					DealRecMessage(eve.data);
				};
				
				// 监听Socket的关闭
				socket.onclose = function (event) {
					WrlVisibilityListener(false);
					WrlScrollListener(false);
					nAppletRunID = 0;
					nRequstAppletID = 0;
					
					showmessage('连接已断开');
					$win.find('#btn_conn').attr('disabled', false);
					$win.find('#btn_close').attr('disabled', true);
				};
			}
			else
			{
				 socket = document.getElementById("WrlWS");
				 if(socket)
				 {
					socket.EnableLog = true;
					if(socket.ReadyState > 1)
					{
						// 还未连接
						socket.Connect(url);
					}
				 }
			}
        });
		
        $win.find('#btn_close').click(function ()
		{
			if(!isIE())
			{
				if (socket) 
				{
					socket.close();
				}
			}
			else
			{
				 socket = document.getElementById("WrlWS");
				 if(socket)
				 {
					socket.close();
				}
			}
        });
		
        $win.find('#btn_send').click(function ()
		{
            var msg = $win.find('#inp_send').val();
			if(!isIE())
			{
				if (socket && msg) 
				{
					$win.find('#inp_send').val('');
					socket.send(msg);
					DealSendMessage(msg);
					showmessage(msg, 'send');
				}
			}
			else
			{
				socket = document.getElementById("WrlWS");
				if (socket && msg) 
				{
					$win.find('#inp_send').val('');
					socket.send(msg);
					DealSendMessage(msg);
					showmessage(msg, 'send');
				}
			}
        });
		
        $win.find('#inp_send').keyup(function () 
		{
            if (event.ctrlKey && event.keyCode == 13) 
			{
                $win.find('#btn_send').trigger('click');
            }
        });

        $win.find('#btn_clear').click(function () 
		{
            $win.find('#div_msg').empty();
        });
		
		$win.find('#btn_max').click(function () 
		{
            if(nAppletRunID < 1)
				return;// 未启动小程序
			var W = $(document).width();
			var H = $(document).height();
			// 小程序显示到整个客户区
			var msg = '{"req":"Wrl_AppletResize","rid":';
			msg += getrandom(5).toLocaleString();
			msg += ',"para":{"ID":';
			msg += nAppletRunID;
			msg += ',"X":0,"Y":0,"Width":';
			msg += W;
			msg += ',"Height":';
			msg += H;
			msg += '}}';
			socket.send(msg);
			showmessage(msg, 'send');
        }); 
    });
})(window);
