/**
 * server.js represents the Node.js main server file for Skylight Project 2014
 * author: Tony Gillan
 * version: 0.1
 * date: 01/03/14
 */

/**
 * library dependencies
 */
var fs = require('fs');				//local file reading
var path = require("path");		//dealing with local urls
var url = require("url");			//deal with url string and parameters
var xml2js = require('xml2js');	//xml parsing library


/**
 * static variables
 */
var MIN_EMAIL_LEN = 5;
var MIN_PASS_LEN = 6;

var DEF_USERNAME = 'local';
var DEF_FNAME = 'LocalF';
var DEF_LNAME = 'LocalL';
var DEF_EMAIL = 'local@email.com';
var DEF_ACCESS = 'blocked';
var DEF_ROOM = 'quarantine';
var DEF_LASTON = null;

var SMTP_SERVICE = 'Gmail';
var SMTP_EMAIL = 'test@email.com';
var SMTP_USERNAME = 'Test Email';
var SMTP_PASSWORD = 'password';

var XML_PATH = 'xml/';	//path to xml folder relative to the root


/**
 * load local javascript libraries
 */
var fileModule = require('./scripts/utility/file.js');
//var TestObjectModule = require('./scripts/TestObject.js');
var ChatRoomModule = require('./node_modules/ChatRoom.js');
var UserListModule = require('./node_modules/UserList.js');
var UserModule = require('./node_modules/User.js');
var RoomListModule = require('./node_modules/RoomList.js');
var RoomModule = require('./node_modules/Room.js');


/**
 * setup express http server middleware
 */
var express = require('express');   
//var app = express();   
//app.use(express.cookieParser());  
//app.use(express.bodyParser());  
//app.use(express.methodOverride());  
//app.use(express.session({ secret: "secret" }));  
//app.use(express.static(process.env.OPENSHIFT_REPO_DIR + '/public' ));

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
//app.listen(port, ipaddress);  


/**
 * setup the main http server functionality
 */
var MainApp = function() {
	
	//define access to this scope
	var self = this;
	
	
	/**********************************************************************************
	 *
	 * Define the helper functions for setting up the express http server on OpenShift
	 *
	 **********************************************************************************/

	/**
	 *  Set up server IP address and port # using env variables/defaults.
	 */
	self.setupVariables = function() {
		//  Set the environment variables we need.
		self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
		self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
		
		if (typeof self.ipaddress === "undefined") {
			//  Log errors on OpenShift but continue w/ 127.0.0.1 - this
			//  allows us to run/test the app locally.
			console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
			self.ipaddress = "127.0.0.1";
		};
	};
	
	
	/**
	 *  Populate the cache.
	 */
	self.populateCache = function() {
		if (typeof self.zcache === "undefined") {
			self.zcache = { 'index.html': '' };
		}
		
		//  Local cache for static content.
		self.zcache['index.html'] = fs.readFileSync('./index.html');
	};
	
	
	/**
	 *  Retrieve entry (content) from cache.
	 *  @param {string} key  Key identifying content to retrieve from cache.
	 */
	self.cache_get = function(key) { return self.zcache[key]; };
	
	
	/**
	 *  terminator === the termination handler
	 *  Terminate server on receipt of the specified signal.
	 *  @param {string} sig  Signal to terminate on.
	 */
	self.terminator = function(sig){
		if (typeof sig === "string") {
			console.log('> %s: Received %s - terminating sample app...', Date(Date.now()), sig);
			process.exit(1);
		}
		console.log('> %s: Node server stopped.', Date(Date.now()) );
	};
	
	
	/**
	 *  Setup termination handlers (for exit and a list of signals).
	 */
	self.setupTerminationHandlers = function(){
		//  Process on exit and signals.
		process.on('exit', function() { self.terminator(); });
		
		// Removed 'SIGPIPE' from the list - bugz 852598.
		['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
		'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
		].forEach(function(element, index, array) {
			process.on(element, function() { self.terminator(element); });
		});
	};
	
	
	/**********************************************************************************
	 *
	 * Define the main functions for the express http server on OpenShift
	 *
	 **********************************************************************************/

	/**
	 *  Create the routing table entries + handlers for the application.
	 */
	self.createRoutes = function() {
		self.routes = { };	//create a routing list of locations
		
		//output test site with robot image
		self.routes['/asciimo'] = function(request, response) {
			var link = "http://i.imgur.com/kmbjB.png";
			response.send("<html><body><img src='" + link + "'></body></html>");
		};
		
		//output the main default static html (i.e. index.html)
		self.routes['/'] = function(request, response) {
			//response.setHeader('Content-Type', 'text/html');
			//response.send(self.cache_get('index.html') );
			
			console.log('%s received request for %s', (new Date()), request.url);
			//response.writeHead(200, {'Content-Type': 'text/plain'});
			//response.write("Welcome to Skylight Project on OpenShift!\n\n");
			//response.end("Thanks for visiting us! \n");
			
			//deal with request type
			var addr = "unknown";
			if (request.headers.hasOwnProperty('x-forwarded-for')) {
				addr = request.headers['x-forwarded-for'];
			} else if (request.headers.hasOwnProperty('remote-addr')){
				addr = request.headers['remote-addr'];
			}
			if (request.headers.hasOwnProperty('accept')) {
				if (request.headers.accept.toLowerCase() == "application/json") {
					request.writeHead(200, {'Content-Type': 'application/json'});
					request.end(JSON.stringify({'ip': addr}, null, 4) + "\n");			
					return ;
				}
			}
			
			
			//output the client header html
			response.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
			
			//modernizer heading includes
			response.write('<!--[if lt IE 7]><html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->' + '\n');
			response.write('<!--[if IE 7]><html class="no-js lt-ie9 lt-ie8"> <![endif]-->' + '\n');
			response.write('<!--[if IE 8]><html class="no-js lt-ie9"> <![endif]-->' + '\n');
			response.write('<!--[if gt IE 8]><!--> <html class="no-js"> <!--<![endif]-->' + '\n');
			response.write('<head>' + '\n');
			response.write('<meta charset="utf-8">' + '\n');
			response.write('<meta http-equiv="X-UA-Compatible" content="IE=edge">' + '\n');	
			response.write('<title>Project Skylight 2014</title>' + '\n');
			response.write('<meta name="description" content="Project Skylight 2014">' + '\n');
			response.write('<meta name="viewport" content="width=device-width, initial-scale=1">' + '\n');
			response.write('<!-- Place favicon.ico and apple-touch-icon.png in the root directory -->' + '\n');
			response.write('<link rel="stylesheet" href="/styles/normalize.css">' + '\n');
			response.write('<link rel="stylesheet" href="/styles/main.css">' + '\n');
			response.write('<script src="/scripts/vendor/modernizr-2.6.2.min.js"></script>' + '\n');				
			
			//node local styles
			response.write('<script src="/socket.io/socket.io.js"></script>' + '\n');
			response.write('<script src="/scripts/project.js"></script>' + '\n');
			response.write('<link rel="stylesheet" type="text/css" href="/styles/style.css">' + '\n');
			response.write('</head>' + '\n');
			
			//output the client body html and init interface elements
			response.write('<body onload="initInterface();">' + '\n');
			
			response.write('<!--[if lt IE 7]>' + '\n');
			response.write('<p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>' + '\n');
			response.write('<![endif]-->' + '\n');
			
			//overall container
			response.write('<div id="maincontainer">' + '\n');
			
			response.write('<div class="container" id="bannercontainer">' + '\n');
			response.write('<h3>Project Skylight</h3>' + '\n');
			response.write('</div>' + '\n');	//bannercontainer

			//account panel
			response.write('<div class="container" id="accountcontainer">' + '\n');
			response.write('<button type="button" id="hideaccountbtn" onclick="showAccountView(false, true); return false;">Hide Account</button>' + '\n');
			response.write('<button type="button" id="showaccountbtn" onclick="showAccountView(true, true); return false;">Show Account</button>' + '\n');
			response.write('<div class="panel" id="accountpanel">' + '\n');
			response.write('<h3 class="panelheader">Account</h3>' + '\n');
			
			//server info
			response.write('<div class="subpanel" id="serverpanel">' + '\n');
			response.write('<h3 class="panelheader">Server</h3>' + '\n');
			response.write('<input type="text" value="server name" id="servername" readonly><br />' + '\n');
			response.write('<textarea id="serverinfo" class="textareainput" rows="4" cols="10" readonly>server info here</textarea>' + '\n');	
			response.write('</div>' + '\n');	//serverpanel			
			
			//login panel
			response.write('<div class="subpanel" id="loginpanel">' + '\n');
			response.write('<h3 class="panelheader">Profile</h3>' + '\n');
			response.write('Please login to continue...<br />' + '\n');
			response.write('Email: <input type="text" size="40" value="email@address.com" id="emailinput">' + '\n');
			response.write('<br />Password: <input type="password" size="20" value="password" id="passwordinput">' + '\n');
			response.write('<button type="button" id="loginbtn" onclick="processLogin(); return false;">Login</button> ' + '\n');
			response.write('<button type="button" id="resetbtn" onclick="resetPassword(); return false;">Reset Password</button><br />' + '\n');
			response.write('</div>' + '\n');	//loginpanel
			
			//user profile panel
			response.write('<div class="subpanel" id="profilepanel">' + '\n');
			response.write('You are currently logged in.<br />' + '\n');
			response.write('Email: <input type="text" size="35" value="email@address.com" id="pemailinput" readonly> ' + '\n');
			response.write('<button type="button" id="logoutbtn" onclick="processLogout(); return false;">Logout</button> ' + '\n');
			response.write('<button type="button" id="deleteaccountbtn" onclick="deleteAccount(); return false;">Delete Account</button><br />' + '\n');
			response.write('<form id="profileform" action="javascript:processProfile();">' + '\n');
			response.write('Username: <input type="text" size="15" maxlength="15" value="user1" id="pusernameinput"><br />' + '\n');					
			response.write('First Name: <input type="text" size="15" maxlength="15" value="John" id="pfirstnameinput"> ' + '\n');
			response.write('Last Name: <input type="text" size="15" maxlength="15" value="Smith" id="plastnameinput"><br />' + '\n');
			response.write('<input type="submit" value="Change">' + '\n');
			response.write('</form>' + '\n');
			response.write('Password: <input type="password" size="15" maxlength="15" value="password" id="ppasswordinput">' + '\n');
			response.write('<button type="button" id="changepasswordbtn" onclick="changePassword(); return false;">Change Password</button> ' + '\n');
			response.write('</div>' + '\n');	//profilepanel
			
			response.write('</div>' + '\n');	//accountpanel
			response.write('</div>' + '\n');	//accountcontainer
			
			//query parameters panel
			response.write('<div class="container" id="querycontainer">' + '\n');
			response.write('<button type="button" id="hidequerybtn" onclick="showQueryView(false); return false;">Hide System Info</button>' + '\n');
			response.write('<button type="button" id="showquerybtn" onclick="showQueryView(true); return false;">Show System Info</button>' + '\n');
			response.write('<div class="panel" id="querypanel">' + '\n');
			var myPath = url.parse(request.url).pathname;  
			var fullPath = path.join(process.cwd(), myPath);
			var queryObject = url.parse(request.url, true).query;
			if (queryObject!==undefined && queryObject!==null) {
				response.write('<p>Your IP address seems to be ' + addr + '</p>' + '\n');
				response.write('<p>url requested myPath=' + myPath + ' fullPath= ' + fullPath +
								   '</p>' + '\n');
				response.write('<p>requested parameters: ');
				for (var query in queryObject) {
					response.write(query + '=' + queryObject[query] + ', ');
				}
				response.write('</p>' + '\n');
			} else {
				//response.write('<p>no valid url query</p>' + '\n');
			}
			response.write('</div>' + '\n');	//querypanel
			response.write('</div>' + '\n');	//querycontainer
			
			//command and dialog panel
			response.write('<div class="container" id="commandcontainer">' + '\n');
			response.write('<button type="button" id="hidedialogbtn" onclick="showDialogView(false); return false;">Hide Dialog</button>' + '\n');
			response.write('<button type="button" id="showdialogbtn" onclick="showDialogView(true); return false;">Show Dialog</button>' + '\n');
			response.write('<div class="panel" id="commandpanel">' + '\n');
			response.write('<h3 class="panelheader">Conversation</h3>' + '\n');
			response.write('<form id="dialogform" action="javascript:processInput();">' + '\n');
			response.write('Results:<br />\n');
			response.write('<textarea id="outputbox" class="textareainput" rows="25" cols="10" readonly>output text here</textarea><br />' + '\n');
			response.write('<div id="commandinputpanel">' + '\n');
			response.write('Command: <input type="text" size="60" maxlength="60" value="? for help" id="commandinput">' + '\n');
			response.write('<input type="submit" value="Submit"><br />' + '\n');
			response.write('</div>' + '\n');	//commandinputpanel
			response.write('<button type="button" id="hidecommandbtn" onclick="showCommandView(false); return false;">Hide Commandline</button>' + '\n');
			response.write('<button type="button" id="showcommandbtn" onclick="showCommandView(true); return false;">Show Commandline</button>' + '\n');
			response.write('</form>' + '\n');
			response.write('</div>' + '\n');	//commandpanel
			response.write('</div>' + '\n');	//commandcontainer
			
			//chat panel
			response.write('<div class="container" id="chatcontainer">' + '\n');
			response.write('<button type="button" id="hidechatbtn" onclick="showChatView(false); return false;">Hide Chat</button>' + '\n');
			response.write('<button type="button" id="showchatbtn" onclick="showChatView(true); return false;">Show Chat</button>' + '\n');
			response.write('<div class="panel" id="chatpanel">' + '\n');
			response.write('<h3 class="panelheader">Message</h3>' + '\n');
			response.write('You are in Room: <select  name="roomlist" id="roomlist" onchange="roomListChanged(); return false;">' + '\n');
			response.write('<option value="selectroom">--- Please select ---</option>' + '\n');
			response.write('<option value="Room 1">Room 1 (5 users)</option>' + '\n');
			response.write('<option value="Room 2">Room 2 (1 user)</option>' + '\n');
			response.write('<option value="Room 3">Room 3 (0 users)</option>' + '\n');
			response.write('</select><br />' + '\n');
			
			response.write('<textarea id="cmessageinput" class="textareainput" rows="4" cols="10">Enter message to send here.</textarea><br />' + '\n');
			//response.write('<input type="text" size="60" maxlength="15" value="user1" id="cmessageinput"> ' + '\n');
			response.write('<button type="button" id="sendroombtn" onclick="sendRoom(); return false;">Send to Room</button><br />' + '\n');
			
			response.write('<select name="userlist" id="userlist" onchange="userListChanged(); return false;">' + '\n');
			response.write('<option value="selectuser">--- Please select ---</option>' + '\n');
			response.write('<option value="User 1">User 1 (Guest)</option>' + '\n');
			response.write('<option value="User 2">User 2 (Admin)</option>' + '\n');
			response.write('<option value="User 3">User 3 (Guest)</option>' + '\n');
			response.write('</select> ' + '\n');
			response.write('<button type="button" id="sendprivatebtn" onclick="sendPrivate(); return false;">Send to User</button> ' + '\n');
			response.write('<button type="button" id="broadcastbtn" onclick="sendBroadcast(); return false;">Send to All</button>' + '\n');
			response.write('</div>' + '\n');	//chatpanel
			response.write('</div>' + '\n');	//chatcontainer
			
			//video stream output panel
			response.write('<div class="container" id="outputcontainer">' + '\n');
			response.write('<button type="button" id="hidevideobtn" onclick="showVideoView(false); return false;">Hide Video</button>' + '\n');
			response.write('<button type="button" id="showvideobtn" onclick="showVideoView(true); return false;">Show Video</button>' + '\n');
			response.write('<div class="panel" id="outputpanel">' + '\n');
			response.write('<h3 class="panelheader">Video</h3>' + '\n');
			response.write('<div class="streampanel" id="videopanel"></div>' + '\n');	
			response.write('</div>' + '\n');
			response.write('</div>' + '\n');	//outputcontainer
			
			response.write('</div>' + '\n');	//maincontainer
			
			//boilerplate footer here
			response.write('<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>' + '\n');
			/**response.write('<script>window.jQuery || document.write(\'<script src="/scripts/vendor/jquery-1.10.2.min.js"><\/script>\')</script>' + '\n'); */
			response.write('<script src="/scripts/plugins.js"></script>' + '\n');
			
			//other post display optimised javascript goes here

/**			
			response.write(' <!-- Google Analytics -->' + '\n');
			response.write('<script>' + '\n');
			response.write(' (function(b,o,i,l,e,r){b.GoogleAnalyticsObject=l;b[l]||(b[l]=' + '\n');
			response.write(' function(){(b[l].q=b[l].q||[]).push(arguments)});b[l].l=+new Date;' + '\n');
			response.write('  e=o.createElement(i);r=o.getElementsByTagName(i)[0];' + '\n');
			response.write(' e.src="//www.google-analytics.com/analytics.js";' + '\n');
			response.write(' r.parentNode.insertBefore(e,r)}(window,document,"script","ga"));' + '\n');
			response.write(' ga("create","UA-33265871-1");ga("send","pageview");' + '\n');
			response.write('</script>' + '\n');
*/			
			
			response.write('</body>' + '\n');
			
			//close static page output
			response.end();	//'Not waiting for callbacks - closing connection.' + '\n'		
		};
	};	
	
	

/**
	app.use(express.static(__dirname + '/public'));		//path to externally readable public folder
	app.use(express.static(__dirname + '/uploads'));	//path to externally writeable uploads folder
	
	app.get('/', function(request, response){
		
	});
*/	


	/**
	 *  Initialise the Express http server and create the routes and register
	 *  the handlers.
	 */
	self.initialiseServer = function() {
		console.log('> initialiseServer() called.');
		
		self.createRoutes();
		//self.app = express.createServer();	//deprecated version
		self.app = express();
		//self.app.use(express.cookieParser());  
		//self.app.use(express.bodyParser());  
		//self.app.use(express.methodOverride());  
		//self.app.use(express.session({ secret: "secret" }));  	
		
		//define static directories for javascript, html, and images to be served to the client
		//self.app.use(express.static(process.env.OPENSHIFT_REPO_DIR + '/public' ));
		self.app.use(express.static(__dirname + '/public'));
		self.app.use(express.static(__dirname + '/uploads'));
		
		//add handlers for the app (from the routes).
		for (var r in self.routes) {
			self.app.get(r, self.routes[r]);
		}
	};
		
		
	/**
	 *  Initialise the IO.Sockets server after the Express server.
	 */
	self.initialiseIOServer = function() {
		console.log('> initialiseIOServer() called.');
		
		//setup user & room tracking
		self.socketList = [];
		
		var http = require('http');
		self.server = http.createServer(self.app);
		self.io = require('socket.io').listen(self.server);
		
		self.io.sockets.on('connection', function(socket) {
			console.log('> new connection called.');
			
			//setup user initial attributes
			socket.resetServerFields = function() {
				//reset chatroom attributes for this socket username if they exist
				
				//#
				
				//now reset all local fields
				socket.username = DEF_USERNAME;
				socket.firstName = DEF_FNAME;
				socket.lastName = DEF_LNAME;
				socket.email = DEF_EMAIL;
				socket.access = DEF_ACCESS;
				socket.room = DEF_ROOM;
				socket.lastOn = DEF_LASTON;
				socket.authenticated = false;	//used to block user until logged in and not blocked
				
			};
			socket.resetServerFields();
			
			self.addNewConnection(socket);
			
			//send message to all sockets except this one
			socket.broadcast.emit('public message',
				{ from:'_server', to:'_all', content:'a new user has connected', echo:'none' });
			
			//log user in both socket and ChatRoom
			socket.processLogin = function(email, password) {
				//1st check password is valid
				if (email!==undefined && email!==null && email.length>MIN_EMAIL_LEN &&
					password!==undefined && password!==null && password.length>MIN_PASS_LEN) {
					//clean local variables 1st
					socket.resetServerFields();
					
					//authenticate user login and update access and setup saved attributes
					var userIsValid = self.chatRoom.isAbleToLogin(email, password);
					if (userIsValid=="yes") {
						var loginResult = self.chatRoom.login(email, password);
						console.log('\n> processLogin result = ' + loginResult);
						if (loginResult!==undefined && loginResult!==null && loginResult.charAt(0)!='!') {
							socket.authenticated = true;
							var userDetails = self.chatRoom.getUserDetails(email);
							if (userDetails!==undefined && userDetails!==null) {
								socket.email = userDetails.email;
								socket.username = userDetails.username;
								socket.firstName = userDetails.firstname;
								socket.lastName = userDetails.lastname;
								socket.access = userDetails.access;
								socket.lastOn = userDetails.laston;
								socket.room = userDetails.lastroom;
								
								//move user to room
								var changeResult = self.chatRoom.changeRoom(socket.email, socket.room);
								console.log("_ changeroom() to " + socket.room + " result=" + changeResult);
								
								//add user to active list
								var activeResult = self.chatRoom.setUserActive(socket.email);
								console.log("_ setUserActive() to " + activeResult);
								
								//now send updated status to client ui
								var commandObj = { command:'login', username:socket.username,
									firstname:socket.firstName, lastname:socket.lastName, email:socket.email,
									access:socket.access, room:socket.room, laston:socket.lastOn };
								socket.emit('private message',
									{ from:'_server', to:socket.username,	command:commandObj,
									content:'Your login was accepted.'});
								socket.refreshClientUI(true, true, true, true);
							} else {
								socket.processLogout('!Your login was rejected due to invalid database.');
								socket.refreshClientUI(false, true, true, false);
							}
						} else {
							socket.authenticated = false;
							socket.processLogout('!Your login was rejected due to invalid authentication');
							socket.refreshClientUI(false, true, true, false);
						}
					} else {
						socket.processLogout('!Your login was rejected: ' + userIsValid + '.');
						socket.refreshClientUI(false, true, true, false);
					}
				} else {
					socket.processLogout('!Your login was rejected due to invalid password.');
					socket.refreshClientUI(false, true, true, false);
				}
				console.log("_ processLogin() called - total active users = " +
								self.chatRoom.getNumActiveUsers());
			};
			
			//log user out of both socket and ChatRoom
			socket.processLogout = function(message) {
				//user requests to log
				var commandObj = { command:'logout' };
				if (message===undefined || message===null) {
					message = 'You have been logged out.';	
				}
				socket.emit('private message',
					{ from:'_server', to:socket.username,	command:commandObj, content:message});
				self.chatRoom.logout(socket.email);
				socket.resetServerFields();
				socket.refreshClientUI(false, true, true, false);
				console.log("_ processLogout() called - total active users = " +
								self.chatRoom.getNumActiveUsers());
				self.broadcastUpdate();
			};
			
			//send UI refresh to client
			socket.refreshClientUI = function(server, profile, chat, status) {
				var serverDetails = self.chatRoom.getDetails();
				var userDetails = self.chatRoom.getUserDetails(socket.email);
				if (serverDetails!==undefined && serverDetails!==null &&
					 userDetails!==undefined && userDetails!==null) {
					var commandObj = { command:'refresh' };
					if (server) {
						commandObj.title = serverDetails.title;
						commandObj.description = serverDetails.description;
					}
					if (profile) {
						commandObj.email = userDetails.email;
						commandObj.username = userDetails.username;
						commandObj.firstname = userDetails.firstname;
						commandObj.lastname = userDetails.lastname;
					}
					if (chat) {
						commandObj.userlist = serverDetails.userlist;
						commandObj.roomlist = serverDetails.roomlist;
						commandObj.currentroom = userDetails.lastroom;
					}
					if (status) {
						commandObj.loggedin = userDetails.loggedin;
					}
					socket.emit('private message',
						{ from:'_server', to:socket.username,	command:commandObj, content:null});
				}
			};
			
			
			//process messages received by server from a socket client
			socket.on('command', function(message) {
				if (message!==undefined && message!==null) {
					console.log('> I received a command: %s by %s to %s saying %s',
						message.command, message.from, message.to, message.content);
					if (message.echo!==undefined && message.echo=='all') {
						switch (message.command) {
							case 'login' :
								if (message.content!==undefined && message.content!==null &&
									message.content.email!==undefined && message.content.email!==null &&
									message.content.password!==undefined && message.content.password!==null) {
									socket.processLogin(message.content.email, message.content.password);
								} else {
									socket.processLogout(null);
								}
								break;
							case 'logout' :
								socket.processLogout(null);
								break;
							case 'changepassword' : 
								
								//# user attempts to update password
								
								break;
							case 'resetpassword' : 
								if (message.content!==undefined && message.content!==null &&
									message.content.email!==undefined && message.content.email!==null) {
									//check if email is a valid user in database first
									var details = self.chatRoom.getUserDetails(message.content.email);
									if (details!==undefined && details!==null) {
										
										//# need to auto generate a secure random password here and update
										var newPassword = "testtest2";
										
										self.sendEmail(message.content.email, newPassword);
										socket.emit('private message',
											{ from:'_server', to:socket.username, content:'Your password has been reset and sent to your email address.' });
									} else {
										socket.emit('private message',
											{ from:'_server', to:socket.username, content:'!No valid User found.' });
									}
								} else {
									console.log(">!invalid resetpassword details.");	
								}
								break;
							case 'deleteaccount' : 
								
								//# user attempts to delete account attached to email
								
								break;
							case 'changedetails' : 
								
								//# user attempts to update profile details
								
								break;
							case 'changeroom' :
								//user changes the room they are in
								//get email locally, and extract room name from message content
								var result = self.chatRoom.changeRoom(socket.email, message.content);
								var roomList = self.chatRoom.getRoomList();
								var room = self.chatRoom.getCurrentRoom(socket.email);
								var commandObj = null;
								if (roomList!==undefined && roomList!==null) {
									var roomDetails = roomList.getDetails();
									if (roomDetails!==undefined && roomDetails!==null) {
										if (room!==undefined && room!==null) {
											commandObj = { command:'updateroom', room:room,
																roomlist:roomDetails };
											socket.room = room;
										} else {
										
											//# set valid default room (if required)
												
										}
										if (result && commandObj!==null) {
											socket.emit('private message',
												{ from:'_server', to:socket.username, command:commandObj,
												  content:'Room has been changed to ' + room });	
										} else {
											socket.emit('private message',
												{ from:'_server', to:socket.username, command:commandObj,
												  content:'!Room could not be changed to ' + room });	
										}
									} else {
										socket.emit('private message',
											{ from:'_server', to:socket.username,
											  content:'!No valid Room details found.' });
									}
								} else {
									socket.emit('private message',
										{ from:'_server', to:socket.username,
										  content:'!No valid Room structure found.' });
								}
								break;
							case 'list' :
								//output a general system and user activity list
								var commandObj = { command:'outputlist',
														 details:self.chatRoom.getDetails()
														};
								socket.emit('private message',
									{ from:'_server', to:socket.username, command:commandObj,
									  content:null });
								break;
							case 'load' :
								//load system from external xml file
								self.readXML("test.xml");
								break;
							case 'save' :
								//save system to external xml file
								self.saveXML("test.xml", self.chatRoom.toXML());
								break;
							default :
								//all other commands are caught here
								break;
						}
					}
				} else {
					console.log('> !empty message received');	
				}
			});
			
			//process private message between clients
			socket.on('private message', function(message) {
				if (message!==undefined && message!==null) {
					console.log('> I received a private message by %s to %s saying %s',
									message.from, message.to, message.content);		
					if (message.echo!==undefined && message.echo=='all') {
						//echo back message to sender
						socket.emit('private message',
							{ from:message.from, to:message.from, content:message.content });	
					}
					
					//now send message to new client if they exist
					var toSocket = self.getConnectionByName(message.to);
					if (toSocket!==undefined && toSocket!==null) {
						toSocket.emit('private message',
							{ from:message.from, to:message.to, content:message.content });	
						console.log('> message sent from: ' + message.from +
									   ' to: ' + message.to + ' content: ' + message.content);	
					} else {
						//no matching user	
						console.log('> !no matching user found online: ' + message.to);	
					}
				} else {
					console.log('> !private empty message received');	
				}
			});
			
			//process broadcast message to all online
			socket.on('public message', function(message) {
				if (message!==undefined && message!==null) {
					console.log('> I received a public message by %s to %s saying %s',
									message.from, message.to, message.content);
					if (message.echo!==undefined && message.echo=='all') {
						//broadcast to all including originating client
						self.io.sockets.emit('public message',
							{ from:message.from, to:'_all', content:message.content });
					} else {
						//broadcast to all except originating client
						socket.broadcast.emit('public message',
							{ from:message.from, to:'_all', content:message.content });
					}
				} else {
					console.log('> !public empty message received.');	
				}
			});
			
			//process message to all in room
			socket.on('room message', function(message) {
				if (message!==undefined && message!==null) {
					console.log('> I received a room message by %s to %s saying %s',
						message.from, message.to, message.content);					
					if (message.to!==undefined && message.to!==null) {
						//broadcast to all in room including originating client
						//room broadcast not working in this version of io.sockets
						//self.io.sockets.in(message.to).emit('room message', { from:message.from, to:'_room', content:message.content });
						
						self.broadcastRoom(message.to, message.from, message.content);
						
					} else {
						console.log('> !broadcast room is not valid.');	
					}
				} else {
					console.log('> !room empty message received.');	
				}
			});
			
			//handle disconnect by client
			socket.on('disconnect', function() {
				console.log('> socket disconnect called.');
				self.io.sockets.emit('user disconnected');
				self.getConnection(socket, true);
				self.broadcastUpdate();
			});
			
			//process client room change request
			socket.on('select room', function(room) {
				//check to see if user is currently in a room and leave
				if (socket.currentRoom) {
        			socket.leave(socket.room);
				}
				socket.currentRoom = room;
				socket.join(room);
				self.broadcastUpdate();
			});
		});
		
	};
	
	/**
	 * manage connections to socket.io
	 */
	self.addNewConnection = function(socket) {
		var output = false;
		if (self.socketList!==undefined && socket!==undefined && socket!==null) {
			if (self.getConnection(socket, false)===null) {
				self.socketList.push(socket);
				output = true;
			}
		}
		self.broadcastUpdate();
		return output;
	};
	self.getConnection = function(socket, remove) {
		var output = null;
		if (self.socketList!==undefined && socket!==undefined && socket!==null) {
			var matchIndex = -1;
			for (var i=0; i<self.socketList.length && output===null; i++) {
				if (self.socketList[i]==socket) {
					output = self.socketList[i];
				}
			}
			if (output!==null && remove && matchIndex>=0) {
				self.socketList.splice(i, 1);	
			}
		}
		return output;
	};
	self.getConnectionByName = function(username) {
		var output = null;
		if (self.socketList!==undefined && username!==undefined && username!==null) {
			for (var i=0; i<self.socketList.length && output===null; i++) {
				if (self.socketList[i].username==username) {
					output = self.socketList[i];
				}
			}
		}
		return output;
	};
	self.getAllConnectionDetails = function() {
		var output = "";
		
		//#
		
		return output;	
	};
	self.broadcastUpdate = function() {
		var commandObj = { command:'refresh' };
		var serverDetails = self.chatRoom.getDetails();
		if (serverDetails!==undefined && serverDetails!==null) {
			commandObj.userlist = serverDetails.userlist;
			commandObj.roomlist = serverDetails.roomlist;
			
			//socket.emit('private message', { from:'_server', to:socket.username,	command:commandObj, content:null});
			self.io.sockets.emit('private message',
				{ from:'_server', to:'_all', command:commandObj, content:null });	
		}
	};
	self.broadcastRoom = function(room, from, message) {
		console.log("> broadcastRoom() called from: " + from +
						" to room: " + room + " message: " + message);
		if (self.socketList!==undefined && from!==undefined && from!==null &&
			 message!==undefined && message!==null) {
			for (var i=0; i<self.socketList.length; i++) {
				if (self.socketList[i].room==room) {
					console.log("> broadcastRoom() sending to: [" + i + "]" +
									self.socketList[i].username);
					self.socketList[i].emit('room message',
						{ from:from, to:self.socketList[i].username, content:message });
				} else {
					console.log("> broadcastRoom() not sending to: [" + i + "]" +
									self.socketList[i].username + " in " + self.socketList[i].room );
				}
			}
		}
	};
	
	
	/**
	 * email system
	 */
	self.nodemailer = require('nodemailer');

	// create reusable transporter object using SMTP transport
	// NB! No need to recreate the transporter object. You can use
	// the same transporter object for all e-mails
	self.transporter = self.nodemailer.createTransport({
		service: SMTP_SERVICE,
		auth: {
			user: SMTP_EMAIL,
			pass: SMTP_PASSWORD
		}
	});
	 
	//send a new password to email address via email system
	self.sendEmail = function(email, message) {
		console.log("> sendEmail() called with email: " + email);
		if (email!==undefined && email!==null) {
			// setup e-mail data with unicode symbols
			var mailOptions = {
				 from: SMTP_USERNAME + ' <' + SMTP_EMAIL + '>', // sender address
				 to: email, // list of receivers
				 subject: 'Password reset from ' + SMTP_USERNAME, // Subject line
				 text: 'Your new password is: ' + message, // plaintext body
				 html: '<p>Your new password is: <b>' + message + '</b></p>' // html body
			};
			
			// send mail with defined transport object
			self.transporter.sendMail(mailOptions, function(error, info) {
				if (error) {
					console.log('> sendEmail() error: ' + error);
				} else {
					console.log('> sendEmail() message sent: ' + info.response);
				}
			});
		}
	};
	
	
	/**
	 * XML local file reading functionality
	 */
	self.readXML = function(filename) {
		console.log('_ readXML() called with ' + filename);
		if (filename!==undefined && filename!==null) {
			var parser = new xml2js.Parser();
			
			//setup file load complete listener
			parser.addListener('end', function(result) {
				console.dir(result);
				//console.dir(util.inspect(result, false, null))
				console.log('_ XML read complete.');
				
				//test result of xml parse
				console.log('_ chatroom=' + result.chatroom);
				console.log('_ chatroom.$=' + result.chatroom.$);
				console.log('_ chatroom.$.version=' + result.chatroom.$.version);
				
				//create new chatroom from parse result
				if (result.chatroom!==undefined && result.chatroom!==null) {
					var altChatRoom = new ChatRoomModule.ChatRoom(null, null); 
					var result = altChatRoom.fromXML(result.chatroom);
					if (result && altChatRoom!==undefined && altChatRoom!==null) {
					
						console.log("_ new chatroom = " + altChatRoom.toString());
						
						//# now set current chatroom as this new one
						
					}
				}
			});
			
			//now initiate file load
			//self.app.use(express.static(__dirname + '/public'));
			var fileurl = __dirname + '/' + XML_PATH + filename;
			fs.readFile(fileurl, function(err, data) {
				if (err) {
					return console.log("_ !fs.readFile() error: " + err);
				}
				if (data!==undefined && data!==null) {
					parser.parseString(data);
				} else {
					console.log('_ !XML no data found at ' + fileurl);
				}
			});
		}
	};
	
	
	/**
	 * XML local file saving functionality
	 */
	self.saveXML = function(filename, xmlText) {
		console.log('_ saveXML() called with ' + filename);
		if (filename!==undefined && filename!==null && 
			xmlText!==undefined && xmlText!==null) {
			var fileurl = __dirname + '/' + XML_PATH + filename;
			xmlText = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlText;
			fs.writeFile(fileurl, xmlText, function (err) {
				if (err) {
					return console.log("_ !fs.writeFile() error: " + err);
				}
				console.log('_ XML written to ' + fileurl);
			});		
		}
	};
	
	
	/**
	 *  Initialises the main application.
	 */
	self.initialise = function() {
		console.log('> initialise() called...'); 
		self.setupVariables();
		self.populateCache();
		self.setupTerminationHandlers();
		
		//check the import status of the supporting library files
		console.log('> testing status of loaded library files...'); 
		
		//load ChatRoom.js
		self.chatRoom = null;
		console.log('> ChatRoomModule is loading: %s', (typeof ChatRoomModule)); // => 'function'
		if (ChatRoomModule===undefined || ChatRoomModule===null) {
			console.log('> !ChatRoomModule could not load.');
		} else {
			console.log('> ChatRoomModule has loaded.');
			if (typeof ChatRoomModule==='object') {
				if (ChatRoomModule.ChatRoom!==undefined && ChatRoomModule.ChatRoom!==null) {
					//setup default ChatRoom system
					self.chatRoom = new ChatRoomModule.ChatRoom(null, null);	
					console.log('> ChatRoom loaded version=%s', self.chatRoom.VERSION);
				} else {
					console.log('> !ChatRoom loaded is not a function');
				}
			} else {
				console.log('> !ChatRoom loaded is not an object');
			}
		}
		
		//load RoomList.js
		self.roomList = null;
		if (RoomListModule!==undefined && RoomListModule!==null &&
			typeof RoomListModule==='object' &&
			RoomListModule.RoomList!==undefined && RoomListModule.RoomList!==null) {
				self.roomList = new RoomListModule.RoomList();
		}
		if (self.roomList===null) {
			console.log('> !RoomList is invalid.');
		} else {
			console.log('> RoomList loaded version=%s', self.roomList.VERSION);
		}
		
		//load UserList.js
		self.userList = null;
		if (UserListModule!==undefined && UserListModule!==null &&
			typeof UserListModule==='object' &&
			UserListModule.UserList!==undefined && UserListModule.UserList!==null) {
				self.userList = new UserListModule.UserList();
		}
		if (self.userList===null) {
			console.log('> !UserList is invalid.');
		} else {
			console.log('> UserList loaded version=%s', self.userList.VERSION);
		}
		
		//load Room.js
		self.room = null;
		if (RoomModule!==undefined && RoomModule!==null &&
			typeof RoomModule==='object' &&
			RoomModule.Room!==undefined && RoomModule.Room!==null) {
				self.room = new RoomModule.Room();
		}
		if (self.room===null) {
			console.log('> !Room is invalid.');
		} else {
			console.log('> Room loaded version=%s', self.room.VERSION);
		}
		
		//load User.js
		self.user = null;
		if (UserModule!==undefined && UserModule!==null &&
			typeof UserModule==='object' &&
			UserModule.User!==undefined && UserModule.User!==null) {
				self.user = new UserModule.User();
		}
		if (self.user===null) {
			console.log('> !User is invalid.');
		} else {
			console.log('> User loaded version=%s', self.user.VERSION);
		}
		
		//initialise ChatRoom
		console.log('> initialising userList dependencies: %s', self.userList.initialise(UserModule));
		console.log('> initialising roomList dependencies: %s', self.roomList.initialise(RoomModule));
		console.log('> initialising chatRoom dependencies: %s',
			self.chatRoom.initialise(RoomListModule, RoomModule, UserListModule, UserModule));

		//test the utility functions
		fileModule.writeFileAsync("test.txt", "This is an example of text");
		
		//Create the express server and routes.
		self.initialiseServer();
		
		//Now setup IO.Sockets last
		self.initialiseIOServer();
	};
	
	
	/**
	 *  Start the server (starts up the main application).
	 */
	self.start = function() {
		console.log('> start() called...'); 
		//  Start the app on the specific interface (and port).
		/**
		self.app.listen(self.port, self.ipaddress, function() {
			console.log(' > %s: Node server started on %s:%d ...',
				Date(Date.now() ), self.ipaddress, self.port);
		});
		*/
		
		//start the IO.Sockets/Express merged version instead of the default express server
		self.server.listen(port, ipaddress, function() {
			 console.log('> Express and IO.Socket servers listening on port %s', port);
		});	
	};
};


/**
 *  main():  Main code.
 */
var mapp = new MainApp();
mapp.initialise();
mapp.start();
